import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from './client';
import type { Person } from '../types';

export function usePeople() {
  return useQuery<Person[]>({
    queryKey: ['people'],
    queryFn: () => apiFetch<Person[]>('/people'),
    staleTime: 60_000,
  });
}

export function useCreatePerson() {
  const qc = useQueryClient();
  return useMutation<Person, Error, Partial<Person>>({
    mutationFn: (data) => apiFetch<Person>('/people', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['people'] }),
  });
}

export function useUpdatePerson() {
  const qc = useQueryClient();
  return useMutation<Person, Error, { id: string; data: Partial<Person> }>({
    mutationFn: ({ id, data }) => apiFetch<Person>(`/people/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['people'] }),
  });
}

export function useDeletePerson() {
  const qc = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: (id) => apiFetch<void>(`/people/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['people'] }),
  });
}
