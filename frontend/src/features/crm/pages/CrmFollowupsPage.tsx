import { useMemo, useRef, useState } from 'react';
import { Toast } from 'primereact/toast';
import { confirmDialog } from 'primereact/confirmdialog';
import { HiOutlineCheckCircle, HiOutlineTrash } from 'react-icons/hi2';
import { useAuthContext } from '../../../context/AuthContextDefinition';
import FilterBar, { type FilterField } from '../../../common/commonComponents/filterBar/FilterBar';
import DataTable, { type ColumnConfig, type DataTableHandle } from '../../../common/commonComponents/dataTable/DataTable';
import StatusBadge from '../../../common/commonComponents/statusBadge/StatusBadge';
import { showToast } from '../../../common/commonFunctions/commonFunction';
import { useFollowupsQuery, useUpdateFollowup, useDeleteFollowup } from '../hooks/useFollowupsQuery';
import { useLeadsQuery, useUpdateLead, useAssignableUsersQuery } from '../hooks/useLeadsQuery';
import { useCreateNote } from '../hooks/useNotesQuery';
import LeadDetailDrawer from '../components/LeadDetailDrawer';
import LeadFormDialog from '../components/LeadFormDialog';
import AssigneeAvatar from '../components/AssigneeAvatar';
import { crmQuickActions } from '../crmQuickActions';
import type { CrmFollowup } from '../types/followup.types';
import type { CrmLead, CrmLeadPayload } from '../types/lead.types';

interface FollowupRow extends CrmFollowup {
    leadName: string;
    leadCode: string;
    // The follow-up itself has no assignee of its own - this is the lead's own assignedTo,
    // same field the Leads Kanban/table already shows, so "who does this follow-up belong to"
    // reads the same way in both places.
    assignedTo: number | null;
    assignedToName: string;
}

const CrmFollowupsPage = () => {
    const toast = useRef<Toast>(null);
    const dataTableRef = useRef<DataTableHandle>(null);
    const { user } = useAuthContext();
    // Only Admin (or the hidden Super Admin account) may delete a follow-up - mirrors
    // CrmLeadsPage.tsx's canManageCrm. Marking one complete is a status update, not a
    // delete, so it stays available to every CRM role.
    const canManageCrm = user?.isHidden || user?.roleId === 'Admin';
    // Mirrors CrmLeadsPage.tsx's canEditLead - Sales User can view a lead from here but not
    // edit its own fields.
    const canEditLead = user?.roleId !== 'Sales User';
    // Mirrors CrmLeadsPage.tsx's canViewFollowups - Sales User now gets the drawer's
    // Follow-ups tab too.
    const canViewFollowups = true;
    const { data: followups = [], isLoading } = useFollowupsQuery();
    const { data: leads = [] } = useLeadsQuery();
    const { data: users = [] } = useAssignableUsersQuery();
    const updateFollowup = useUpdateFollowup();
    const deleteFollowup = useDeleteFollowup();
    const updateLead = useUpdateLead();
    const createNote = useCreateNote();

    const [filters, setFilters] = useState<Record<string, unknown>>({ search: '', status: null });
    const [drawerLead, setDrawerLead] = useState<CrmLead | null>(null);
    const [dialogVisible, setDialogVisible] = useState(false);
    const [editing, setEditing] = useState<CrmLead | null>(null);

    const rows: FollowupRow[] = useMemo(() => followups.map((f) => {
        const lead = leads.find((l) => l.id === f.leadId);
        return { ...f, leadName: lead?.name ?? '—', leadCode: lead?.leadCode ?? '—', assignedTo: lead?.assignedTo ?? null, assignedToName: lead?.assignedToName ?? '—' };
    }), [followups, leads]);

    const filterFields: FilterField[] = [
        { key: 'search', type: 'search', label: 'Search', placeholder: 'Search by lead name' },
    ];

    const filteredRows = useMemo(() => {
        const search = (filters.search as string)?.toLowerCase() ?? '';
        return rows.filter((row) => {
            const matchesSearch = !search || row.leadName.toLowerCase().includes(search);
            const matchesStatus = !filters.status || row.status === filters.status;
            return matchesSearch && matchesStatus;
        });
    }, [rows, filters]);

    const openLeadDrawer = (row: FollowupRow) => {
        const lead = leads.find((l) => l.id === row.leadId);
        if (lead) setDrawerLead(lead);
    };

    const handleMarkComplete = (row: FollowupRow) => {
        updateFollowup.mutate(
            { id: row.id, payload: { status: 'Completed' } },
            {
                onSuccess: () => showToast(toast, 'success', 'Updated', 'Follow-up marked complete'),
                onError: (err) => showToast(toast, 'error', 'Error', err instanceof Error ? err.message : 'Something went wrong'),
            },
        );
    };

    const handleDelete = (row: FollowupRow) => {
        confirmDialog({
            message: `Delete this follow-up for "${row.leadName}"? This cannot be undone.`,
            header: 'Delete Follow-up',
            icon: 'pi pi-exclamation-triangle',
            acceptClassName: 'p-button-danger',
            accept: () => {
                deleteFollowup.mutate(row.id, {
                    onSuccess: () => showToast(toast, 'success', 'Deleted', 'Follow-up deleted successfully'),
                    onError: (err) => showToast(toast, 'error', 'Error', err instanceof Error ? err.message : 'Something went wrong'),
                });
            },
        });
    };

    const columns: ColumnConfig<FollowupRow>[] = [
        { field: 'leadName', header: 'Lead', body: (row) => <span className="common-table-id-link" onClick={() => openLeadDrawer(row)}>{row.leadName}</span> },
        { field: 'assignedToName', header: 'Assigned To', body: (row) => <AssigneeAvatar userId={row.assignedTo} name={row.assignedToName} users={users} /> },
        { field: 'dueAt', header: 'Due At', body: (row) => new Date(row.dueAt).toLocaleString('en-IN') },
        { field: 'type', header: 'Type', filterType: 'dropdown', filterOptions: ['Call', 'Email', 'WhatsApp', 'Meeting', 'Other'] },
        { field: 'notes', header: 'Notes', filter: false, body: (row) => row.notes ?? '—' },
        {
            field: 'status',
            header: 'Status',
            filterType: 'dropdown',
            filterOptions: ['Pending', 'Completed'],
            body: (row) => <StatusBadge label={row.status} variant={row.status === 'Completed' ? 'success' : 'warning'} />,
        },
    ];

    const actionTemplate = (row: FollowupRow) => (
        <div className="data-table-actions" style={{ display: 'flex', gap: '12px' }}>
            {row.status === 'Pending' && (
                <HiOutlineCheckCircle size={16} color="var(--accent-success-text)" title="Mark Complete" onClick={() => handleMarkComplete(row)} />
            )}
            {canManageCrm && <HiOutlineTrash size={16} color="var(--accent-danger-text)" title="Delete" onClick={() => handleDelete(row)} />}
        </div>
    );

    const openEditDialog = (lead: CrmLead) => {
        setEditing(lead);
        setDialogVisible(true);
    };

    const handleSaveLead = (payload: CrmLeadPayload, notes: string) => {
        if (!editing) return;
        updateLead.mutate(
            { id: editing.id, payload },
            {
                onSuccess: () => {
                    showToast(toast, 'success', 'Updated', 'Lead updated successfully');
                    setDialogVisible(false);
                    if (notes) createNote.mutate({ leadId: editing.id, body: notes });
                },
                onError: (err) => showToast(toast, 'error', 'Error', err instanceof Error ? err.message : 'Something went wrong'),
            },
        );
    };

    return (
        <div>
            <Toast ref={toast} />
            <FilterBar
                fields={filterFields}
                values={filters}
                onChange={(key, value) => setFilters((prev) => ({ ...prev, [key]: value }))}
                onReset={() => {
                    setFilters({ search: '', status: null });
                    dataTableRef.current?.clearFilters();
                }}
                quickActions={crmQuickActions}
            />
            <DataTable ref={dataTableRef} value={filteredRows} columns={columns} loading={isLoading} actionBodyTemplate={actionTemplate} dataKey="id" />
            <LeadDetailDrawer
                visible={!!drawerLead}
                lead={drawerLead ? (leads.find((l) => l.id === drawerLead.id) ?? drawerLead) : null}
                onHide={() => setDrawerLead(null)}
                onEdit={openEditDialog}
                canEdit={canEditLead}
                showFollowupsTab={canViewFollowups}
            />
            <LeadFormDialog
                visible={dialogVisible}
                editing={editing}
                onHide={() => setDialogVisible(false)}
                onSave={handleSaveLead}
            />
        </div>
    );
};
export default CrmFollowupsPage;
