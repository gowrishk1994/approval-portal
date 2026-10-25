export class HttpError extends Error {
  constructor(statusCode, message, options = {}) {
    super(message, options);
    this.name = 'HttpError';
    this.statusCode = statusCode;
  }
}

export function assertCondition(condition, statusCode, message) {
  if (!condition) throw new HttpError(statusCode, message);
}
