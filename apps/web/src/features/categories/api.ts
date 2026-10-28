import { useQuery } from '@tanstack/react-query';
import type { EventCategoryDto } from '@invite/shared';
import { api } from '@/lib/api';

export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: async () => (await api<{ data: EventCategoryDto[] }>('/categories')).data,
    staleTime: 15 * 1000,
  });
}
