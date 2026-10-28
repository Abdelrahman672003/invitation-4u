import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { LanguageToggle } from '@/components/layout/LanguageToggle';
import { Field, Input } from '@/components/ui/Field';
import { safeNextPath, RequireAuth } from '@/features/auth/guards';
import { LoginPage } from '@/features/auth/AuthPages';
import { mockFetch, renderRoutes, renderWithProviders } from './render';

const unauthenticated = () =>
  mockFetch(() => ({ status: 401, body: { error: { code: 'UNAUTHENTICATED', message: 'x' } } }));

describe('RTL and language', () => {
  it('starts Arabic and right-to-left, and toggles to English LTR', async () => {
    unauthenticated();
    renderWithProviders(<LanguageToggle />);
    expect(document.documentElement).toHaveAttribute('dir', 'rtl');
    expect(document.documentElement).toHaveAttribute('lang', 'ar');

    await userEvent.click(screen.getByRole('button', { name: 'Switch to English' }));
    expect(document.documentElement).toHaveAttribute('dir', 'ltr');
    expect(document.documentElement).toHaveAttribute('lang', 'en');
    expect(localStorage.getItem('daawa.locale')).toBe('en');
  });
});

describe('Field', () => {
  it('links label, control and translated error for assistive tech', () => {
    renderWithProviders(
      <Field label="البريد الإلكتروني" error="validation.email">
        {(props) => <Input {...props} />}
      </Field>,
    );
    const input = screen.getByLabelText('البريد الإلكتروني');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAccessibleDescription('أدخل بريدًا إلكترونيًا صحيحًا');
  });
});

describe('route guards', () => {
  it('redirects signed-out users to login with a return path', async () => {
    unauthenticated();
    const { router } = renderRoutes(
      [
        { path: '/dashboard', element: <RequireAuth>secret</RequireAuth> },
        { path: '/login', element: <p>login page</p> },
      ],
      '/dashboard',
    );
    expect(await screen.findByText('login page')).toBeInTheDocument();
    expect(router.state.location.search).toBe('?next=%2Fdashboard');
    expect(screen.queryByText('secret')).not.toBeInTheDocument();
  });

  it('shows a forbidden page to customers on admin routes', async () => {
    mockFetch(() => ({
      status: 200,
      body: {
        user: {
          id: '1',
          name: 'Sara',
          email: 's@e.com',
          role: 'CUSTOMER',
          locale: 'ar',
          createdAt: '',
        },
      },
    }));
    renderRoutes(
      [{ path: '/admin', element: <RequireAuth role="ADMIN">admin area</RequireAuth> }],
      '/admin',
    );
    expect(await screen.findByText('غير مسموح')).toBeInTheDocument();
    expect(screen.queryByText('admin area')).not.toBeInTheDocument();
  });

  it('rejects open redirects', () => {
    expect(safeNextPath('/dashboard?x=1')).toBe('/dashboard?x=1');
    expect(safeNextPath('//evil.example')).toBe('/dashboard');
    expect(safeNextPath('https://evil.example')).toBe('/dashboard');
    expect(safeNextPath(null)).toBe('/dashboard');
  });
});

describe('LoginPage', () => {
  it('validates client-side and shows server errors in Arabic', async () => {
    mockFetch((url) =>
      url.endsWith('/auth/login')
        ? { status: 401, body: { error: { code: 'INVALID_CREDENTIALS', message: 'bad' } } }
        : { status: 401, body: { error: { code: 'UNAUTHENTICATED', message: 'x' } } },
    );
    renderWithProviders(<LoginPage />);

    await userEvent.click(screen.getByRole('button', { name: 'تسجيل الدخول' }));
    expect(await screen.findAllByText('هذا الحقل مطلوب')).toHaveLength(2);

    await userEvent.type(screen.getByLabelText('البريد الإلكتروني'), 'sara@example.com');
    await userEvent.type(screen.getByLabelText('كلمة المرور'), 'wrong-password');
    await userEvent.click(screen.getByRole('button', { name: 'تسجيل الدخول' }));
    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(
        'البريد الإلكتروني أو كلمة المرور غير صحيحة.',
      ),
    );
  });
});
