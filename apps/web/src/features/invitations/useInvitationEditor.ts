import { useCallback, useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { InvitationContentData, InvitationDto, Locale } from '@invite/shared';
import { ApiError } from '@/lib/api';
import { saveInvitation } from './api';

export type SaveState = 'saved' | 'dirty' | 'saving' | 'error' | 'conflict';

export interface Draft {
  title: string;
  content: InvitationContentData;
  eventDate: string | null;
  rsvpDeadline: string | null;
  contentLocale: Locale;
  templateSlug: string;
}

const DEBOUNCE_MS = 700;

const draftOf = (invitation: InvitationDto): Draft => ({
  title: invitation.title,
  content: invitation.content,
  eventDate: invitation.eventDate,
  rsvpDeadline: invitation.rsvpDeadline,
  contentLocale: invitation.contentLocale,
  templateSlug: invitation.template.slug,
});

/**
 * Local editing state with debounced autosave. At most one request is in flight; edits made
 * meanwhile are sent right after it. The server rejects stale revisions, so an old response
 * can never overwrite newer content.
 */
export function useInvitationEditor(invitation: InvitationDto) {
  const client = useQueryClient();
  const [draft, setDraft] = useState<Draft>(() => draftOf(invitation));
  const [state, setState] = useState<SaveState>('saved');
  const [serverFieldErrors, setServerFieldErrors] = useState<Record<string, string>>({});

  const latest = useRef(draft);
  const revision = useRef(invitation.revision);
  const savedTemplate = useRef(invitation.template.slug);
  const version = useRef(0); // bumped on every edit
  const savedVersion = useRef(0);
  const inFlight = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const stopped = useRef(false);

  const flush = useCallback(async () => {
    if (inFlight.current || stopped.current || savedVersion.current === version.current) return;
    inFlight.current = true;
    setState('saving');
    const sentVersion = version.current;
    const snapshot = latest.current;
    try {
      const saved = await saveInvitation(invitation.id, {
        baseRevision: revision.current,
        title: snapshot.title.trim() || undefined,
        content: snapshot.content,
        eventDate: snapshot.eventDate,
        rsvpDeadline: snapshot.rsvpDeadline,
        contentLocale: snapshot.contentLocale,
        templateSlug:
          snapshot.templateSlug !== savedTemplate.current ? snapshot.templateSlug : undefined,
      });
      revision.current = saved.revision;
      savedTemplate.current = saved.template.slug;
      savedVersion.current = sentVersion;
      setServerFieldErrors({});
      client.setQueryData(['invitation', invitation.id], saved);
      void client.invalidateQueries({ queryKey: ['invitations'] });
      inFlight.current = false;
      if (version.current !== sentVersion) void flush();
      else setState('saved');
    } catch (error) {
      inFlight.current = false;
      if (error instanceof ApiError && error.code === 'STALE_REVISION') {
        stopped.current = true;
        setState('conflict');
      } else {
        if (error instanceof ApiError && error.fields) setServerFieldErrors(error.fields);
        setState('error');
      }
    }
  }, [client, invitation.id]);

  const schedule = useCallback(() => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => void flush(), DEBOUNCE_MS);
  }, [flush]);

  const update = useCallback(
    (patch: Partial<Draft>) => {
      if (stopped.current) return;
      latest.current = { ...latest.current, ...patch };
      setDraft(latest.current);
      version.current += 1;
      setState((current) => (current === 'saving' ? current : 'dirty'));
      schedule();
    },
    [schedule],
  );

  const updateContent = useCallback(
    (patch: Partial<InvitationContentData>) =>
      update({ content: { ...latest.current.content, ...patch } }),
    [update],
  );

  const retry = useCallback(() => void flush(), [flush]);

  // Save pending edits when leaving the editor.
  useEffect(
    () => () => {
      clearTimeout(timer.current);
      void flush();
    },
    [flush],
  );

  // Warn before closing the tab while edits are unsaved.
  useEffect(() => {
    const handler = (event: BeforeUnloadEvent) => {
      if (savedVersion.current !== version.current) event.preventDefault();
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, []);

  return { draft, state, update, updateContent, retry, serverFieldErrors };
}
