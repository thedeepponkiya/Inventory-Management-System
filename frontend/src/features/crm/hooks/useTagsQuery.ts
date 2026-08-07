import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getLeadTags, addLeadTag, removeLeadTag } from '../api/tags.api';

export function useLeadTagsQuery(leadId: string | undefined) {
    return useQuery({
        queryKey: ['crm', 'tags', leadId],
        queryFn: () => getLeadTags(leadId as string),
        enabled: !!leadId,
    });
}

export function useAddLeadTag(leadId: string | undefined) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (name: string) => addLeadTag(leadId as string, name),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['crm', 'tags', leadId] }),
    });
}

export function useRemoveLeadTag(leadId: string | undefined) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (tagId: string) => removeLeadTag(leadId as string, tagId),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['crm', 'tags', leadId] }),
    });
}
