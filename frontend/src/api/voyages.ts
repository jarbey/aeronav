import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from './client';
import type { Voyage, VoyageResult } from '../types';

export function useVoyages() {
  return useQuery<Voyage[]>({
    queryKey: ['voyages'],
    queryFn: () => apiFetch<Voyage[]>('/voyages'),
    staleTime: 30_000,
  });
}

export function useVoyage(id: string | null) {
  return useQuery<Voyage>({
    queryKey: ['voyages', id],
    queryFn: () => apiFetch<Voyage>(`/voyages/${id}`),
    enabled: !!id,
    staleTime: 30_000,
  });
}

export function useComputeVoyage(id: string | null) {
  return useQuery<VoyageResult>({
    queryKey: ['voyages', id, 'compute'],
    queryFn: () => apiFetch<VoyageResult>(`/voyages/${id}/compute`),
    enabled: !!id,
    staleTime: 10_000,
  });
}

export function useCreateVoyage() {
  const qc = useQueryClient();
  return useMutation<Voyage, Error, Partial<Voyage>>({
    mutationFn: (data) => apiFetch<Voyage>('/voyages', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['voyages'] }),
  });
}

export function useUpdateVoyage() {
  const qc = useQueryClient();
  return useMutation<Voyage, Error, { id: string; data: Partial<Voyage> }>({
    mutationFn: ({ id, data }) => apiFetch<Voyage>(`/voyages/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ['voyages'] });
      qc.invalidateQueries({ queryKey: ['voyages', id] });
    },
  });
}

export function useDeleteVoyage() {
  const qc = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: (id) => apiFetch<void>(`/voyages/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['voyages'] }),
  });
}
