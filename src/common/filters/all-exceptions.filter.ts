// ============================================================================
// Global Exception Filter
// ============================================================================
// Handles all exceptions and formats them consistently
// ============================================================================

import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
    timestamp: string;
    path: string;
    requestId?: string;
  };
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const { status, body } = this.buildErrorResponse(exception, request);

    // Log the error
    this.logger.error(
      `${request.method} ${request.url} - ${status}`,
      exception instanceof Error ? exception.stack : String(exception),
    );

    response.status(status).json(body);
  }

  private buildErrorResponse(
    exception: unknown,
    request: Request,
  ): { status: number; body: ApiErrorResponse } {
    // Handle NestJS HTTP exceptions
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      return {
        status,
        body: {
          success: false,
          error: {
            code: this.getErrorCode(status),
            message: this.extractMessage(exceptionResponse),
            details: this.extractDetails(exceptionResponse),
            timestamp: new Date().toISOString(),
            path: request.url,
          },
        },
      };
    }

    // Handle unknown errors
    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      body: {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message:
            process.env.NODE_ENV === 'production'
              ? 'An unexpected error occurred'
              : exception instanceof Error
                ? exception.message
                : 'Unknown error',
          timestamp: new Date().toISOString(),
          path: request.url,
        },
      },
    };
  }

  private getErrorCode(status: number): string {
    const codes: Record<number, string> = {
      400: 'BAD_REQUEST',
      401: 'UNAUTHORIZED',
      402: 'PAYMENT_REQUIRED',
      403: 'FORBIDDEN',
      404: 'NOT_FOUND',
      409: 'CONFLICT',
      422: 'VALIDATION_ERROR',
      429: 'RATE_LIMIT_EXCEEDED',
      500: 'INTERNAL_ERROR',
      502: 'BAD_GATEWAY',
      503: 'SERVICE_UNAVAILABLE',
    };
    return codes[status] || 'ERROR';
  }

  private extractMessage(response: string | object): string {
    if (typeof response === 'string') {
      return response;
    }
    if (typeof response === 'object' && response !== null) {
      const obj = response as Record<string, unknown>;
      if (typeof obj.message === 'string') {
        return obj.message;
      }
      if (Array.isArray(obj.message)) {
        return obj.message[0] || 'Validation failed';
      }
    }
    return 'An error occurred';
  }

  private extractDetails(response: string | object): unknown {
    if (typeof response === 'object' && response !== null) {
      const obj = response as Record<string, unknown>;
      if (Array.isArray(obj.message) && obj.message.length > 1) {
        return { validationErrors: obj.message };
      }
      if (obj.details) {
        return obj.details;
      }
    }
    return undefined;
  }
}
