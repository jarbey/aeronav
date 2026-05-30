import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from './client';
import type { Aircraft, AircraftModel } from '../types';

export function useAircraftModels() {
  return useQuery<Record<string, AircraftModel>>({
    queryKey: ['aircraft-models'],
    // API returns AircraftModel[] — transform to Record<id, model> so keys match Prisma IDs
    queryFn: async () => {
      const arr = await apiFetch<AircraftModel[]>('/aircraft-models');
      return Object.fromEntries(arr.map(m => [m.id, m]));
    },
    staleTime: 120_000,
  });
}

export function useCreateAircraftModel() {
  const qc = useQueryClient();
  return useMutation<AircraftModel, Error, { key: string; data: Partial<AircraftModel> }>({
    mutationFn: ({ key, data }) => apiFetch<AircraftModel>('/aircraft-models', { method: 'POST', body: JSON.stringify({ id: key, ...data }) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['aircraft-models'] }),
  });
}

export function useUpdateAircraftModel() {
  const qc = useQueryClient();
  return useMutation<AircraftModel, Error, { key: string; data: Partial<AircraftModel> }>({
    mutationFn: ({ key, data }) => apiFetch<AircraftModel>(`/aircraft-models/${key}`, { method: 'PATCH', body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['aircraft-models'] }),
  });
}

export function useDeleteAircraftModel() {
  const qc = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: (key) => apiFetch<void>(`/aircraft-models/${key}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['aircraft-models'] }),
  });
}

export function useAircraft() {
  return useQuery<Aircraft[]>({
    queryKey: ['aircraft'],
    queryFn: () => apiFetch<Aircraft[]>('/aircraft'),
    staleTime: 60_000,
  });
}

export function useCreateAircraft() {
  const qc = useQueryClient();
  return useMutation<Aircraft, Error, Partial<Aircraft>>({
    mutationFn: (data) => apiFetch<Aircraft>('/aircraft', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['aircraft'] }),
  });
}

export function useUpdateAircraft() {
  const qc = useQueryClient();
  return useMutation<Aircraft, Error, { id: string; data: Partial<Aircraft> }>({
    mutationFn: ({ id, data }) => apiFetch<Aircraft>(`/aircraft/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['aircraft'] }),
  });
}

export function useDeleteAircraft() {
  const qc = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: (id) => apiFetch<void>(`/aircraft/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['aircraft'] }),
  });
}
