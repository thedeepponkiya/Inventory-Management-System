import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getCampaigns, createCampaign, updateCampaign, deleteCampaign } from '../api/campaigns.api';
import type { CrmCampaignPayload } from '../types/campaign.types';

const CAMPAIGNS_KEY = ['crm', 'campaigns'];

export function useCampaignsQuery() {
    return useQuery({ queryKey: CAMPAIGNS_KEY, queryFn: getCampaigns });
}

export function useCreateCampaign() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (payload: Partial<CrmCampaignPayload>) => createCampaign(payload),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: CAMPAIGNS_KEY }),
    });
}

export function useUpdateCampaign() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, payload }: { id: string; payload: Partial<CrmCampaignPayload> }) => updateCampaign(id, payload),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: CAMPAIGNS_KEY }),
    });
}

export function useDeleteCampaign() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => deleteCampaign(id),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: CAMPAIGNS_KEY }),
    });
}
