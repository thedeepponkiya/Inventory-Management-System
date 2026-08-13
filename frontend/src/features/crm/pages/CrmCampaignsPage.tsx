import { useMemo, useRef, useState } from 'react';
import { Button } from 'primereact/button';
import { Toast } from 'primereact/toast';
import { confirmDialog } from 'primereact/confirmdialog';
import { HiOutlinePlus, HiOutlineTrash } from 'react-icons/hi2';
import FilterBar, { type FilterField } from '../../../common/commonComponents/filterBar/FilterBar';
import DataTable, { type ColumnConfig, type DataTableHandle } from '../../../common/commonComponents/dataTable/DataTable';
import StatusBadge from '../../../common/commonComponents/statusBadge/StatusBadge';
import { showToast } from '../../../common/commonFunctions/commonFunction';
import { useCampaignsQuery, useCreateCampaign, useUpdateCampaign, useDeleteCampaign } from '../hooks/useCampaignsQuery';
import CampaignFormDialog from '../components/CampaignFormDialog';
import { crmQuickActions } from '../crmQuickActions';
import type { CrmCampaign, CrmCampaignPayload } from '../types/campaign.types';
import './CrmCampaignsPage.css';

const formatDate = (value: string | null) => (value ? new Date(value).toLocaleDateString('en-IN') : '—');

const CrmCampaignsPage = () => {
    const toast = useRef<Toast>(null);
    const dataTableRef = useRef<DataTableHandle>(null);
    const { data: campaigns = [], isLoading } = useCampaignsQuery();
    const createCampaign = useCreateCampaign();
    const updateCampaign = useUpdateCampaign();
    const deleteCampaign = useDeleteCampaign();

    const [filters, setFilters] = useState<Record<string, unknown>>({ search: '' });
    const [dialogVisible, setDialogVisible] = useState(false);
    const [editing, setEditing] = useState<CrmCampaign | null>(null);

    const filterFields: FilterField[] = [
        { key: 'search', type: 'search', label: 'Search', placeholder: 'Search by campaign name' },
    ];

    const filteredCampaigns = useMemo(() => {
        const search = (filters.search as string)?.toLowerCase() ?? '';
        return campaigns.filter((campaign) => !search || campaign.name.toLowerCase().includes(search));
    }, [campaigns, filters]);

    const openAddDialog = () => {
        setEditing(null);
        setDialogVisible(true);
    };

    const openEditDialog = (campaign: CrmCampaign) => {
        setEditing(campaign);
        setDialogVisible(true);
    };

    const handleSave = (payload: CrmCampaignPayload) => {
        if (editing) {
            updateCampaign.mutate(
                { id: editing.id, payload },
                {
                    onSuccess: () => {
                        showToast(toast, 'success', 'Updated', 'Campaign updated successfully');
                        setDialogVisible(false);
                    },
                    onError: (err) => showToast(toast, 'error', 'Error', err instanceof Error ? err.message : 'Something went wrong'),
                },
            );
        } else {
            createCampaign.mutate(payload, {
                onSuccess: () => {
                    showToast(toast, 'success', 'Created', 'Campaign created successfully');
                    setDialogVisible(false);
                },
                onError: (err) => showToast(toast, 'error', 'Error', err instanceof Error ? err.message : 'Something went wrong'),
            });
        }
    };

    const handleDelete = (campaign: CrmCampaign) => {
        confirmDialog({
            message: `Delete campaign "${campaign.name}"? This cannot be undone.`,
            header: 'Delete Campaign',
            icon: 'pi pi-exclamation-triangle',
            acceptClassName: 'p-button-danger',
            accept: () => {
                deleteCampaign.mutate(campaign.id, {
                    onSuccess: () => showToast(toast, 'success', 'Deleted', 'Campaign deleted successfully'),
                    onError: (err) => showToast(toast, 'error', 'Error', err instanceof Error ? err.message : 'Something went wrong'),
                });
            },
        });
    };

    const columns: ColumnConfig<CrmCampaign>[] = [
        {
            field: 'name',
            header: 'Campaign Name',
            body: (row) => (
                <span className="common-table-id-link" onClick={() => openEditDialog(row)}>
                    {row.name}
                    {row.metaCampaignId && <span className="crm-campaign-meta-badge" title="Synced from Meta">Meta</span>}
                </span>
            ),
        },
        { field: 'sourceName', header: 'Source', body: (row) => row.sourceName ?? '—' },
        { field: 'startDate', header: 'Start Date', filter: false, body: (row) => formatDate(row.startDate) },
        { field: 'endDate', header: 'End Date', filter: false, body: (row) => formatDate(row.endDate) },
        { field: 'budget', header: 'Budget', body: (row) => `Rs. ${row.budget.toLocaleString('en-IN')}` },
        { field: 'spend', header: 'Spend', filter: false, body: (row) => (row.spend !== null ? `Rs. ${row.spend.toLocaleString('en-IN')}` : '—') },
        { field: 'impressions', header: 'Impressions', filter: false, body: (row) => row.impressions?.toLocaleString('en-IN') ?? '—' },
        { field: 'clicks', header: 'Clicks', filter: false, body: (row) => row.clicks?.toLocaleString('en-IN') ?? '—' },
        {
            field: 'status',
            header: 'Status',
            filterType: 'dropdown',
            filterOptions: ['Active', 'Inactive'],
            body: (row) => <StatusBadge label={row.status} variant={row.status === 'Active' ? 'success' : 'neutral'} />,
        },
    ];

    const actionTemplate = (row: CrmCampaign) => (
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
                onReset={() => {
                    setFilters({ search: '' });
                    dataTableRef.current?.clearFilters();
                }}
                actions={<Button label="Add Campaign" icon={<HiOutlinePlus className="mr-2" />} onClick={openAddDialog} outlined />}
                quickActions={crmQuickActions}
            />
            <DataTable ref={dataTableRef} value={filteredCampaigns} columns={columns} loading={isLoading} actionBodyTemplate={actionTemplate} dataKey="id" />
            <CampaignFormDialog visible={dialogVisible} editing={editing} onHide={() => setDialogVisible(false)} onSave={handleSave} />
        </div>
    );
};
export default CrmCampaignsPage;
