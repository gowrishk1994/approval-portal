import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { initializeDatabase, closeDatabase } from '../src/config/database.js';
import { seedInitialData } from '../src/config/seed.js';
import { uploadDirectory } from '../src/config/paths.js';
import { AuditEvent, Document, Project, User, Workflow } from '../src/models/index.js';
import { createNotificationService } from '../src/services/notification.js';

let requesterHeader;
let approverHeader;

async function resetDatabase() {
  await initializeDatabase();
  await seedInitialData();
  await AuditEvent.destroy({ where: {} });
  await Document.destroy({ where: {} });
  await Workflow.destroy({ where: {} });
  await fs.mkdir(uploadDirectory, { recursive: true });
  for (const entry of await fs.readdir(uploadDirectory)) {
    if (entry !== '.gitkeep') {
      await fs.rm(path.join(uploadDirectory, entry), { recursive: true, force: true });
    }
  }
  try {
    await fs.access(path.join(uploadDirectory, '.gitkeep'));
  } catch {
    await fs.writeFile(path.join(uploadDirectory, '.gitkeep'), '');
  }
}

after(async () => {
  await closeDatabase();
});

before(async () => {
  await initializeDatabase();
  await seedInitialData();
  const app = createApp();
  const requesterLogin = await request(app)
    .post('/api/auth/login')
    .send({ username: process.env.REQUESTER_USERNAME, password: process.env.REQUESTER_PASSWORD })
    .expect(200);
  const approverLogin = await request(app)
    .post('/api/auth/login')
    .send({ username: process.env.APPROVER_USERNAME, password: process.env.APPROVER_PASSWORD })
    .expect(200);
  requesterHeader = { Cookie: requesterLogin.headers['set-cookie'][0].split(';')[0] };
  approverHeader = { Cookie: approverLogin.headers['set-cookie'][0].split(';')[0] };
});

test('login validates credentials and protects the workspace APIs', async () => {
  await resetDatabase();
  const app = createApp();
  await request(app).post('/api/auth/login').send({ username: 'requester', password: 'wrong-password' }).expect(401);
  await request(app).get('/api/projects').expect(401);
  await request(app).get('/api/projects').set('x-user-id', 'user-a').expect(401);
  const loggedIn = await request(app)
    .post('/api/auth/login')
    .send({ username: process.env.REQUESTER_USERNAME, password: process.env.REQUESTER_PASSWORD })
    .expect(200);
  assert.equal(loggedIn.body.id, 'requester');
  assert.equal(loggedIn.body.name, process.env.REQUESTER_NAME);
  assert.match(loggedIn.headers['set-cookie'][0], /HttpOnly/);
  assert.match((await User.findByPk('requester')).passwordHash, /^scrypt\$/);
  const agent = request.agent(app);
  await agent
    .post('/api/auth/login')
    .send({ username: process.env.REQUESTER_USERNAME, password: process.env.REQUESTER_PASSWORD })
    .expect(200);
  await agent.get('/api/auth/session').expect(200);
  await agent.get('/api/projects').expect(200);
  await agent.get('/api/users').expect(404);
  await agent.post('/api/auth/logout').expect(204);
  await agent.get('/api/projects').expect(401);
  await request(app).get('/api/health').expect(401);
  await request(app).get('/api/not-a-required-route').expect(401);
});

test('creating a second workflow preserves prior workflow and audit records', async () => {
  await resetDatabase();
  const app = createApp();
  const first = await request(app)
    .post('/api/workflows')
    .set(requesterHeader)
    .send({ projectId: 'project-1001' })
    .expect(201);
  const second = await request(app)
    .post('/api/workflows')
    .set(requesterHeader)
    .send({ projectId: 'project-1002' })
    .expect(201);

  assert.notEqual(first.body.id, second.body.id);
  const list = await request(app).get('/api/workflows').set(requesterHeader).expect(200);
  assert.equal(list.body.length, 2);
  assert.equal(list.body.filter((workflow) => workflow.status === 'draft').length, 2);
  assert.equal(await AuditEvent.count(), 2);
});

test('approval cannot be requested without documents', async () => {
  await resetDatabase();
  const app = createApp();
  const created = await request(app)
    .post('/api/workflows')
    .set(requesterHeader)
    .send({ projectId: 'project-1001' })
    .expect(201);
  assert.deepEqual(created.body.approver, {
    id: 'user-a',
    name: process.env.APPROVER_NAME,
    email: process.env.APPROVER_EMAIL,
  });
  await request(app)
    .post(`/api/workflows/${created.body.id}/request-approval`)
    .set(requesterHeader)
    .expect(400);
});

test('approval and signature follow required state transitions and notify the configured approver', async () => {
  await resetDatabase();
  const notifications = [];
  const app = createApp({ notify: async (notification) => { notifications.push(notification); } });
  const created = await request(app)
    .post('/api/workflows')
    .set(requesterHeader)
    .send({ projectId: 'project-1001' })
    .expect(201);
  const workflowId = created.body.id;
  const uploadResponse = await request(app)
    .post(`/api/workflows/${workflowId}/documents`)
    .set(requesterHeader)
    .attach('documents', Buffer.from('%PDF-1.4 test'), { filename: 'bid.pdf', contentType: 'application/pdf' })
    .expect(201);
  assert.equal('storageName' in uploadResponse.body.documents[0], false);

  const submitted = await request(app).post(`/api/workflows/${workflowId}/request-approval`).set(requesterHeader).expect(200);
  assert.equal(submitted.body.status, 'pending_approval');
  assert.equal('notificationDelivered' in submitted.body, false);
  assert.deepEqual(notifications, []);
  await request(app)
    .post(`/api/workflows/${workflowId}/approve`)
    .set(approverHeader)
    .expect(200)
    .expect((response) => assert.equal(response.body.status, 'approved'));
  assert.deepEqual(notifications.map((item) => item.type), ['signature-request']);
  assert.ok(notifications.every((item) => item.to === process.env.APPROVER_EMAIL));

  await request(app)
    .post(`/api/workflows/${workflowId}/sign`)
    .set(approverHeader)
    .send({ signatureName: process.env.APPROVER_NAME, consent: true })
    .expect(200)
    .expect((response) => assert.equal(response.body.status, 'completed'));
  const events = await AuditEvent.findAll({ where: { workflowId } });
  assert.ok(events.some((event) => event.action === 'document.signed'));
});

test('requester cannot approve their own workflow', async () => {
  await resetDatabase();
  const app = createApp();
  const created = await request(app)
    .post('/api/workflows')
    .set(requesterHeader)
    .send({ projectId: 'project-1001' })
    .expect(201);
  await request(app)
    .post(`/api/workflows/${created.body.id}/approve`)
    .set(requesterHeader)
    .expect(403);
});

test('an approver cannot upload another user’s documents or leave orphaned files', async () => {
  await resetDatabase();
  const app = createApp();
  const created = await request(app)
    .post('/api/workflows')
    .set(requesterHeader)
    .send({ projectId: 'project-1001' })
    .expect(201);
  await request(app)
    .post(`/api/workflows/${created.body.id}/documents`)
    .set(approverHeader)
    .attach('documents', Buffer.from('%PDF-1.4 demo'), { filename: 'bid.pdf', contentType: 'application/pdf' })
    .expect(403);
  const uploadFiles = await fs.readdir(uploadDirectory);
  assert.deepEqual(uploadFiles.filter((file) => file !== '.gitkeep'), []);
});

test('reject endpoint is not available', async () => {
  const app = createApp();
  await request(app)
    .post('/api/workflows/workflow-id/reject')
    .set(approverHeader)
    .send({ reason: 'No longer supported.' })
    .expect(404);
});

test('document upload requires matching allowed extension and MIME type', async () => {
  await resetDatabase();
  const app = createApp();
  const created = await request(app)
    .post('/api/workflows')
    .set(requesterHeader)
    .send({ projectId: 'project-1001' })
    .expect(201);
  await request(app)
    .post(`/api/workflows/${created.body.id}/documents`)
    .set(requesterHeader)
    .attach('documents', Buffer.from('not a PDF'), { filename: 'file.txt', contentType: 'application/pdf' })
    .expect(400);
  const uploadFiles = await fs.readdir(uploadDirectory);
  assert.deepEqual(uploadFiles.filter((file) => file !== '.gitkeep'), []);
});

test('signature notification failure does not undo the committed approval', async () => {
  await resetDatabase();
  const app = createApp({ notify: async () => { throw new Error('SMTP unavailable'); } });
  const created = await request(app)
    .post('/api/workflows')
    .set(requesterHeader)
    .send({ projectId: 'project-1003' })
    .expect(201);
  await request(app)
    .post(`/api/workflows/${created.body.id}/documents`)
    .set(requesterHeader)
    .attach('documents', Buffer.from('%PDF-1.4 demo'), { filename: 'analytics.pdf', contentType: 'application/pdf' })
    .expect(201);
  await request(app)
    .post(`/api/workflows/${created.body.id}/request-approval`)
    .set(requesterHeader)
    .expect(200);
  await request(app)
    .post(`/api/workflows/${created.body.id}/approve`)
    .set(approverHeader)
    .expect(200)
    .expect((response) => {
      assert.equal(response.body.status, 'approved');
      assert.equal(response.body.notificationDelivered, false);
    });
});

test('signature email links directly to the workflow signing page', async () => {
  let message;
  const service = createNotificationService({
    env: {
      SMTP_HOST: 'smtp.example.com',
      SMTP_PORT: '587',
      SMTP_USER: 'sender@example.com',
      SMTP_PASS: 'test-password',
      SMTP_FROM: 'sender@example.com',
      APP_URL: 'https://portal.example.com',
    },
    createTransport: () => ({
      sendMail: async (mail) => { message = mail; },
    }),
  });

  const result = await service.send({
    type: 'signature-request',
    to: 'approver@example.com',
    workflowId: 'workflow-123',
    projectName: 'Cloud Migration',
  });

  assert.deepEqual(result, { delivered: true, mode: 'smtp' });
  assert.equal(message.to, 'approver@example.com');
  assert.equal(message.subject, 'Please sign: Cloud Migration');
  assert.match(message.text, /https:\/\/portal\.example\.com\/\?workflow=workflow-123&action=sign/);
  assert.match(message.html, /https:\/\/portal\.example\.com\/\?workflow=workflow-123&amp;action=sign/);
});
