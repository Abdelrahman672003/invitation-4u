import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  BlessingDto,
  GuestDto,
  GuestInput,
  GuestStatus,
  GuestSummary,
  InvitationDto,
  PublicInvitationDto,
  PublicBlessingInput,
  PublicRsvpInput,
  RsvpDto,
} from '@invite/shared';
import { api } from '@/lib/api';

export function usePublishAction(action: 'publish' | 'unpublish') {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) =>
      (await api<{ data: InvitationDto }>(`/invitations/${id}/${action}`, { method: 'POST' })).data,
    onSuccess: (data) => {
      client.setQueryData(['invitation', data.id], data);
      void client.invalidateQueries({ queryKey: ['invitations'] });
    },
  });
}

export interface GuestFilters {
  q: string;
  status: GuestStatus | '';
  group: string;
}

interface GuestList {
  data: GuestDto[];
  summary: GuestSummary;
  groups: string[];
}

export function useGuests(invitationId: string, filters: GuestFilters) {
  const params = new URLSearchParams();
  if (filters.q) params.set('q', filters.q);
  if (filters.status) params.set('status', filters.status);
  if (filters.group) params.set('group', filters.group);
  const query = params.toString();
  return useQuery({
    queryKey: ['guests', invitationId, filters],
    queryFn: () => api<GuestList>(`/invitations/${invitationId}/guests${query ? `?${query}` : ''}`),
    placeholderData: (previous) => previous,
    // New replies arrive from the public page, so keep the counts fresh while this page is open.
    refetchInterval: 15_000,
  });
}

export function useRsvps(invitationId: string) {
  return useQuery({
    queryKey: ['rsvps', invitationId],
    queryFn: async () =>
      (await api<{ data: RsvpDto[] }>(`/invitations/${invitationId}/rsvps`)).data,
  });
}

export function useGuestMutations(invitationId: string) {
  const client = useQueryClient();
  const refresh = () => {
    void client.invalidateQueries({ queryKey: ['guests', invitationId] });
    void client.invalidateQueries({ queryKey: ['rsvps', invitationId] });
    void client.invalidateQueries({ queryKey: ['invitations'] });
  };
  const base = `/invitations/${invitationId}/guests`;
  return {
    add: useMutation({
      mutationFn: (input: Partial<GuestInput>) =>
        api<{ data: GuestDto }>(base, { method: 'POST', body: input }),
      onSuccess: refresh,
    }),
    update: useMutation({
      mutationFn: ({ id, input }: { id: string; input: Partial<GuestInput> }) =>
        api<{ data: GuestDto }>(`${base}/${id}`, { method: 'PATCH', body: input }),
      onSuccess: refresh,
    }),
    remove: useMutation({
      mutationFn: (id: string) => api<void>(`${base}/${id}`, { method: 'DELETE' }),
      onSuccess: refresh,
    }),
  };
}

export function usePublicInvitation(slug: string | undefined) {
  return useQuery({
    queryKey: ['public-invitation', slug],
    queryFn: async () =>
      (await api<{ data: PublicInvitationDto }>(`/public/invitations/${slug}`)).data,
    enabled: Boolean(slug),
    retry: false,
  });
}

/** Counts one open per browser session; refreshing or revisiting in the same tab is not counted again. */
export function useViewBeacon(slug: string) {
  useEffect(() => {
    const key = `viewed:${slug}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, '1');
    } catch {
      // Storage can be blocked; counting an extra view is better than failing the page.
    }
    api(`/public/invitations/${slug}/view`, { method: 'POST' }).catch(() => undefined);
  }, [slug]);
}

export function useSubmitRsvp(slug: string) {
  return useMutation({
    mutationFn: (input: PublicRsvpInput) =>
      api<{ data: { updated: boolean } }>(`/public/invitations/${slug}/rsvp`, {
        method: 'POST',
        body: input,
      }),
  });
}

export function usePublicBlessings(slug: string) {
  return useQuery({
    queryKey: ['blessings', slug],
    queryFn: async () =>
      (await api<{ data: BlessingDto[] }>(`/public/invitations/${slug}/blessings`)).data,
  });
}

export function useSendBlessing(slug: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: PublicBlessingInput) =>
      api<{ data: { ok: boolean } }>(`/public/invitations/${slug}/blessings`, {
        method: 'POST',
        body: input,
      }),
    onSuccess: () => client.invalidateQueries({ queryKey: ['blessings', slug] }),
  });
}

export function useOwnerBlessings(invitationId: string) {
  return useQuery({
    queryKey: ['owner-blessings', invitationId],
    queryFn: async () =>
      (await api<{ data: BlessingDto[] }>(`/invitations/${invitationId}/blessings`)).data,
  });
}

export function useDeleteBlessing(invitationId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api<void>(`/invitations/${invitationId}/blessings/${id}`, { method: 'DELETE' }),
    onSuccess: () => client.invalidateQueries({ queryKey: ['owner-blessings', invitationId] }),
  });
}
