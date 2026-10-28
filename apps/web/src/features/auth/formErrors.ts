import type { FieldValues, Path, UseFormSetError } from 'react-hook-form';
import { ApiError } from '@/lib/api';

/**
 * Copies server field errors onto the form and returns a translation key for a
 * form-level message (or null when every problem was attached to a field).
 */
export function applyServerErrors<T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>,
): string | null {
  if (!(error instanceof ApiError)) return 'errors.generic';
  if (error.code === 'NETWORK_ERROR') return 'errors.network';

  const fields = Object.entries(error.fields ?? {});
  for (const [name, message] of fields) {
    setError(name as Path<T>, { type: 'server', message });
  }
  if (fields.length > 0) return null;

  const known = [
    'INVALID_CREDENTIALS',
    'RATE_LIMITED',
    'INVALID_OR_EXPIRED_TOKEN',
    'EMAIL_TAKEN',
    'VALIDATION_ERROR',
  ];
  return known.includes(error.code) ? `errors.${error.code}` : 'errors.generic';
}
