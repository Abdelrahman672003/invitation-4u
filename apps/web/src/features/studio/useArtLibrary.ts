import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { ArtItem } from './DesignEditor';

/** The ready-made artwork admins offer in the Design Studio. */
export function useArtLibrary() {
  return useQuery({
    queryKey: ['art-assets'],
    queryFn: async () => (await api<{ data: ArtItem[] }>('/art-assets')).data,
  });
}
