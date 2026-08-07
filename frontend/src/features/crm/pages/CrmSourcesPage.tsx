import { useMemo, useRef, useState } from 'react';
import { Button } from 'primereact/button';
import { Toast } from 'primereact/toast';
import { confirmDialog } from 'primereact/confirmdialog';
import { HiOutlinePlus, HiOutlineTrash } from 'react-icons/hi2';
import FilterBar, { type FilterField } from '../../../common/commonComponents/filterBar/FilterBar';
import DataTable, { type ColumnConfig } from '../../../common/commonComponents/dataTable/DataTable';
import StatusBadge from '../../../common/commonComponents/statusBadge/StatusBadge';
import { showToast } from '../../../common/commonFunctions/commonFunction';
import { useSourcesQuery, useCreateSource, useUpdateSource, useDeleteSource } from '../hooks/useSourcesQuery';
import SourceFormDialog from '../components/SourceFormDialog';
import { crmQuickActions } from '../crmQuickActions';
import type { CrmSource, CrmSourcePayload } from '../types/source.types';

const CrmSourcesPage = () => {
    const toast = useRef<Toast>(null);
    const { data: sources = [], isLoading } = useSourcesQuery();
    const createSource = useCreateSource();
    const updateSource = useUpdateSource();
    const deleteSource = useDeleteSource();

    const [filters, setFilters] = useState<Record<string, unknown>>({ search: '' });
    const [dialogVisible, setDialogVisible] = useState(false);
    const [editing, setEditing] = useState<CrmSource | null>(null);

    const filterFields: FilterField[] = [
        { key: 'search', type: 'search', label: 'Search', placeholder: 'Search by source name' },
    ];

    const filteredSources = useMemo(() => {
        const search = (filters.search as string)?.toLowerCase() ?? '';
        return sources.filter((source) => !search || source.name.toLowerCase().includes(search));
    }, [sources, filters]);

    const openAddDialog = () => {
        setEditing(null);
        setDialogVisible(true);
    };

    const openEditDialog = (source: CrmSource) => {
        setEditing(source);
        setDialogVisible(true);
    };

    const handleSave = (payload: CrmSourcePayload) => {
        if (editing) {
            updateSource.mutate(
                { id: editing.id, payload },
                {
                    onSuccess: () => {
                        showToast(toast, 'success', 'Updated', 'Source updated successfully');
                        setDialogVisible(false);
                    },
                    onError: (err) => showToast(toast, 'error', 'Error', err instanceof Error ? err.message : 'Something went wrong'),
                },
            );
        } else {
            createSource.mutate(payload, {
                onSuccess: () => {
                    showToast(toast, 'success', 'Created', 'Source created successfully');
                    setDialogVisible(false);
                },
                onError: (err) => showToast(toast, 'error', 'Error', err instanceof Error ? err.message : 'Something went wrong'),
            });
        }
    };

    const handleDelete = (source: CrmSource) => {
        confirmDialog({
            message: `Delete source "${source.name}"? This cannot be undone.`,
            header: 'Delete Source',
            icon: 'pi pi-exclamation-triangle',
            acceptClassName: 'p-button-danger',
            accept: () => {
                deleteSource.mutate(source.id, {
                    onSuccess: () => showToast(toast, 'success', 'Deleted', 'Source deleted successfully'),
                    onError: (err) => showToast(toast, 'error', 'Error', err instanceof Error ? err.message : 'Something went wrong'),
                });
            },
        });
    };

    const columns: ColumnConfig<CrmSource>[] = [
        { field: 'name', header: 'Source Name', body: (row) => <span className="common-table-id-link" onClick={() => openEditDialog(row)}>{row.name}</span> },
        { field: 'type', header: 'Type' },
        { field: 'status', header: 'Status', filter: false, body: (row) => <StatusBadge label={row.status} variant={row.status === 'Active' ? 'success' : 'neutral'} /> },
    ];

    const actionTemplate = (row: CrmSource) => (
        <div className="data-table-actions">
            <HiOutlineTrash size={16} color="var(--accent-danger-text)" title="Delete" onClick={() => handleDelete(row)} />
        </div>
    );

    return (
        <div>
            <Toast ref={toast} />
            <FilterBar
                fields={filterFields}
                values={filters}
                onChange={(key, value) => setFilters((prev) => ({ ...prev, [key]: value }))}
                onReset={() => setFilters({ search: '' })}
                actions={<Button label="Add Source" icon={<HiOutlinePlus className="mr-2" />} onClick={openAddDialog} outlined />}
                quickActions={crmQuickActions}
            />
            <DataTable value={filteredSources} columns={columns} loading={isLoading} actionBodyTemplate={actionTemplate} dataKey="id" />
            <SourceFormDialog visible={dialogVisible} editing={editing} onHide={() => setDialogVisible(false)} onSave={handleSave} />
        </div>
    );
};
export default CrmSourcesPage;