/** Stable error codes returned by the API. The web app maps them to translated messages. */
export const ERROR_CODES = [
  'VALIDATION_ERROR',
  'UNAUTHENTICATED',
  'FORBIDDEN',
  'NOT_FOUND',
  'CONFLICT',
  'STALE_REVISION',
  'PAYMENT_REQUIRED',
  'RSVP_CLOSED',
  'EXPIRED',
  'EMAIL_TAKEN',
  'INVALID_CREDENTIALS',
  'INVALID_OR_EXPIRED_TOKEN',
  'RATE_LIMITED',
  'INTERNAL_ERROR',
] as const;
export type ErrorCode = (typeof ERROR_CODES)[number];

export interface ApiErrorBody {
  error: {
    code: ErrorCode;
    message: string;
    /** Field-level issues: path ("email") -> message key ("validation.email"). */
    fields?: Record<string, string>;
  };
}
