import fs from 'node:fs/promises';
import path from 'node:path';
import { uploadDirectory } from '../config/paths.js';

export function getStoredFilePath(storageName) {
  // storageName is generated server-side; resolve and assert it remains inside the upload directory.
  const resolvedPath = path.resolve(uploadDirectory, storageName);
  if (!resolvedPath.startsWith(`${path.resolve(uploadDirectory)}${path.sep}`)) {
    throw new Error('Invalid document storage path.');
  }
  return resolvedPath;
}

export async function removeUploadedFiles(files = []) {
  await Promise.all(files.map((file) => fs.rm(file.path, { force: true }).catch(() => undefined)));
}

export function sanitizeOriginalFileName(fileName) {
  const name = String(fileName ?? '')
    .replaceAll('\\', '/')
    .split('/')
    .pop()
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .trim()
    .slice(0, 255);
  return name || 'document';
}
