import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { routes } from '@/app/router';
import { mockFetch, renderRoutes } from './render';

const design = {
  layout: 'centered',
  frame: 'thin',
  ornament: 'floral',
  pattern: 'none',
  font: 'elegant',
  palette: {
    background: '#f6efe2',
    surface: '#fffdf8',
    text: '#3b2a1a',
    muted: '#7b6a58',
    accent: '#946b37',
  },
};

const template = {
  id: '1',
  slug: 'wedding-royal-gold',
  categorySlug: 'wedding',
  nameEn: 'Royal Gold',
  nameAr: 'الذهب الملكي',
  descriptionEn: null,
  descriptionAr: null,
  isPremium: false,
  design,
};

const invitation = (overrides: object = {}) => ({
  id: '11111111-1111-4111-8111-111111111111',
  slug: 'wedding-abc',
  title: 'My wedding',
  status: 'DRAFT',
  revision: 0,
  contentLocale: 'en',
  eventDate: null,
  content: {
    hostLine: '',
    headline: 'Sara & Omar',
    occasionLine: '',
    time: '',
    venueName: '',
    venueAddress: '',
    message: '',
    story: '',
    schedule: [],
    dressCode: '',
    notes: '',
    mapUrl: '',
    sections: {
      time: true,
      address: true,
      message: true,
      countdown: true,
      story: true,
      schedule: true,
      details: true,
    },
    rsvp: { enabled: true, askAttendees: true, maxPerResponse: 10 },
    design: {},
  },
  rsvpDeadline: null,
  stats: { guests: 0, accepted: 0, declined: 0, attendees: 0 },
  views: 0,
  expiresAt: null,
  expired: false,
  freeUsed: false,
  paid: false,
  paymentStatus: null,
  categorySlug: 'wedding',
  subtypeSlug: null,
  template,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  publishedAt: null,
  ...overrides,
});

const user = {
  id: 'u',
  name: 'U',
  email: 'u@example.com',
  role: 'CUSTOMER',
  locale: 'en',
  createdAt: '2026-01-01T00:00:00.000Z',
};

afterEach(() => vi.restoreAllMocks());

describe('deleting invitations', () => {
  it('offers delete only for unpaid invitations and asks before deleting', async () => {
    const deleted: string[] = [];
    let list = [
      invitation(),
      invitation({ id: '22222222-2222-4222-8222-222222222222', title: 'Paid one', paid: true }),
    ];
    mockFetch((url, init) => {
      if (url.endsWith('/me')) return { status: 200, body: { user } };
      if (init?.method === 'DELETE') {
        deleted.push(url);
        list = list.filter((item) => !url.endsWith(item.id));
        return { status: 204 };
      }
      if (url.includes('/categories')) return { status: 200, body: { data: [] } };
      return { status: 200, body: { data: list } };
    });
    renderRoutes(routes, '/dashboard');

    await screen.findByText('My wedding');
    // Only the unpaid invitation gets a delete button.
    const buttons = await screen.findAllByRole('button', { name: /Delete|حذف/ });
    expect(buttons).toHaveLength(1);

    // Declining the confirmation modal deletes nothing.
    await userEvent.click(buttons[0]!);
    let dialog = await screen.findByRole('dialog');
    await userEvent.click(within(dialog).getByRole('button', { name: /Cancel|إلغاء/ }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(deleted).toHaveLength(0);

    await userEvent.click(buttons[0]!);
    dialog = await screen.findByRole('dialog');
    await userEvent.click(within(dialog).getAllByRole('button').at(-1)!);
    await waitFor(() =>
      expect(deleted).toEqual(['/api/v1/invitations/11111111-1111-4111-8111-111111111111']),
    );
    await waitFor(() => expect(screen.queryByText('My wedding')).not.toBeInTheDocument());
    expect(screen.getByText('Paid one')).toBeInTheDocument();
  });

  it('warns that a published link stops working', async () => {
    mockFetch((url) => {
      if (url.endsWith('/me')) return { status: 200, body: { user } };
      if (url.includes('/categories')) return { status: 200, body: { data: [] } };
      return { status: 200, body: { data: [invitation({ status: 'PUBLISHED' })] } };
    });
    renderRoutes(routes, '/dashboard');
    await userEvent.click(await screen.findByRole('button', { name: /Delete|حذف/ }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText(/stop working|سيتوقف/)).toBeInTheDocument();
  });
});

describe('home page sections', () => {
  const offline = () => ({
    status: 401,
    body: { error: { code: 'UNAUTHENTICATED', message: 'x' } },
  });

  it('links the navbar and footer to home page sections', async () => {
    mockFetch(offline);
    renderRoutes(routes, '/');
    await screen.findByRole('heading', { level: 1 });
    for (const [name, hash] of [
      [/How it works|كيف تعمل/, '#how-it-works'],
      [/Pricing|الأسعار/, '#pricing'],
      [/FAQ|الأسئلة الشائعة/, '#faq'],
    ] as const) {
      const links = screen.getAllByRole('link', { name });
      // Navbar and footer; the FAQ is only linked from the navbar.
      expect(links.length, String(name)).toBeGreaterThanOrEqual(hash === '#faq' ? 1 : 2);
      for (const link of links) expect(link).toHaveAttribute('href', `/${hash}`);
      expect(document.getElementById(hash.slice(1))).not.toBeNull();
    }
  });

  it('sends the old page addresses to the matching section', async () => {
    mockFetch(offline);
    const { router } = renderRoutes(routes, '/pricing');
    await screen.findByRole('heading', { level: 1 });
    expect(router.state.location.pathname).toBe('/');
    expect(router.state.location.hash).toBe('#pricing');
  });
});
