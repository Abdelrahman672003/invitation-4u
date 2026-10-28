import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CreateInvitationInput, InvitationDto, UpdateInvitationInput } from '@invite/shared';
import { api } from '@/lib/api';

type One = { data: InvitationDto };

export function useInvitations() {
  return useQuery({
    queryKey: ['invitations'],
    queryFn: async () => (await api<{ data: InvitationDto[] }>('/invitations')).data,
  });
}

export function useInvitation(id: string | undefined) {
  return useQuery({
    queryKey: ['invitation', id],
    queryFn: async () => (await api<One>(`/invitations/${id}`)).data,
    enabled: Boolean(id),
    retry: false,
    // The editor owns the live copy; never refetch over unsaved edits.
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });
}

export function saveInvitation(id: string, input: UpdateInvitationInput) {
  return api<One>(`/invitations/${id}`, { method: 'PATCH', body: input }).then((res) => res.data);
}

export function useCreateInvitation() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateInvitationInput) =>
      (await api<One>('/invitations', { method: 'POST', body: input })).data,
    onSuccess: (data) => {
      client.setQueryData(['invitation', data.id], data);
      void client.invalidateQueries({ queryKey: ['invitations'] });
    },
  });
}

export function useArchiveInvitation(action: 'archive' | 'restore') {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) =>
      (await api<One>(`/invitations/${id}/${action}`, { method: 'POST' })).data,
    onSuccess: (data) => {
      // Drop the cached copy so the editor reloads the new status.
      client.removeQueries({ queryKey: ['invitation', data.id] });
      void client.invalidateQueries({ queryKey: ['invitations'] });
    },
  });
}

export function useDeleteInvitation() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api<void>(`/invitations/${id}`, { method: 'DELETE' });
      return id;
    },
    onSuccess: (id) => {
      client.removeQueries({ queryKey: ['invitation', id] });
      void client.invalidateQueries({ queryKey: ['invitations'] });
    },
  });
}
