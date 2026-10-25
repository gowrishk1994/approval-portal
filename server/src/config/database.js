import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DataTypes, Sequelize } from 'sequelize';
import { dataDirectory, uploadDirectory } from './paths.js';

const configDirectory = path.dirname(fileURLToPath(import.meta.url));
const sqlitePath = process.env.DATABASE_PATH
  ? path.resolve(process.env.DATABASE_PATH)
  : path.resolve(configDirectory, '../../data/approval-portal.sqlite');

const commonOptions = {
  logging: process.env.NODE_ENV === 'development' && process.env.SQL_LOGGING === 'true'
    ? (sql) => console.debug(`[sequelize] ${sql}`)
    : false,
  benchmark: process.env.SQL_LOGGING === 'true',
  pool: process.env.DATABASE_URL
    ? { max: 10, min: 0, acquire: 30_000, idle: 10_000 }
    : { max: 1, min: 0, acquire: 30_000, idle: 1_000 },
};

export const sequelize = process.env.DATABASE_URL
  ? new Sequelize(process.env.DATABASE_URL, {
    ...commonOptions,
    dialect: 'postgres',
    dialectOptions: process.env.DATABASE_SSL === 'true'
      ? { ssl: { require: true, rejectUnauthorized: process.env.DATABASE_SSL_REJECT_UNAUTHORIZED !== 'false' } }
      : {},
  })
  : new Sequelize({
    ...commonOptions,
    dialect: 'sqlite',
    storage: sqlitePath,
  });

async function ensureUserAccountColumns() {
  const queryInterface = sequelize.getQueryInterface();
  const columns = await queryInterface.describeTable('users');
  const additions = [
    ['workspace_visible', { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true }],
    ['username', { type: DataTypes.STRING(64), allowNull: true }],
    ['password_hash', { type: DataTypes.STRING(256), allowNull: true }],
  ];
  for (const [column, definition] of additions) {
    if (!columns[column]) await queryInterface.addColumn('users', column, definition);
  }

  const indexes = await queryInterface.showIndex('users');
  if (!indexes.some((index) => index.name === 'users_username_unique')) {
    await queryInterface.addIndex('users', ['username'], {
      name: 'users_username_unique',
      unique: true,
    });
  }
}

let initialized = false;

export async function initializeDatabase() {
  await Promise.all([
    fs.mkdir(dataDirectory, { recursive: true }),
    fs.mkdir(uploadDirectory, { recursive: true }),
  ]);
  if (!initialized) {
    await sequelize.authenticate();
    await sequelize.sync();
    await ensureUserAccountColumns();
    initialized = true;
  }
}

export async function closeDatabase() {
  if (!initialized) return;
  await sequelize.close();
  initialized = false;
}
