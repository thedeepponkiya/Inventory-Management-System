import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getFollowups, createFollowup, updateFollowup, deleteFollowup } from '../api/followups.api';
import type { CrmFollowupPayload } from '../types/followup.types';

const FOLLOWUPS_KEY = ['crm', 'followups'];

export function useFollowupsQuery(leadId?: string) {
    return useQuery({
        queryKey: [...FOLLOWUPS_KEY, leadId ?? 'all'],
        queryFn: () => getFollowups(leadId),
    });
}

export function useCreateFollowup() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (payload: CrmFollowupPayload) => createFollowup(payload),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: FOLLOWUPS_KEY }),
    });
}

export function useUpdateFollowup() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, payload }: { id: string; payload: Partial<CrmFollowupPayload> & { status?: 'Pending' | 'Completed' } }) => updateFollowup(id, payload),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: FOLLOWUPS_KEY }),
    });
}

export function useDeleteFollowup() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => deleteFollowup(id),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: FOLLOWUPS_KEY }),
    });
}
