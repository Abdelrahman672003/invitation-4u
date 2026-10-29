import { screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { InvitationContent, TemplateDto } from '@invite/shared';
import { InvitationRenderer } from '@/components/invitation/InvitationRenderer';
import { routes } from '@/app/router';
import { mockFetch, renderRoutes, renderWithProviders } from './render';

const design: TemplateDto['design'] = {
  layout: 'banner',
  frame: 'ornate',
  ornament: 'floral',
  pattern: 'dots',
  font: 'elegant',
  palette: {
    background: '#f6efe2',
    surface: '#fffdf8',
    text: '#3b2a1a',
    muted: '#7b6a58',
    accent: '#946b37',
  },
};

const content: InvitationContent = {
  label: 'Together',
  title: 'Sara & Omar',
  occasion: 'invite you',
  date: 'Thursday',
  venue: 'Al Masa Hotel',
};

const template: TemplateDto = {
  id: '1',
  slug: 'wedding-royal-gold',
  categorySlug: 'wedding',
  nameEn: 'Royal Gold',
  nameAr: 'الذهب الملكي',
  descriptionEn: 'Classic cream and gold.',
  descriptionAr: null,
  isPremium: true,
  design,
};

describe('InvitationRenderer', () => {
  it('renders the content in the requested direction', () => {
    const { container } = renderWithProviders(
      <InvitationRenderer design={design} content={content} dir="rtl" />,
    );
    expect(screen.getByText('Sara & Omar')).toBeInTheDocument();
    expect(container.querySelector('[dir="rtl"]')).not.toBeNull();
  });

  it('omits optional lines that have no content', () => {
    renderWithProviders(<InvitationRenderer design={design} content={content} dir="ltr" />);
    expect(screen.queryByText('8:00 PM')).not.toBeInTheDocument();
  });
});

describe('template gallery', () => {
  it('lists templates from the API', async () => {
    mockFetch((url) => {
      if (url.includes('/categories')) return { status: 200, body: { data: [] } };
      if (url.includes('/auth/me') || url.includes('/me'))
        return { status: 401, body: { error: { code: 'UNAUTHENTICATED', message: 'x' } } };
      return { status: 200, body: { data: [template] } };
    });
    renderRoutes(routes, '/templates');
    expect(await screen.findByText(/Royal Gold|الذهب الملكي/)).toBeInTheDocument();
    expect(screen.getByText(/premium|مميز/i)).toBeInTheDocument();
  });

  it('shows a not-found message for an unknown template', async () => {
    mockFetch((url) => {
      if (url.includes('/templates/'))
        return { status: 404, body: { error: { code: 'NOT_FOUND', message: 'x' } } };
      return { status: 401, body: { error: { code: 'UNAUTHENTICATED', message: 'x' } } };
    });
    renderRoutes(routes, '/templates/nope');
    expect(await screen.findByRole('alert')).toBeInTheDocument();
  });
});

describe('marketing pages', () => {
  const offline = () => ({
    status: 401,
    body: { error: { code: 'UNAUTHENTICATED', message: 'x' } },
  });

  it('renders the terms with its sections', async () => {
    mockFetch(offline);
    renderRoutes(routes, '/terms');
    expect(await screen.findAllByRole('heading', { level: 2 })).not.toHaveLength(0);
  });

  it('renders the FAQ as expandable questions', async () => {
    mockFetch(offline);
    const { container } = renderRoutes(routes, '/faq');
    await screen.findByRole('heading', { level: 1 });
    expect(container.querySelectorAll('details').length).toBeGreaterThanOrEqual(6);
  });

  it('home page presents the invitation page sections, designs and a live demo', async () => {
    mockFetch((url) => {
      if (url.includes('/templates'))
        return {
          status: 200,
          body: { data: [{ ...template, categorySlug: 'wedding', isPremium: true }] },
        };
      if (url.includes('/categories'))
        return {
          status: 200,
          body: {
            data: [{ id: 'c1', slug: 'wedding', nameEn: 'Wedding', nameAr: 'زفاف', subtypes: [] }],
          },
        };
      return offline();
    });
    renderRoutes(routes, '/');

    expect(await screen.findByRole('heading', { level: 1 })).toBeInTheDocument();
    // The demo phone renders a real invitation page: its countdown and programme sections are there.
    expect(await screen.findByRole('timer')).toBeInTheDocument();
    // The anatomy section lists the eight parts of an invitation page.
    expect(screen.getAllByRole('heading', { level: 3 }).length).toBeGreaterThanOrEqual(8);
    // Occasion tabs show templates for the chosen occasion.
    expect(await screen.findByRole('tab', { name: /Wedding|زفاف/ })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(
      screen.getAllByRole('link', { name: /Royal Gold|الذهب الملكي|./ }).length,
    ).toBeGreaterThan(0);
  });

  it('shows package prices from the API', async () => {
    mockFetch((url) => {
      if (url.includes('/packages'))
        return {
          status: 200,
          body: {
            data: [
              {
                id: 'p',
                code: 'standard',
                nameEn: 'Standard',
                nameAr: 'الأساسية',
                priceMinor: 29900,
                currency: 'EGP',
                premiumTemplates: false,
                maxGuests: 300,
              },
            ],
          },
        };
      return offline();
    });
    renderRoutes(routes, '/pricing');
    expect(await screen.findByText(/299/)).toBeInTheDocument();
  });
});

describe('editor', () => {
  const invitation = {
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
      verse: '',
      verseFont: 'auto',
      story: '',
      storyFont: 'auto',
      gallery: [],
      galleryLayout: 'grid',
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
    categorySlug: 'wedding',
    subtypeSlug: null,
    template,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    publishedAt: null,
  };
  const user = {
    id: 'u',
    name: 'U',
    email: 'u@example.com',
    role: 'CUSTOMER',
    locale: 'en',
    createdAt: '2026-01-01T00:00:00.000Z',
  };

  it('autosaves edits with the base revision and shows the saved state', async () => {
    const saves: unknown[] = [];
    mockFetch((url, init) => {
      if (init?.method === 'PATCH') {
        saves.push(JSON.parse(String(init.body)));
        return { status: 200, body: { data: { ...invitation, revision: 1 } } };
      }
      if (url.endsWith('/me')) return { status: 200, body: { user } };
      if (url.includes('/invitations/')) return { status: 200, body: { data: invitation } };
      if (url.includes('/templates')) return { status: 200, body: { data: [template] } };
      return { status: 200, body: { data: [] } };
    });
    const { default: userEvent } = await import('@testing-library/user-event');
    renderRoutes(routes, `/invitations/${invitation.id}/edit`);
    const venue = await screen.findByLabelText(/Venue|المكان/);
    await userEvent.type(venue, 'Hall');
    await waitFor(() => expect(saves).toHaveLength(1), { timeout: 4000 });
    expect(saves[0]).toMatchObject({ baseRevision: 0, content: { venueName: 'Hall' } });
  });
});
