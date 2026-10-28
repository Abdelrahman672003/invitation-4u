import { API_BASE_PATH } from '@invite/shared';

/**
 * OpenAPI description of the HTTP API, served at `GET /api/v1/openapi.json`.
 *
 * Operations are listed in one table so adding an endpoint means adding one line here.
 * `test/openapi.test.ts` checks every listed operation is really routed.
 */

type Access = 'public' | 'user' | 'admin' | 'signature';
type Method = 'get' | 'post' | 'patch' | 'delete';

interface Operation {
  method: Method;
  path: string;
  tag: string;
  summary: string;
  access: Access;
  /** Name of the request body in `components.schemas`, when the endpoint takes JSON. */
  body?: string;
  query?: string[];
  /** Status code of the success response (default 200). */
  success?: 200 | 201 | 204;
  note?: string;
}

const operations: Operation[] = [
  // Auth and profile
  {
    method: 'post',
    path: '/auth/register',
    tag: 'Auth',
    summary: 'Create a customer account and start a session',
    access: 'public',
    body: 'RegisterInput',
    success: 201,
  },
  {
    method: 'post',
    path: '/auth/login',
    tag: 'Auth',
    summary: 'Sign in and start a session',
    access: 'public',
    body: 'LoginInput',
  },
  {
    method: 'post',
    path: '/auth/logout',
    tag: 'Auth',
    summary: 'End the current session',
    access: 'public',
    success: 204,
  },
  {
    method: 'post',
    path: '/auth/forgot-password',
    tag: 'Auth',
    summary: 'Request a password reset email (always answers the same)',
    access: 'public',
    body: 'ForgotPasswordInput',
    success: 204,
  },
  {
    method: 'post',
    path: '/auth/reset-password',
    tag: 'Auth',
    summary: 'Set a new password with a reset token',
    access: 'public',
    body: 'ResetPasswordInput',
    success: 204,
  },
  {
    method: 'get',
    path: '/me',
    tag: 'Auth',
    summary: 'The signed-in user, or 401',
    access: 'user',
  },
  {
    method: 'patch',
    path: '/me',
    tag: 'Auth',
    summary: 'Update name or language preference',
    access: 'user',
    body: 'UpdateProfileInput',
  },

  // Catalog
  {
    method: 'get',
    path: '/categories',
    tag: 'Catalog',
    summary: 'Enabled event categories with their subtypes',
    access: 'public',
  },
  {
    method: 'get',
    path: '/templates',
    tag: 'Catalog',
    summary: 'Active templates',
    access: 'public',
    query: ['category'],
  },
  {
    method: 'get',
    path: '/templates/{slug}',
    tag: 'Catalog',
    summary: 'One active template',
    access: 'public',
  },
  {
    method: 'get',
    path: '/packages',
    tag: 'Catalog',
    summary: 'Active packages with prices',
    access: 'public',
  },

  // Invitations
  {
    method: 'get',
    path: '/invitations',
    tag: 'Invitations',
    summary: "The caller's invitations",
    access: 'user',
  },
  {
    method: 'post',
    path: '/invitations',
    tag: 'Invitations',
    summary: 'Create a draft from a template',
    access: 'user',
    body: 'CreateInvitationInput',
    success: 201,
  },
  {
    method: 'get',
    path: '/invitations/{id}',
    tag: 'Invitations',
    summary: 'One invitation (owner only)',
    access: 'user',
  },
  {
    method: 'patch',
    path: '/invitations/{id}',
    tag: 'Invitations',
    summary: 'Autosave; `baseRevision` must match or 409 STALE_REVISION',
    access: 'user',
    body: 'UpdateInvitationInput',
  },
  {
    method: 'post',
    path: '/invitations/{id}/publish',
    tag: 'Invitations',
    summary:
      'Publish: paid for good, otherwise the 48-hour free plan (402 PAYMENT_REQUIRED when not allowed)',
    access: 'user',
  },
  {
    method: 'post',
    path: '/invitations/{id}/unpublish',
    tag: 'Invitations',
    summary: 'Take the public page offline; the link is kept',
    access: 'user',
  },
  {
    method: 'post',
    path: '/invitations/{id}/archive',
    tag: 'Invitations',
    summary: 'Archive an invitation',
    access: 'user',
  },
  {
    method: 'delete',
    path: '/invitations/{id}',
    tag: 'Invitations',
    summary: 'Permanently delete an unpaid invitation with its guests and replies (409 once paid)',
    access: 'user',
    success: 204,
  },
  {
    method: 'post',
    path: '/invitations/{id}/restore',
    tag: 'Invitations',
    summary: 'Restore an archived invitation',
    access: 'user',
  },

  // Guests and responses
  {
    method: 'get',
    path: '/invitations/{id}/guests',
    tag: 'Guests',
    summary: 'Guest list with summary (owner only)',
    access: 'user',
    query: ['q', 'status', 'group'],
  },
  {
    method: 'post',
    path: '/invitations/{id}/guests',
    tag: 'Guests',
    summary: 'Add a guest',
    access: 'user',
    body: 'GuestInput',
    success: 201,
  },
  {
    method: 'patch',
    path: '/invitations/{id}/guests/{guestId}',
    tag: 'Guests',
    summary: 'Edit a guest',
    access: 'user',
    body: 'GuestInput',
  },
  {
    method: 'delete',
    path: '/invitations/{id}/guests/{guestId}',
    tag: 'Guests',
    summary: 'Remove a guest',
    access: 'user',
    success: 204,
  },
  {
    method: 'get',
    path: '/invitations/{id}/rsvps',
    tag: 'Guests',
    summary: 'RSVP responses (owner only)',
    access: 'user',
  },

  // Public invitation
  {
    method: 'get',
    path: '/public/invitations/{slug}',
    tag: 'Public',
    summary:
      'Published invitation content; 410 EXPIRED when the free plan ended; never guest, owner or payment data',
    access: 'public',
  },
  {
    method: 'post',
    path: '/public/invitations/{slug}/rsvp',
    tag: 'Public',
    summary: 'Submit or replace an RSVP (one per normalized name)',
    access: 'public',
    body: 'PublicRsvpInput',
    success: 201,
  },
  {
    method: 'post',
    path: '/public/invitations/{slug}/view',
    tag: 'Public',
    summary: 'Count one page open; stores a number only',
    access: 'public',
    success: 204,
  },

  // Payments
  {
    method: 'post',
    path: '/payments/checkout',
    tag: 'Payments',
    summary: 'Start a checkout; the price comes from the database package',
    access: 'user',
    body: 'CheckoutInput',
    success: 201,
  },
  {
    method: 'get',
    path: '/payments',
    tag: 'Payments',
    summary: "The caller's payments",
    access: 'user',
  },
  {
    method: 'get',
    path: '/payments/{id}',
    tag: 'Payments',
    summary: 'One payment; the return page trusts only this status',
    access: 'user',
  },
  {
    method: 'get',
    path: '/payments/test/{reference}',
    tag: 'Payments',
    summary: 'Simulated gateway page data',
    access: 'user',
    note: 'Development only; answers 404 in production.',
  },
  {
    method: 'post',
    path: '/payments/test/{reference}/complete',
    tag: 'Payments',
    summary: 'Simulated gateway outcome, delivered as a signed webhook',
    access: 'user',
    body: 'TestOutcomeInput',
    note: 'Development only; answers 404 in production.',
  },
  {
    method: 'post',
    path: '/webhooks/payments/{provider}',
    tag: 'Payments',
    summary:
      'Provider webhook; raw body verified with `x-signature` (HMAC-SHA256), processed once per event id',
    access: 'signature',
  },

  // Admin
  {
    method: 'get',
    path: '/admin/overview',
    tag: 'Admin',
    summary: 'Counts, revenue and failed webhook events',
    access: 'admin',
  },
  {
    method: 'get',
    path: '/admin/users',
    tag: 'Admin',
    summary: 'Users',
    access: 'admin',
    query: ['q'],
  },
  {
    method: 'patch',
    path: '/admin/users/{id}',
    tag: 'Admin',
    summary: "Change a user's role (not your own)",
    access: 'admin',
    body: 'AdminUserInput',
  },
  {
    method: 'get',
    path: '/admin/invitations',
    tag: 'Admin',
    summary: 'All invitations',
    access: 'admin',
    query: ['q', 'status'],
  },
  {
    method: 'post',
    path: '/admin/invitations/{id}/unpublish',
    tag: 'Admin',
    summary: 'Moderation: take an invitation offline',
    access: 'admin',
  },
  {
    method: 'post',
    path: '/admin/invitations/{id}/archive',
    tag: 'Admin',
    summary: 'Moderation: archive an invitation',
    access: 'admin',
  },
  {
    method: 'get',
    path: '/admin/templates',
    tag: 'Admin',
    summary: 'All templates, any status',
    access: 'admin',
  },
  {
    method: 'patch',
    path: '/admin/templates/{id}',
    tag: 'Admin',
    summary: 'Edit status, premium flag, order or names',
    access: 'admin',
  },
  {
    method: 'get',
    path: '/admin/categories',
    tag: 'Admin',
    summary: 'Categories and subtypes',
    access: 'admin',
  },
  {
    method: 'patch',
    path: '/admin/categories/{id}',
    tag: 'Admin',
    summary: 'Enable or disable a category',
    access: 'admin',
  },
  {
    method: 'patch',
    path: '/admin/subtypes/{id}',
    tag: 'Admin',
    summary: 'Enable or disable a subtype',
    access: 'admin',
  },
  {
    method: 'get',
    path: '/admin/packages',
    tag: 'Admin',
    summary: 'All packages',
    access: 'admin',
  },
  {
    method: 'patch',
    path: '/admin/packages/{id}',
    tag: 'Admin',
    summary: 'Edit price or limits (applies to new checkouts only)',
    access: 'admin',
  },
  {
    method: 'get',
    path: '/admin/payments',
    tag: 'Admin',
    summary: 'All payments',
    access: 'admin',
  },
  {
    method: 'post',
    path: '/admin/payments/{id}/reconcile',
    tag: 'Admin',
    summary: 'Re-check a payment with the provider',
    access: 'admin',
  },
  {
    method: 'post',
    path: '/admin/payments/{id}/refund',
    tag: 'Admin',
    summary: 'Record a refund and unpublish; money is returned at the gateway',
    access: 'admin',
  },
  {
    method: 'get',
    path: '/admin/audit',
    tag: 'Admin',
    summary: 'Audit log of admin actions',
    access: 'admin',
  },
];

const accessText: Record<Access, string> = {
  public: 'No sign-in needed.',
  user: 'Requires a signed-in session.',
  admin: 'Requires a signed-in ADMIN.',
  signature: 'Authenticated by the provider signature header, not a session.',
};

const objectBody = (name: string) => ({
  required: true,
  content: { 'application/json': { schema: { $ref: `#/components/schemas/${name}` } } },
});

function buildPaths() {
  const paths: Record<string, Record<string, unknown>> = {};
  for (const op of operations) {
    const success = op.success ?? 200;
    const params = [...op.path.matchAll(/\{(\w+)\}/g)].map((match) => ({
      name: match[1],
      in: 'path',
      required: true,
      schema: { type: 'string' },
    }));
    const query = (op.query ?? []).map((name) => ({
      name,
      in: 'query',
      required: false,
      schema: { type: 'string' },
    }));
    const secured = op.access === 'user' || op.access === 'admin';
    const entry = (paths[op.path] ??= {});
    entry[op.method] = {
      tags: [op.tag],
      summary: op.summary,
      description: [accessText[op.access], op.note].filter(Boolean).join(' '),
      ...(params.length + query.length > 0 && { parameters: [...params, ...query] }),
      ...(op.body && { requestBody: objectBody(op.body) }),
      ...(secured && { security: [{ sessionCookie: [] }] }),
      responses: {
        [success]:
          success === 204
            ? { description: 'Done, no content' }
            : { $ref: '#/components/responses/Data' },
        default: { $ref: '#/components/responses/Error' },
      },
    };
  }
  return paths;
}

const strings = (...names: string[]) =>
  Object.fromEntries(names.map((name) => [name, { type: 'string' }]));

const inputSchemas = {
  RegisterInput: {
    type: 'object',
    required: ['name', 'email', 'password'],
    properties: strings('name', 'email', 'password'),
  },
  LoginInput: {
    type: 'object',
    required: ['email', 'password'],
    properties: strings('email', 'password'),
  },
  ForgotPasswordInput: { type: 'object', required: ['email'], properties: strings('email') },
  ResetPasswordInput: {
    type: 'object',
    required: ['token', 'password'],
    properties: strings('token', 'password'),
  },
  UpdateProfileInput: {
    type: 'object',
    properties: { name: { type: 'string' }, locale: { enum: ['ar', 'en'] } },
  },
  CreateInvitationInput: {
    type: 'object',
    required: ['templateSlug', 'title'],
    properties: {
      ...strings('templateSlug', 'title', 'subtypeSlug'),
      locale: { enum: ['ar', 'en'] },
    },
  },
  UpdateInvitationInput: {
    type: 'object',
    required: ['baseRevision'],
    description: 'Strict: unknown keys are rejected.',
    properties: {
      baseRevision: { type: 'integer', minimum: 0 },
      title: { type: 'string' },
      eventDate: { type: ['string', 'null'], format: 'date' },
      rsvpDeadline: { type: ['string', 'null'], format: 'date' },
      content: {
        type: 'object',
        description: 'Partial invitation content; see InvitationContent in @invite/shared.',
      },
      design: { type: 'object', description: 'Per-invitation palette/font overrides.' },
    },
  },
  GuestInput: {
    type: 'object',
    required: ['name'],
    properties: {
      ...strings('name', 'phone', 'groupName', 'notes'),
      maxAttendees: { type: 'integer', minimum: 1 },
    },
  },
  PublicRsvpInput: {
    type: 'object',
    required: ['name', 'response'],
    properties: {
      name: { type: 'string' },
      response: { enum: ['ACCEPTED', 'DECLINED'] },
      attendeesCount: { type: 'integer', minimum: 1 },
      message: { type: 'string' },
      website: { type: 'string', description: 'Honeypot; must stay empty.' },
    },
  },
  CheckoutInput: {
    type: 'object',
    required: ['invitationId', 'packageCode'],
    properties: strings('invitationId', 'packageCode'),
  },
  TestOutcomeInput: {
    type: 'object',
    required: ['outcome'],
    properties: { outcome: { enum: ['SUCCEEDED', 'FAILED', 'CANCELLED'] } },
  },
  AdminUserInput: {
    type: 'object',
    required: ['role'],
    properties: { role: { enum: ['CUSTOMER', 'ADMIN'] } },
  },
};

export function buildOpenApiDocument() {
  return {
    openapi: '3.1.0',
    info: {
      title: 'Daawa API',
      version: '1.0.0',
      description:
        'JSON API for the digital invitation platform. Authentication is an HttpOnly session cookie; ' +
        'state-changing requests must come from an allowed origin. Errors use one shape with a machine-readable code.',
    },
    servers: [{ url: API_BASE_PATH }],
    tags: ['Auth', 'Catalog', 'Invitations', 'Guests', 'Public', 'Payments', 'Admin'].map(
      (name) => ({ name }),
    ),
    paths: buildPaths(),
    components: {
      securitySchemes: { sessionCookie: { type: 'apiKey', in: 'cookie', name: 'inv_session' } },
      responses: {
        Data: {
          description: 'Success: the payload is under `data`.',
          content: { 'application/json': { schema: { type: 'object', properties: { data: {} } } } },
        },
        Error: {
          description:
            'Failure: 400 VALIDATION_ERROR, 401, 403, 404, 409 (STALE_REVISION, RSVP_CLOSED), 402 PAYMENT_REQUIRED, 429.',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } },
        },
      },
      schemas: {
        ApiError: {
          type: 'object',
          required: ['error'],
          properties: {
            error: {
              type: 'object',
              required: ['code', 'message'],
              properties: {
                code: { type: 'string' },
                message: { type: 'string' },
                fields: {
                  type: 'object',
                  additionalProperties: { type: 'string' },
                  description: 'Field name to i18n key.',
                },
              },
            },
          },
        },
        ...inputSchemas,
      },
    },
  };
}

/** Exposed for the drift test. */
export const documentedOperations = operations;
