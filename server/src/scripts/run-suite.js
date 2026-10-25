import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { serverRoot } from '../config/paths.js';

const testDatabasePath = path.join(serverRoot, 'data', 'approval-portal-test.sqlite');
const testUploadDirectory = path.join(serverRoot, 'uploads-test');
const testEnvironment = {
  ...process.env,
  NODE_ENV: 'test',
  DATABASE_URL: '',
  DATABASE_PATH: testDatabasePath,
  UPLOAD_DIRECTORY: testUploadDirectory,
  REQUESTER_USERNAME: 'requester',
  REQUESTER_PASSWORD: 'Requester-test-password',
  REQUESTER_NAME: 'Test Requester',
  REQUESTER_EMAIL: 'requester@example.com',
  APPROVER_USERNAME: 'user-a',
  APPROVER_PASSWORD: 'Approver-test-password',
  APPROVER_NAME: 'Test Approver',
  APPROVER_EMAIL: 'user.a@example.com',
  SESSION_SECRET: 'test-only-session-secret',
};

fs.mkdirSync(path.dirname(testDatabasePath), { recursive: true });
fs.mkdirSync(testUploadDirectory, { recursive: true });
for (const suffix of ['', '-wal', '-shm']) {
  fs.rmSync(`${testDatabasePath}${suffix}`, { force: true });
}
for (const entry of fs.readdirSync(testUploadDirectory)) {
  fs.rmSync(path.join(testUploadDirectory, entry), { recursive: true, force: true });
}

const result = spawnSync(process.execPath, ['--test'], {
  cwd: serverRoot,
  stdio: 'inherit',
  env: testEnvironment,
});

if (result.error) {
  console.error('Failed to start the test runner.', result.error);
  process.exitCode = 1;
} else {
  process.exitCode = result.status ?? 1;
}
