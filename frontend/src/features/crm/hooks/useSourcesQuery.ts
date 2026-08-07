import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getSources, createSource, updateSource, deleteSource } from '../api/sources.api';
import type { CrmSourcePayload } from '../types/source.types';

const SOURCES_KEY = ['crm', 'sources'];

export function useSourcesQuery() {
    return useQuery({ queryKey: SOURCES_KEY, queryFn: getSources });
}

export function useCreateSource() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (payload: CrmSourcePayload) => createSource(payload),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: SOURCES_KEY }),
    });
}

export function useUpdateSource() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, payload }: { id: string; payload: Partial<CrmSourcePayload> }) => updateSource(id, payload),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: SOURCES_KEY }),
    });
}

export function useDeleteSource() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => deleteSource(id),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: SOURCES_KEY }),
    });
}
