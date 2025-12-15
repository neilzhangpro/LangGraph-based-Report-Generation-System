import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * Exception thrown when file processing fails
 */
export class FileProcessingException extends HttpException {
  constructor(
    message: string,
    public readonly originalError?: Error,
  ) {
    super(
      {
        statusCode: HttpStatus.BAD_REQUEST,
        message,
        error: 'File Processing Error',
      },
      HttpStatus.BAD_REQUEST,
    );
  }
}

/**
 * Exception thrown when file type is not supported
 */
export class UnsupportedFileTypeException extends HttpException {
  constructor(fileType: string) {
    super(
      {
        statusCode: HttpStatus.BAD_REQUEST,
        message: `Unsupported file type: ${fileType}. Supported types: PDF, DOCX, TXT, JSON`,
        error: 'Unsupported File Type',
      },
      HttpStatus.BAD_REQUEST,
    );
  }
}

