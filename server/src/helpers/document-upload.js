import crypto from 'node:crypto';
import path from 'node:path';
import multer from 'multer';
import { uploadDirectory } from '../config/paths.js';
import { HttpError } from './http-error.js';

export const MAX_DOCUMENT_SIZE_BYTES = 10 * 1024 * 1024;
export const MAX_DOCUMENTS_PER_REQUEST = 5;

const allowedFileTypes = new Map([
  ['.pdf', 'application/pdf'],
  ['.png', 'image/png'],
  ['.jpg', 'image/jpeg'],
  ['.jpeg', 'image/jpeg'],
  ['.doc', 'application/msword'],
  ['.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
]);

export const documentUpload = multer({
  storage: multer.diskStorage({
    destination: (_request, _file, callback) => callback(null, uploadDirectory),
    filename: (_request, file, callback) => {
      const extension = path.extname(file.originalname).toLowerCase();
      callback(null, `${crypto.randomUUID()}${extension}`);
    },
  }),
  limits: {
    fileSize: MAX_DOCUMENT_SIZE_BYTES,
    files: MAX_DOCUMENTS_PER_REQUEST,
  },
  fileFilter: (_request, file, callback) => {
    const extension = path.extname(file.originalname).toLowerCase();
    if (allowedFileTypes.get(extension) !== file.mimetype) {
      callback(new HttpError(400, 'Unsupported file type. Upload PDF, PNG, JPG, DOC, or DOCX.'));
      return;
    }
    callback(null, true);
  },
});
