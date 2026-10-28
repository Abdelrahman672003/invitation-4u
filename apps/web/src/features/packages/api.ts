import { useQuery } from '@tanstack/react-query';
import type { PackageDto } from '@invite/shared';
import { api } from '@/lib/api';

export function usePackages() {
  return useQuery({
    queryKey: ['packages'],
    queryFn: async () => (await api<{ data: PackageDto[] }>('/packages')).data,
    staleTime: 15 * 1000,
  });
}
