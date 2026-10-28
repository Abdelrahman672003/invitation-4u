import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  ChangePasswordInput,
  CurrentUser,
  ForgotPasswordInput,
  LoginInput,
  RegisterInput,
  ResetPasswordInput,
  UpdateProfileInput,
} from '@invite/shared';
import { ApiError, api } from '@/lib/api';

export const meQueryKey = ['me'] as const;

/** The signed-in user, or null when signed out. */
export function useCurrentUser() {
  return useQuery({
    queryKey: meQueryKey,
    queryFn: async () => {
      try {
        return (await api<{ user: CurrentUser }>('/me')).user;
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) return null;
        throw error;
      }
    },
    staleTime: 5 * 60 * 1000,
    retry: (count, error) => !(error instanceof ApiError && error.status < 500) && count < 2,
  });
}

export function useLogin() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: LoginInput) =>
      api<{ user: CurrentUser }>('/auth/login', { method: 'POST', body: input }),
    onSuccess: ({ user }) => client.setQueryData(meQueryKey, user),
  });
}

export function useRegister() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: RegisterInput) =>
      api<{ user: CurrentUser }>('/auth/register', { method: 'POST', body: input }),
    onSuccess: ({ user }) => client.setQueryData(meQueryKey, user),
  });
}

export function useLogout() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: () => api<void>('/auth/logout', { method: 'POST' }),
    onSettled: () => {
      // Drop every cached private resource, not just the user.
      client.clear();
      client.setQueryData(meQueryKey, null);
    },
  });
}

export function useForgotPassword() {
  return useMutation({
    mutationFn: (input: ForgotPasswordInput) =>
      api<{ ok: true }>('/auth/forgot-password', { method: 'POST', body: input }),
  });
}

export function useResetPassword() {
  return useMutation({
    mutationFn: (input: ResetPasswordInput) =>
      api<{ ok: true }>('/auth/reset-password', { method: 'POST', body: input }),
  });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: (input: ChangePasswordInput) =>
      api<{ ok: true }>('/me/password', { method: 'POST', body: input }),
  });
}

export function useUpdateProfile() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateProfileInput) =>
      api<{ user: CurrentUser }>('/me', { method: 'PATCH', body: input }),
    onSuccess: ({ user }) => client.setQueryData(meQueryKey, user),
  });
}
