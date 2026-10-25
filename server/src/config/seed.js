import { createRequire } from 'node:module';
import { sequelize } from './database.js';
import { User } from '../models/index.js';
import { hashPassword } from '../helpers/password.js';

const require = createRequire(import.meta.url);
const initialDataSeeder = require('../../seeders/20261024000100-seed-initial-users-and-projects.js');

export async function seedInitialData() {
  await initialDataSeeder.up(sequelize.getQueryInterface());

  const accounts = [
    {
      id: 'requester',
      username: process.env.REQUESTER_USERNAME?.trim(),
      password: process.env.REQUESTER_PASSWORD,
    },
    {
      id: 'user-a',
      username: process.env.APPROVER_USERNAME?.trim(),
      password: process.env.APPROVER_PASSWORD,
      email: process.env.APPROVER_EMAIL?.trim(),
    },
  ];

  for (const account of accounts) {
    if (!account.username || !account.password || (account.id === 'user-a' && !account.email)) {
      throw new Error('Set REQUESTER_USERNAME, REQUESTER_PASSWORD, APPROVER_USERNAME, APPROVER_PASSWORD, and APPROVER_EMAIL before starting the API.');
    }

    const user = await User.findByPk(account.id);
    if (!user) throw new Error(`The seeded account ${account.id} was not found.`);

    const updates = { username: account.username };
    if (!user.passwordHash) updates.passwordHash = await hashPassword(account.password);
    if (account.email) updates.email = account.email;
    await user.update(updates);
  }
}
