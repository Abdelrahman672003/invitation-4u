import { z } from 'zod';
import { LOCALES, PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from '../constants.js';

// Messages are translation keys; the web app renders them in the active language.

export const emailSchema = z
  .string({ required_error: 'validation.required' })
  .trim()
  .min(1, 'validation.required')
  .max(254, 'validation.tooLong')
  .email('validation.email');

export const passwordSchema = z
  .string({ required_error: 'validation.required' })
  .min(PASSWORD_MIN_LENGTH, 'validation.passwordTooShort')
  .max(PASSWORD_MAX_LENGTH, 'validation.tooLong');

export const nameSchema = z
  .string({ required_error: 'validation.required' })
  .trim()
  .min(2, 'validation.nameTooShort')
  .max(120, 'validation.tooLong');

export const localeSchema = z.enum(LOCALES);

export const registerSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  password: passwordSchema,
  locale: localeSchema.optional(),
});
export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: emailSchema,
  // Do not apply length rules on login; just require a value.
  password: z
    .string({ required_error: 'validation.required' })
    .min(1, 'validation.required')
    .max(PASSWORD_MAX_LENGTH),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const forgotPasswordSchema = z.object({ email: emailSchema });
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z.object({
  token: z.string().min(20).max(200),
  password: passwordSchema,
});
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

export const changePasswordSchema = z.object({
  currentPassword: z
    .string({ required_error: 'validation.required' })
    .min(1, 'validation.required')
    .max(PASSWORD_MAX_LENGTH, 'validation.tooLong'),
  newPassword: passwordSchema,
});
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

export const updateProfileSchema = z
  .object({
    name: nameSchema.optional(),
    locale: localeSchema.optional(),
  })
  .refine((value) => Object.keys(value).length > 0, 'validation.required');
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
