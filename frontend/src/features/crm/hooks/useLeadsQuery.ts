import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getLeads, createLead, updateLead, deleteLead, reorderLeadsInStage } from '../api/leads.api';
import { getAssignableUsers } from '../api/users.api';
import type { CrmLead, CrmLeadPayload } from '../types/lead.types';

const LEADS_KEY = ['crm', 'leads'];
const ASSIGNABLE_USERS_KEY = ['crm', 'users'];

export function useLeadsQuery() {
    return useQuery({ queryKey: LEADS_KEY, queryFn: getLeads });
}

export function useAssignableUsersQuery() {
    return useQuery({ queryKey: ASSIGNABLE_USERS_KEY, queryFn: getAssignableUsers });
}

export function useCreateLead() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (payload: Partial<CrmLeadPayload>) => createLead(payload),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: LEADS_KEY }),
    });
}

export function useUpdateLead() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, payload }: { id: string; payload: Partial<CrmLeadPayload> }) => updateLead(id, payload),
        // Optimistic update so a Kanban drag moves the card instantly instead of waiting
        // on the round-trip - rolled back on error via the snapshot below.
        onMutate: async ({ id, payload }) => {
            await queryClient.cancelQueries({ queryKey: LEADS_KEY });
            const previousLeads = queryClient.getQueryData<CrmLead[]>(LEADS_KEY);
            queryClient.setQueryData<CrmLead[]>(LEADS_KEY, (leads) =>
                leads?.map((lead) => (lead.id === id ? { ...lead, ...payload } : lead)));
            return { previousLeads };
        },
        onError: (_err, _variables, context) => {
            if (context?.previousLeads) {
                queryClient.setQueryData(LEADS_KEY, context.previousLeads);
            }
        },
        onSettled: () => queryClient.invalidateQueries({ queryKey: LEADS_KEY }),
    });
}

export function useReorderLeads() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ stageId, orderedLeadIds }: { stageId: string | null; orderedLeadIds: string[] }) =>
            reorderLeadsInStage(stageId, orderedLeadIds),
        // Mirrors what the backend will do (stageId + sortOrder = index within
        // orderedLeadIds), so the dropped card's exact position is reflected immediately
        // instead of waiting on the round-trip - same reasoning as useUpdateLead above.
        onMutate: async ({ stageId, orderedLeadIds }) => {
            await queryClient.cancelQueries({ queryKey: LEADS_KEY });
            const previousLeads = queryClient.getQueryData<CrmLead[]>(LEADS_KEY);
            queryClient.setQueryData<CrmLead[]>(LEADS_KEY, (leads) =>
                leads?.map((lead) => {
                    const index = orderedLeadIds.indexOf(lead.id);
                    return index === -1 ? lead : { ...lead, stageId, sortOrder: index };
                }));
            return { previousLeads };
        },
        onError: (_err, _variables, context) => {
            if (context?.previousLeads) {
                queryClient.setQueryData(LEADS_KEY, context.previousLeads);
            }
        },
        onSettled: () => queryClient.invalidateQueries({ queryKey: LEADS_KEY }),
    });
}

export function useDeleteLead() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => deleteLead(id),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: LEADS_KEY }),
    });
}
