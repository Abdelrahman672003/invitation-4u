import { useState, type ReactNode } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { MailCheck, ShieldCheck } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useSearchParams } from 'react-router';
import {
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
  type ForgotPasswordInput,
  type LoginInput,
  type RegisterInput,
} from '@invite/shared';
import { Button, ButtonLink } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Card';
import { Field, Input, PasswordInput } from '@/components/ui/Field';
import { currentLocale } from '@/i18n';
import { useForgotPassword, useLogin, useRegister, useResetPassword } from './api';
import { applyServerErrors } from './formErrors';
import { safeNextPath } from './guards';

function AuthHeading({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="mb-8 animate-fade-up">
      <h1 className="text-3xl font-semibold sm:text-[2.1rem]">{title}</h1>
      <p className="mt-2 text-ink-soft">{subtitle}</p>
    </div>
  );
}

function AuthSwitch({ prompt, to, label }: { prompt?: string; to: string; label: string }) {
  return (
    <p className="mt-8 text-center text-sm text-ink-soft">
      {prompt && <>{prompt} </>}
      <Link to={to} className="font-medium text-brand-700 underline-offset-4 hover:underline">
        {label}
      </Link>
    </p>
  );
}

function Confirmation({
  icon,
  title,
  body,
  action,
}: {
  icon: ReactNode;
  title: string;
  body: string;
  action: ReactNode;
}) {
  return (
    <div className="animate-fade-up text-center" role="status">
      <div className="mx-auto mb-6 grid size-16 place-items-center rounded-full bg-success-50 text-success-600">
        {icon}
      </div>
      <h1 className="text-2xl font-semibold">{title}</h1>
      <p className="mt-3 text-ink-soft">{body}</p>
      <div className="mt-8">{action}</div>
    </div>
  );
}

export function LoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const login = useLogin();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) });

  const onSubmit = handleSubmit((values) => {
    setFormError(null);
    login.mutate(values, {
      onSuccess: () => navigate(safeNextPath(params.get('next')), { replace: true }),
      onError: (error) => setFormError(applyServerErrors(error, setError)),
    });
  });

  return (
    <>
      <AuthHeading title={t('auth.login.title')} subtitle={t('auth.login.subtitle')} />
      <form onSubmit={onSubmit} noValidate className="space-y-5">
        {formError && <Alert>{t(formError)}</Alert>}
        <Field label={t('auth.fields.email')} error={errors.email?.message}>
          {(props) => (
            <Input
              type="email"
              autoComplete="email"
              inputMode="email"
              {...props}
              {...register('email')}
            />
          )}
        </Field>
        <Field label={t('auth.fields.password')} error={errors.password?.message}>
          {(props) => (
            <PasswordInput autoComplete="current-password" {...props} {...register('password')} />
          )}
        </Field>
        {/* Hidden until real email sending exists: the reset link is only printed in the API console.
        <div className="flex justify-end">
          <Link
            to="/forgot-password"
            className="text-sm text-brand-700 underline-offset-4 hover:underline"
          >
            {t('auth.login.forgot')}
          </Link>
        </div>
        */}
        <Button type="submit" size="lg" block loading={login.isPending}>
          {t('auth.login.submit')}
        </Button>
      </form>
      <AuthSwitch
        prompt={t('auth.login.noAccount')}
        to="/register"
        label={t('auth.login.createAccount')}
      />
    </>
  );
}

export function RegisterPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const registerUser = useRegister();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<RegisterInput>({ resolver: zodResolver(registerSchema) });

  const onSubmit = handleSubmit((values) => {
    setFormError(null);
    registerUser.mutate(
      { ...values, locale: currentLocale() },
      {
        onSuccess: () => navigate('/dashboard', { replace: true }),
        onError: (error) => setFormError(applyServerErrors(error, setError)),
      },
    );
  });

  return (
    <>
      <AuthHeading title={t('auth.register.title')} subtitle={t('auth.register.subtitle')} />
      <form onSubmit={onSubmit} noValidate className="space-y-5">
        {formError && <Alert>{t(formError)}</Alert>}
        <Field label={t('auth.fields.name')} error={errors.name?.message}>
          {(props) => <Input autoComplete="name" {...props} {...register('name')} />}
        </Field>
        <Field label={t('auth.fields.email')} error={errors.email?.message}>
          {(props) => (
            <Input
              type="email"
              autoComplete="email"
              inputMode="email"
              {...props}
              {...register('email')}
            />
          )}
        </Field>
        <Field
          label={t('auth.fields.password')}
          error={errors.password?.message}
          hint={t('auth.passwordHint')}
        >
          {(props) => (
            <PasswordInput autoComplete="new-password" {...props} {...register('password')} />
          )}
        </Field>
        <Button type="submit" size="lg" block loading={registerUser.isPending}>
          {t('auth.register.submit')}
        </Button>
        <p className="text-center text-xs text-muted">{t('auth.register.terms')}</p>
      </form>
      <AuthSwitch
        prompt={t('auth.register.haveAccount')}
        to="/login"
        label={t('auth.register.signIn')}
      />
    </>
  );
}

export function ForgotPasswordPage() {
  const { t } = useTranslation();
  const forgot = useForgotPassword();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<ForgotPasswordInput>({ resolver: zodResolver(forgotPasswordSchema) });

  if (forgot.isSuccess) {
    return (
      <Confirmation
        icon={<MailCheck className="size-8" />}
        title={t('auth.forgot.sentTitle')}
        body={t('auth.forgot.sent')}
        action={
          <ButtonLink to="/login" variant="secondary">
            {t('auth.forgot.backToLogin')}
          </ButtonLink>
        }
      />
    );
  }

  const onSubmit = handleSubmit((values) => {
    setFormError(null);
    forgot.mutate(values, { onError: (error) => setFormError(applyServerErrors(error, setError)) });
  });

  return (
    <>
      <AuthHeading title={t('auth.forgot.title')} subtitle={t('auth.forgot.subtitle')} />
      <form onSubmit={onSubmit} noValidate className="space-y-5">
        {formError && <Alert>{t(formError)}</Alert>}
        <Field label={t('auth.fields.email')} error={errors.email?.message}>
          {(props) => (
            <Input
              type="email"
              autoComplete="email"
              inputMode="email"
              {...props}
              {...register('email')}
            />
          )}
        </Field>
        <Button type="submit" size="lg" block loading={forgot.isPending}>
          {t('auth.forgot.submit')}
        </Button>
      </form>
      <AuthSwitch to="/login" label={t('auth.forgot.backToLogin')} />
    </>
  );
}

const resetFormSchema = resetPasswordSchema.pick({ password: true });

export function ResetPasswordPage() {
  const { t } = useTranslation();
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const reset = useResetPassword();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<{ password: string }>({ resolver: zodResolver(resetFormSchema) });

  if (reset.isSuccess) {
    return (
      <Confirmation
        icon={<ShieldCheck className="size-8" />}
        title={t('auth.reset.successTitle')}
        body={t('auth.reset.success')}
        action={<ButtonLink to="/login">{t('auth.reset.goToLogin')}</ButtonLink>}
      />
    );
  }

  if (token.length < 20) {
    return (
      <>
        <AuthHeading title={t('auth.reset.title')} subtitle={t('auth.reset.subtitle')} />
        <Alert>{t('auth.reset.missingToken')}</Alert>
        <AuthSwitch to="/forgot-password" label={t('auth.forgot.title')} />
      </>
    );
  }

  const onSubmit = handleSubmit(({ password }) => {
    setFormError(null);
    reset.mutate(
      { token, password },
      { onError: (error) => setFormError(applyServerErrors(error, setError)) },
    );
  });

  return (
    <>
      <AuthHeading title={t('auth.reset.title')} subtitle={t('auth.reset.subtitle')} />
      <form onSubmit={onSubmit} noValidate className="space-y-5">
        {formError && <Alert>{t(formError)}</Alert>}
        <Field
          label={t('auth.fields.newPassword')}
          error={errors.password?.message}
          hint={t('auth.passwordHint')}
        >
          {(props) => (
            <PasswordInput autoComplete="new-password" {...props} {...register('password')} />
          )}
        </Field>
        <Button type="submit" size="lg" block loading={reset.isPending}>
          {t('auth.reset.submit')}
        </Button>
      </form>
    </>
  );
}
