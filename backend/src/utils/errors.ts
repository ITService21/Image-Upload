export class AppError extends Error {
  public statusCode: number;
  public isOperational: boolean;

  constructor(message: string, statusCode: number, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(message, 404);
  }
}

export class ValidationError extends AppError {
  constructor(message = 'Validation failed') {
    super(message, 400);
  }
}

export class FileTypeError extends AppError {
  constructor(message = 'Unsupported file type') {
    super(message, 415);
  }
}

export class FileSizeError extends AppError {
  constructor(message = 'File size exceeds limit') {
    super(message, 413);
  }
}
