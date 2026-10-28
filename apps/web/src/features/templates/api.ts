import { useQuery } from '@tanstack/react-query';
import type { TemplateDto } from '@invite/shared';
import { api } from '@/lib/api';

export function useTemplates(category?: string) {
  return useQuery({
    queryKey: ['templates', category ?? 'all'],
    queryFn: async () =>
      (
        await api<{ data: TemplateDto[] }>(
          `/templates${category ? `?category=${encodeURIComponent(category)}` : ''}`,
        )
      ).data,
    staleTime: 15 * 1000,
  });
}

export function useTemplate(slug: string | undefined) {
  return useQuery({
    queryKey: ['template', slug],
    queryFn: async () =>
      (await api<{ data: TemplateDto }>(`/templates/${encodeURIComponent(slug!)}`)).data,
    enabled: Boolean(slug),
    staleTime: 15 * 1000,
    retry: false,
  });
}
