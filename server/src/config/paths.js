import path from 'node:path';
import { fileURLToPath } from 'node:url';

const configDirectory = path.dirname(fileURLToPath(import.meta.url));
export const serverRoot = path.resolve(configDirectory, '../..');

export const databasePath = process.env.DATABASE_PATH
  ? path.resolve(process.env.DATABASE_PATH)
  : path.join(serverRoot, 'data', 'approval-portal.sqlite');

export const dataDirectory = path.dirname(databasePath);
export const uploadDirectory = process.env.UPLOAD_DIRECTORY
  ? path.resolve(process.env.UPLOAD_DIRECTORY)
  : path.join(serverRoot, 'uploads');
