import { describe, expect, it } from 'vitest';
import { invitationContentSchema } from './invitation.js';

describe('invitation content for the landing page', () => {
  it('fills every new field for content saved before the landing page existed', () => {
    const parsed = invitationContentSchema.parse({
      headline: 'Sara & Omar',
      sections: { time: false },
    });
    expect(parsed).toMatchObject({ story: '', schedule: [], dressCode: '', notes: '', mapUrl: '' });
    expect(parsed.sections).toEqual({
      time: false,
      address: true,
      message: true,
      countdown: true,
      story: true,
      schedule: true,
      details: true,
      envelope: true,
      calendar: true,
      guestbook: true,
      gallery: true,
    });
  });

  it('only accepts https map links, so a link can never run script', () => {
    for (const url of [
      'javascript:alert(1)',
      'http://maps.example.com',
      'data:text/html,x',
      'maps.example.com',
      'https://a b',
    ]) {
      expect(invitationContentSchema.safeParse({ mapUrl: url }).success, url).toBe(false);
    }
    expect(
      invitationContentSchema.safeParse({ mapUrl: 'https://maps.app.goo.gl/abc' }).success,
    ).toBe(true);
    expect(invitationContentSchema.safeParse({ mapUrl: '' }).success).toBe(true);
  });

  it('limits the programme to six entries with valid times', () => {
    const item = { time: '19:00', title: 'Dinner' };
    expect(invitationContentSchema.safeParse({ schedule: Array(6).fill(item) }).success).toBe(true);
    expect(invitationContentSchema.safeParse({ schedule: Array(7).fill(item) }).success).toBe(
      false,
    );
    expect(
      invitationContentSchema.safeParse({ schedule: [{ time: '25:00', title: 'x' }] }).success,
    ).toBe(false);
  });
});
