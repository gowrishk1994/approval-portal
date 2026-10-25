import { createRequire } from 'node:module';
import { sequelize } from './database.js';
import { User } from '../models/index.js';
import { hashPassword } from '../helpers/password.js';

const require = createRequire(import.meta.url);
const initialDataSeeder = require('../../seeders/20261024000100-seed-initial-users-and-projects.js');

export async function seedInitialData() {
  const accounts = [
    {
      id: 'requester',
      role: 'requester',
      username: process.env.REQUESTER_USERNAME?.trim(),
      password: process.env.REQUESTER_PASSWORD,
      name: process.env.REQUESTER_NAME?.trim(),
      email: process.env.REQUESTER_EMAIL?.trim(),
    },
    {
      id: 'user-a',
      role: 'approver',
      username: process.env.APPROVER_USERNAME?.trim(),
      password: process.env.APPROVER_PASSWORD,
      name: process.env.APPROVER_NAME?.trim(),
      email: process.env.APPROVER_EMAIL?.trim(),
    },
  ];

  const requiredEnvironmentVariables = [
    'REQUESTER_USERNAME',
    'REQUESTER_PASSWORD',
    'REQUESTER_NAME',
    'REQUESTER_EMAIL',
    'APPROVER_USERNAME',
    'APPROVER_PASSWORD',
    'APPROVER_NAME',
    'APPROVER_EMAIL',
  ];

  const missingEnvironmentVariables = requiredEnvironmentVariables.filter((name) => !process.env[name]?.trim());
  if (missingEnvironmentVariables.length) {
    throw new Error(
      `Missing required account settings in server/.env: ${missingEnvironmentVariables.join(', ')}. `
      + 'Set these values using server/.env.example, then restart the API.',
    );
  }

  await initialDataSeeder.up(
    sequelize.getQueryInterface(),
    accounts.map(({ password: _password, ...account }) => account),
  );

  for (const account of accounts) {
    const user = await User.findByPk(account.id);
    if (!user) throw new Error(`The seeded account ${account.id} was not found.`);

    const updates = { username: account.username, name: account.name, email: account.email };
    if (!user.passwordHash) updates.passwordHash = await hashPassword(account.password);
    await user.update(updates);
  }
}
