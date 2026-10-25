import multer from 'multer';
import { HttpError } from '../helpers/http-error.js';

export function errorHandler(error, _request, response, next) {
  if (response.headersSent) return next(error);

  let statusCode = error instanceof HttpError ? error.statusCode : 500;
  let message = error instanceof HttpError ? error.message : 'Internal server error.';

  if (error?.type === 'entity.parse.failed') {
    statusCode = 400;
    message = 'Request body must be valid JSON.';
  } else if (error?.name === 'SequelizeValidationError') {
    statusCode = 400;
    message = error.errors?.[0]?.message || 'The submitted data is invalid.';
  } else if (error?.name === 'SequelizeUniqueConstraintError' || error?.name === 'SequelizeForeignKeyConstraintError') {
    statusCode = 409;
    message = 'The requested change conflicts with existing records.';
  } else if (error?.type === 'entity.too.large') {
    statusCode = 413;
    message = 'Request body is too large.';
  }

  if (error instanceof multer.MulterError) {
    statusCode = error.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
    message = error.code === 'LIMIT_FILE_SIZE'
      ? 'Each document must be 10 MB or smaller.'
      : 'The document upload could not be processed.';
  }

  if (statusCode >= 500) {
    console.error('[api-error]', {
      name: error.name,
      message: error.message,
      stack: process.env.NODE_ENV === 'production' ? undefined : error.stack,
    });
  }

  response.status(statusCode).json({ error: message });
}
