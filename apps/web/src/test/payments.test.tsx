import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { routes } from '@/app/router';
import { mockFetch, renderRoutes } from './render';

const user = (role: 'CUSTOMER' | 'ADMIN') => ({
  id: 'u',
  name: 'U',
  email: 'u@example.com',
  role,
  locale: 'en',
  createdAt: '2026-01-01T00:00:00.000Z',
});

const payment = (status: string) => ({
  id: 'p1',
  invitationId: 'i1',
  invitationTitle: 'Wedding',
  packageCode: 'standard',
  packageNameEn: 'Standard',
  packageNameAr: 'الأساسية',
  amountMinor: 29900,
  currency: 'EGP',
  status,
  provider: 'test',
  createdAt: '2026-01-01T00:00:00.000Z',
  paidAt: null,
});

describe('payment return page', () => {
  it.each([
    ['SUCCEEDED', /Payment confirmed|تم تأكيد الدفع/],
    ['FAILED', /Payment did not go through|لم تكتمل عملية الدفع/],
    ['PENDING', /Confirming your payment|جارٍ تأكيد الدفع/],
  ])('shows the server-reported %s status', async (status, heading) => {
    mockFetch((url) => {
      if (url.endsWith('/me')) return { status: 200, body: { user: user('CUSTOMER') } };
      if (url.includes('/payments/p1')) return { status: 200, body: { data: payment(status) } };
      return { status: 404, body: { error: { code: 'NOT_FOUND', message: 'x' } } };
    });
    renderRoutes(routes, '/payments/return?payment=p1');
    expect(await screen.findByRole('heading', { name: heading })).toBeInTheDocument();
  });

  it('does not claim success when no payment is given', async () => {
    mockFetch((url) =>
      url.endsWith('/me')
        ? { status: 200, body: { user: user('CUSTOMER') } }
        : { status: 404, body: { error: { code: 'NOT_FOUND', message: 'x' } } },
    );
    renderRoutes(routes, '/payments/return');
    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(screen.queryByText(/Payment confirmed|تم تأكيد الدفع/)).not.toBeInTheDocument();
  });
});

describe('payment history', () => {
  it('lists payments with amounts and status', async () => {
    mockFetch((url) => {
      if (url.endsWith('/me')) return { status: 200, body: { user: user('CUSTOMER') } };
      return { status: 200, body: { data: [payment('SUCCEEDED')] } };
    });
    renderRoutes(routes, '/payments');
    expect(await screen.findByText('Wedding')).toBeInTheDocument();
    expect(screen.getByText(/299/)).toBeInTheDocument();
  });
});

describe('admin area', () => {
  it('keeps customers out', async () => {
    mockFetch((url) =>
      url.endsWith('/me')
        ? { status: 200, body: { user: user('CUSTOMER') } }
        : { status: 403, body: { error: { code: 'FORBIDDEN', message: 'x' } } },
    );
    renderRoutes(routes, '/admin/payments');
    expect(await screen.findByText(/Not allowed|غير مسموح/)).toBeInTheDocument();
    expect(screen.queryByText('mona@example.com')).not.toBeInTheDocument();
  });

  it('shows admin tools to administrators', async () => {
    mockFetch((url) => {
      if (url.endsWith('/me')) return { status: 200, body: { user: user('ADMIN') } };
      if (url.includes('/admin/users')) {
        return {
          status: 200,
          body: {
            data: [
              {
                id: 'x',
                name: 'Mona',
                email: 'mona@example.com',
                role: 'CUSTOMER',
                createdAt: '2026-01-01T00:00:00.000Z',
                invitations: 2,
              },
            ],
          },
        };
      }
      return { status: 200, body: { data: [] } };
    });
    renderRoutes(routes, '/admin/users');
    expect(await screen.findByText('mona@example.com')).toBeInTheDocument();
  });
});
