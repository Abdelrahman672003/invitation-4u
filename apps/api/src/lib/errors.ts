import type { ErrorRequestHandler } from 'express';
import { Prisma } from '@prisma/client';
import { ZodError, type ZodTypeAny, type z } from 'zod';
import type { ApiErrorBody, ErrorCode } from '@invite/shared';
import { logger } from './logger.js';

export class AppError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: ErrorCode,
    message: string,
    public readonly fields?: Record<string, string>,
  ) {
    super(message);
  }
}

export const notFound = (message = 'Resource not found') => new AppError(404, 'NOT_FOUND', message);
export const forbidden = (message = 'You do not have access to this resource') =>
  new AppError(403, 'FORBIDDEN', message);
export const unauthenticated = (message = 'Authentication required') =>
  new AppError(401, 'UNAUTHENTICATED', message);

function zodFields(error: ZodError): Record<string, string> {
  const fields: Record<string, string> = {};
  for (const issue of error.issues) {
    const path = issue.path.join('.') || '_';
    fields[path] ??= issue.message;
  }
  return fields;
}

/** Parses untrusted input, throwing a 400 VALIDATION_ERROR with per-field message keys. */
export function parseInput<S extends ZodTypeAny>(schema: S, input: unknown): z.infer<S> {
  const result = schema.safeParse(input);
  if (!result.success) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Invalid request', zodFields(result.error));
  }
  return result.data;
}

function send(res: Parameters<ErrorRequestHandler>[2], status: number, body: ApiErrorBody) {
  res.status(status).json(body);
}

export const errorHandler: ErrorRequestHandler = (error, req, res, _next) => {
  if (error instanceof AppError) {
    return send(res, error.status, {
      error: { code: error.code, message: error.message, fields: error.fields },
    });
  }
  if (error instanceof ZodError) {
    return send(res, 400, {
      error: { code: 'VALIDATION_ERROR', message: 'Invalid request', fields: zodFields(error) },
    });
  }
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
    return send(res, 409, { error: { code: 'CONFLICT', message: 'Resource already exists' } });
  }
  // Malformed JSON bodies from express.json()
  if (
    typeof error === 'object' &&
    error &&
    'type' in error &&
    error.type === 'entity.parse.failed'
  ) {
    return send(res, 400, { error: { code: 'VALIDATION_ERROR', message: 'Malformed JSON body' } });
  }
  if (typeof error === 'object' && error && 'type' in error && error.type === 'entity.too.large') {
    return send(res, 413, {
      error: { code: 'VALIDATION_ERROR', message: 'Request body too large' },
    });
  }

  logger.error('Unhandled error', {
    method: req.method,
    path: req.path,
    error:
      error instanceof Error
        ? { name: error.name, message: error.message, stack: error.stack }
        : error,
  });
  // Never leak internals to clients.
  return send(res, 500, { error: { code: 'INTERNAL_ERROR', message: 'Something went wrong' } });
};
