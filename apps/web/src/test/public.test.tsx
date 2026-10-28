import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
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

const publicInvitation = (overrides: object = {}) => ({
  slug: 'wedding-abc',
  contentLocale: 'en',
  eventDate: '2026-12-12',
  categorySlug: 'wedding',
  content: {
    hostLine: 'Together',
    headline: 'Sara & Omar',
    occasionLine: '',
    time: '20:00',
    venueName: 'Al Masa Hotel',
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
    rsvp: { enabled: true, askAttendees: true, maxPerResponse: 5 },
    design: {},
  },
  design,
  watermark: false,
  expiresAt: null,
  rsvp: { enabled: true, askAttendees: true, maxPerResponse: 5, deadline: null, closed: false },
  ...overrides,
});

const rich = () =>
  publicInvitation({
    eventDate: '2099-12-12',
    content: {
      ...publicInvitation().content,
      message: 'We would love to celebrate with you',
      story: 'We met at university.',
      schedule: [
        { time: '21:00', title: 'Dinner' },
        { time: '19:00', title: 'Ceremony' },
        { time: '22:00', title: '' },
      ],
      dressCode: 'Formal',
      notes: 'Parking is free',
      mapUrl: 'https://maps.example.com/venue',
    },
  });

describe('landing page', () => {
  it('shows every section: hero, countdown, details, story, programme, venue, notes and reply form', async () => {
    mockFetch(() => ({ status: 200, body: { data: rich() } }));
    renderRoutes(routes, '/i/wedding-abc');

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Sara & Omar' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('timer')).toBeInTheDocument();
    for (const heading of [
      'The details',
      'Our story',
      'Programme of the day',
      'Where to find us',
      'Good to know',
      'Will you attend?',
    ]) {
      expect(screen.getByRole('heading', { name: heading })).toBeInTheDocument();
    }
    // Programme is ordered by time and skips blank rows.
    const items = screen.getAllByRole('listitem').map((item) => item.textContent);
    expect(items.findIndex((text) => text?.includes('Ceremony'))).toBeLessThan(
      items.findIndex((text) => text?.includes('Dinner')),
    );
    expect(screen.getByText('Formal')).toBeInTheDocument();

    const map = screen.getByRole('link', { name: 'Open in maps' });
    expect(map).toHaveAttribute('href', 'https://maps.example.com/venue');
    expect(map).toHaveAttribute('rel', expect.stringContaining('noopener'));
  });

  it('leaves out optional sections that are empty or switched off', async () => {
    mockFetch(() => ({ status: 200, body: { data: publicInvitation() } }));
    renderRoutes(routes, '/i/wedding-abc');
    await screen.findByRole('heading', { level: 1, name: 'Sara & Omar' });
    expect(screen.queryByRole('heading', { name: 'Our story' })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Programme of the day' })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Good to know' })).not.toBeInTheDocument();
  });

  it('shows the watermark only on the free plan', async () => {
    mockFetch(() => ({
      status: 200,
      body: { data: publicInvitation({ watermark: true, expiresAt: '2099-01-01T00:00:00.000Z' }) },
    }));
    const { unmount } = renderRoutes(routes, '/i/wedding-abc');
    expect(await screen.findByTestId('watermark')).toBeInTheDocument();
    expect(screen.getByText(/Free plan/)).toBeInTheDocument();
    unmount();

    mockFetch(() => ({ status: 200, body: { data: publicInvitation() } }));
    renderRoutes(routes, '/i/wedding-abc');
    await screen.findByRole('heading', { level: 1, name: 'Sara & Omar' });
    expect(screen.queryByTestId('watermark')).not.toBeInTheDocument();
  });

  it('tells guests when a free invitation has ended', async () => {
    mockFetch(() => ({
      status: 410,
      body: { error: { code: 'EXPIRED', message: 'This invitation has ended' } },
    }));
    renderRoutes(routes, '/i/wedding-abc');
    expect(
      await screen.findByRole('heading', { name: /This invitation has ended|انتهت هذه الدعوة/ }),
    ).toBeInTheDocument();
  });
});

describe('public invitation page', () => {
  it('shows the invitation in its own language and submits an RSVP', async () => {
    const sent: unknown[] = [];
    mockFetch((url, init) => {
      if (init?.method === 'POST') {
        sent.push(JSON.parse(String(init.body)));
        return { status: 201, body: { data: { updated: false } } };
      }
      return { status: 200, body: { data: publicInvitation() } };
    });
    const { container } = renderRoutes(routes, '/i/wedding-abc');

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Sara & Omar' }),
    ).toBeInTheDocument();
    expect(container.querySelector('[lang="en"][dir="ltr"]')).not.toBeNull();

    await userEvent.type(screen.getByLabelText('Your name'), 'Ahmed Ali');
    await userEvent.click(screen.getByRole('button', { name: 'Send reply' }));

    await waitFor(() => expect(sent).toHaveLength(1));
    expect(sent[0]).toMatchObject({
      name: 'Ahmed Ali',
      response: 'ACCEPTED',
      attendeesCount: 1,
      website: '',
    });
    expect(await screen.findByRole('status')).toHaveTextContent('Thank you');
  });

  it('asks for a name before sending', async () => {
    const sent: unknown[] = [];
    mockFetch((_url, init) => {
      if (init?.method === 'POST') sent.push(init.body);
      return { status: 200, body: { data: publicInvitation() } };
    });
    renderRoutes(routes, '/i/wedding-abc');
    await userEvent.click(await screen.findByRole('button', { name: 'Send reply' }));
    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(sent).toHaveLength(0);
  });

  it('hides the form once replies are closed', async () => {
    mockFetch(() => ({
      status: 200,
      body: {
        data: publicInvitation({
          rsvp: {
            enabled: true,
            askAttendees: true,
            maxPerResponse: 5,
            deadline: '2020-01-01',
            closed: true,
          },
        }),
      },
    }));
    renderRoutes(routes, '/i/wedding-abc');
    expect(await screen.findByText('Replies are now closed.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Send reply' })).not.toBeInTheDocument();
  });

  it('shows a friendly message for an unavailable invitation', async () => {
    mockFetch(() => ({ status: 404, body: { error: { code: 'NOT_FOUND', message: 'x' } } }));
    renderRoutes(routes, '/i/nope');
    expect(await screen.findByRole('heading', { level: 1 })).toBeInTheDocument();
  });
});
