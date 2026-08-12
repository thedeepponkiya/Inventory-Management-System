import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getMetaStatus, connectMeta, disconnectMeta, syncMetaLeads, syncMetaCampaigns } from '../api/metaIntegration.api';
import type { CrmMetaConnectPayload } from '../types/metaIntegration.types';

const META_STATUS_KEY = ['crm', 'meta', 'status'];
const CAMPAIGNS_KEY = ['crm', 'campaigns'];
const LEADS_KEY = ['crm', 'leads'];

export function useMetaStatusQuery() {
    return useQuery({ queryKey: META_STATUS_KEY, queryFn: getMetaStatus });
}

export function useConnectMeta() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (payload: CrmMetaConnectPayload) => connectMeta(payload),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: META_STATUS_KEY }),
    });
}

export function useDisconnectMeta() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: () => disconnectMeta(),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: META_STATUS_KEY }),
    });
}

export function useSyncMetaLeads() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: () => syncMetaLeads(),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: META_STATUS_KEY });
            queryClient.invalidateQueries({ queryKey: LEADS_KEY });
        },
    });
}

export function useSyncMetaCampaigns() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: () => syncMetaCampaigns(),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: META_STATUS_KEY });
            queryClient.invalidateQueries({ queryKey: CAMPAIGNS_KEY });
        },
    });
}
