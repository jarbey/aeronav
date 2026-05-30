import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from './client';
import type { Aerodrome } from '../types';

const BASE_URL = (import.meta.env.VITE_API_URL as string | undefined) || '/api';
export const vacProxyUrl = (icao: string) => `${BASE_URL}/aerodromes/${icao}/vac`;

type ApiAerodrome = Omit<Aerodrome, 'coord' | 'elevation' | 'taxLandingEUR' | 'taxParkingEUR' | 'note'> & {
  lngLat: [number, number];
  elevationFt: number;
  taxLanding: number;
  taxParking: number;
  notes?: string | null;
};

function fromApi(a: ApiAerodrome): Aerodrome {
  return {
    ...a,
    coord: a.lngLat,
    elevation: a.elevationFt,
    taxLandingEUR: a.taxLanding,
    taxParkingEUR: a.taxParking,
    note: a.notes ?? '',
  };
}

export function toApi(a: Partial<Aerodrome>): Partial<ApiAerodrome> {
  const { coord, elevation, taxLandingEUR, taxParkingEUR, note, ...rest } = a;
  return {
    ...rest,
    ...(coord !== undefined && { lngLat: coord }),
    ...(elevation !== undefined && { elevationFt: elevation }),
    ...(taxLandingEUR !== undefined && { taxLanding: taxLandingEUR }),
    ...(taxParkingEUR !== undefined && { taxParking: taxParkingEUR }),
    ...(note !== undefined && { notes: note }),
  };
}

export function useAerodromes() {
  return useQuery<Aerodrome[]>({
    queryKey: ['aerodromes'],
    queryFn: () => apiFetch<ApiAerodrome[]>('/aerodromes').then(list => list.map(fromApi)),
    staleTime: 120_000,
  });
}

export function useCreateAerodrome() {
  const qc = useQueryClient();
  return useMutation<Aerodrome, Error, Partial<Aerodrome>>({
    mutationFn: (data) => apiFetch<ApiAerodrome>('/aerodromes', { method: 'POST', body: JSON.stringify(toApi(data)) }).then(fromApi),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['aerodromes'] }),
  });
}

export function useUpdateAerodrome() {
  const qc = useQueryClient();
  return useMutation<Aerodrome, Error, { icao: string; data: Partial<Aerodrome> }>({
    mutationFn: ({ icao, data }) => apiFetch<ApiAerodrome>(`/aerodromes/${icao}`, { method: 'PATCH', body: JSON.stringify(toApi(data)) }).then(fromApi),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['aerodromes'] }),
  });
}

export function useDeleteAerodrome() {
  const qc = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: (icao) => apiFetch<void>(`/aerodromes/${icao}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['aerodromes'] }),
  });
}
