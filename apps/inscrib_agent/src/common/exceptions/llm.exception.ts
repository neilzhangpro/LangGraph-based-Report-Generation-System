import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * Exception thrown when LLM API calls fail
 */
export class LLMException extends HttpException {
  constructor(
    message: string,
    public readonly originalError?: Error,
  ) {
    super(
      {
        statusCode: HttpStatus.SERVICE_UNAVAILABLE,
        message,
        error: 'LLM Service Error',
      },
      HttpStatus.SERVICE_UNAVAILABLE,
    );
  }
}

/**
 * Exception thrown when LLM response is invalid
 */
export class InvalidLLMResponseException extends HttpException {
  constructor(message: string = 'Invalid response from LLM service') {
    super(
      {
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message,
        error: 'Invalid LLM Response',
      },
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }
}

