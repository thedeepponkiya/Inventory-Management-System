import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getStages, createStage, updateStage, deleteStage } from '../api/stages.api';
import type { CrmStagePayload } from '../types/stage.types';

const STAGES_KEY = ['crm', 'stages'];

export function useStagesQuery() {
    return useQuery({ queryKey: STAGES_KEY, queryFn: getStages });
}

export function useCreateStage() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (payload: Partial<CrmStagePayload>) => createStage(payload),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: STAGES_KEY }),
    });
}

export function useUpdateStage() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, payload }: { id: string; payload: Partial<CrmStagePayload> }) => updateStage(id, payload),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: STAGES_KEY }),
    });
}

export function useDeleteStage() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => deleteStage(id),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: STAGES_KEY }),
    });
}
