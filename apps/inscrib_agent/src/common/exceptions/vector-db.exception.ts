import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * Exception thrown when vector database operations fail
 */
export class VectorDBException extends HttpException {
  constructor(
    message: string,
    public readonly originalError?: Error,
  ) {
    super(
      {
        statusCode: HttpStatus.SERVICE_UNAVAILABLE,
        message,
        error: 'Vector Database Error',
      },
      HttpStatus.SERVICE_UNAVAILABLE,
    );
  }
}

/**
 * Exception thrown when vector database connection fails
 */
export class VectorDBConnectionException extends HttpException {
  constructor(
    message: string = 'Failed to connect to vector database',
    public readonly originalError?: Error,
  ) {
    super(
      {
        statusCode: HttpStatus.SERVICE_UNAVAILABLE,
        message,
        error: 'Vector Database Connection Error',
      },
      HttpStatus.SERVICE_UNAVAILABLE,
    );
  }
}

/**
 * Exception thrown when document search fails
 */
export class DocumentSearchException extends HttpException {
  constructor(
    message: string = 'Failed to search documents',
    public readonly originalError?: Error,
  ) {
    super(
      {
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message,
        error: 'Document Search Error',
      },
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }
}

