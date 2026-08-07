import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getNotes, createNote, deleteNote } from '../api/notes.api';
import type { CrmNotePayload } from '../types/note.types';

export function useNotesQuery(leadId: string | undefined) {
    return useQuery({
        queryKey: ['crm', 'notes', leadId],
        queryFn: () => getNotes(leadId as string),
        enabled: !!leadId,
    });
}

export function useCreateNote() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (payload: CrmNotePayload) => createNote(payload),
        onSuccess: (_data, variables) => queryClient.invalidateQueries({ queryKey: ['crm', 'notes', variables.leadId] }),
    });
}

export function useDeleteNote(leadId: string | undefined) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => deleteNote(id),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['crm', 'notes', leadId] }),
    });
}
