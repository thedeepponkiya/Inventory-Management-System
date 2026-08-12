import { useState } from 'react';
import type { RefObject } from 'react';
import { confirmDialog } from 'primereact/confirmdialog';
import type { Toast } from 'primereact/toast';
import { showToast } from './commonFunction';

interface UseBulkDeleteOptions<T> {
    getId: (row: T) => number;
    deleteOne: (id: number) => Promise<void>;
    onDeleted: () => void;
    toast: RefObject<Toast | null>;
    // Lowercase, plural, used in both the confirm dialog and the success toast
    // (e.g. "locations", "raw SKUs", "sales orders").
    entityNamePlural: string;
    // Optional per-row guard for rows the backend would reject outright (e.g. a Completed
    // BOM - see Bom.tsx). Selection itself stays enabled for every row (unlike disabling the
    // checkbox), so the guarded ones can still be picked; they're just filtered out of the
    // actual delete request and called out in a toast instead, rather than silently failing
    // the whole batch the way a single rejected row inside Promise.all otherwise would.
    canDelete?: (row: T) => boolean;
    // Shown when handleBulkDelete filters out one or more canDelete-rejected rows. Defaults to
    // a generic message if omitted.
    cannotDeleteMessage?: string;
}

// Shared by every master/list page's DataTable (see DataTable.tsx's `selectable` prop) so
// none of them re-implement the same select-many -> confirm -> loop-delete -> toast -> refetch
// sequence. Deletes run in parallel via Promise.all against each page's own existing
// single-delete function/endpoint - there's no bulk-delete API, so this is N individual
// requests, same cost as a user deleting them one at a time.
export function useBulkDelete<T>({ getId, deleteOne, onDeleted, toast, entityNamePlural, canDelete, cannotDeleteMessage }: UseBulkDeleteOptions<T>) {
    const [selectedRows, setSelectedRows] = useState<T[]>([]);
    const [bulkDeleting, setBulkDeleting] = useState(false);

    const handleBulkDelete = () => {
        if (selectedRows.length === 0) return;

        const deletableRows = canDelete ? selectedRows.filter(canDelete) : selectedRows;
        const skippedCount = selectedRows.length - deletableRows.length;
        if (skippedCount > 0) {
            showToast(toast, 'warn', 'Cannot Delete', cannotDeleteMessage ?? `${skippedCount} selected ${entityNamePlural} can't be deleted and ${skippedCount === 1 ? 'was' : 'were'} skipped.`);
        }
        if (deletableRows.length === 0) return;

        const count = deletableRows.length;
        confirmDialog({
            message: `Delete ${count} selected ${entityNamePlural}? This cannot be undone.`,
            header: `Delete ${count} ${entityNamePlural}`,
            icon: 'pi pi-exclamation-triangle',
            acceptClassName: 'p-button-danger',
            accept: async () => {
                setBulkDeleting(true);
                try {
                    await Promise.all(deletableRows.map((row) => deleteOne(getId(row))));
                    showToast(toast, 'success', 'Deleted', `${count} ${entityNamePlural} deleted successfully`);
                    setSelectedRows([]);
                    onDeleted();
                } catch (err) {
                    showToast(toast, 'error', 'Error', err instanceof Error ? err.message : 'Something went wrong');
                } finally {
                    setBulkDeleting(false);
                }
            },
        });
    };

    return { selectedRows, setSelectedRows, handleBulkDelete, bulkDeleting };
}
