import { useMemo, useState } from 'react';
import { Button } from 'primereact/button';
import { HiOutlineArrowDownTray } from 'react-icons/hi2';
import FilterBar, { type FilterField } from '../../../common/commonComponents/filterBar/FilterBar';
import DataTable, { type ColumnConfig } from '../../../common/commonComponents/dataTable/DataTable';
import StatusBadge from '../../../common/commonComponents/statusBadge/StatusBadge';
import { useLeadsQuery } from '../hooks/useLeadsQuery';
import { useStagesQuery } from '../hooks/useStagesQuery';
import { useSourcesQuery } from '../hooks/useSourcesQuery';
import { useCampaignsQuery } from '../hooks/useCampaignsQuery';
import { exportLeadsReportPdf } from '../utils/crmReportPdf';
import { crmQuickActions } from '../crmQuickActions';
import type { CrmLead } from '../types/lead.types';
import type { CrmStage } from '../types/stage.types';

interface StageSummaryRow {
    stage: CrmStage;
    count: number;
    totalValue: number;
}

const outcomeVariant: Record<CrmStage['outcome'], 'success' | 'danger' | 'info'> = {
    won: 'success',
    lost: 'danger',
    open: 'info',
};

const CrmReportsPage = () => {
    const { data: leads = [], isLoading } = useLeadsQuery();
    const { data: stages = [] } = useStagesQuery();
    const { data: sources = [] } = useSourcesQuery();
    const { data: campaigns = [] } = useCampaignsQuery();

    const [filters, setFilters] = useState<Record<string, unknown>>({
        dateRange: null, stageId: null, sourceId: null, campaignId: null, status: null,
    });

    const filterFields: FilterField[] = [
        { key: 'dateRange', type: 'dateRange', label: 'Created Between', placeholder: 'Select date range' },
        { key: 'stageId', type: 'select', label: 'Stage', options: stages.map((s) => ({ label: s.name, value: s.id })) },
        { key: 'sourceId', type: 'select', label: 'Source', options: sources.map((s) => ({ label: s.name, value: s.id })) },
        { key: 'campaignId', type: 'select', label: 'Campaign', options: campaigns.map((c) => ({ label: c.name, value: c.id })) },
        { key: 'status', type: 'select', label: 'Status', options: [{ label: 'Active', value: 'Active' }, { label: 'Archived', value: 'Archived' }] },
    ];

    const filteredLeads = useMemo(() => {
        const dateRange = filters.dateRange as Date[] | null;
        const rangeStart = dateRange?.[0] ?? null;
        const rangeEnd = dateRange?.[1] ?? null;

        return leads.filter((lead) => {
            const createdAt = new Date(lead.createdAt);
            const matchesStart = !rangeStart || createdAt >= new Date(rangeStart.getFullYear(), rangeStart.getMonth(), rangeStart.getDate());
            const matchesEnd = !rangeEnd || createdAt <= new Date(rangeEnd.getFullYear(), rangeEnd.getMonth(), rangeEnd.getDate(), 23, 59, 59, 999);
            const matchesStage = !filters.stageId || lead.stageId === filters.stageId;
            const matchesSource = !filters.sourceId || lead.sourceId === filters.sourceId;
            const matchesCampaign = !filters.campaignId || lead.campaignId === filters.campaignId;
            const matchesStatus = !filters.status || lead.status === filters.status;
            return matchesStart && matchesEnd && matchesStage && matchesSource && matchesCampaign && matchesStatus;
        });
    }, [leads, filters]);

    const stageSummary: StageSummaryRow[] = useMemo(() => {
        const sortedStages = [...stages].sort((a, b) => a.sortOrder - b.sortOrder);
        return sortedStages
            .map((stage) => {
                const stageLeads = filteredLeads.filter((lead) => lead.stageId === stage.id);
                return { stage, count: stageLeads.length, totalValue: stageLeads.reduce((sum, lead) => sum + lead.value, 0) };
            })
            .filter((row) => row.count > 0);
    }, [filteredLeads, stages]);

    const filterSummary = useMemo(() => {
        const dateRange = filters.dateRange as Date[] | null;
        const parts: string[] = [];
        if (dateRange?.[0]) {
            const start = dateRange[0].toLocaleDateString('en-IN');
            const end = dateRange[1] ? dateRange[1].toLocaleDateString('en-IN') : start;
            parts.push(`Created ${start} - ${end}`);
        }
        if (filters.stageId) parts.push(`Stage: ${stages.find((s) => s.id === filters.stageId)?.name ?? ''}`);
        if (filters.sourceId) parts.push(`Source: ${sources.find((s) => s.id === filters.sourceId)?.name ?? ''}`);
        if (filters.campaignId) parts.push(`Campaign: ${campaigns.find((c) => c.id === filters.campaignId)?.name ?? ''}`);
        if (filters.status) parts.push(`Status: ${filters.status}`);
        return parts.length > 0 ? `Filters: ${parts.join(' | ')}` : 'Filters: None (all leads)';
    }, [filters, stages, sources, campaigns]);

    const stageSummaryColumns: ColumnConfig<StageSummaryRow>[] = [
        {
            field: 'stage',
            header: 'Stage',
            body: (row) => (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 600 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: row.stage.color, display: 'inline-block' }} />
                    {row.stage.name}
                </span>
            ),
        },
        { field: 'count', header: 'Lead Count' },
        { field: 'totalValue', header: 'Total Value', body: (row) => `Rs. ${row.totalValue.toLocaleString('en-IN')}` },
        { field: 'stage', key: 'stageOutcome', header: 'Outcome', body: (row) => <StatusBadge label={row.stage.outcome} variant={outcomeVariant[row.stage.outcome]} /> },
    ];

    const leadColumns: ColumnConfig<CrmLead>[] = [
        { field: 'leadCode', header: 'Lead Code', body: (row) => `#${row.leadCode}` },
        { field: 'name', header: 'Name' },
        { field: 'company', header: 'Company', body: (row) => row.company ?? '—' },
        { field: 'stageName', header: 'Stage', body: (row) => row.stageName ?? '—' },
        { field: 'sourceName', header: 'Source', body: (row) => row.sourceName ?? '—' },
        { field: 'campaignName', header: 'Campaign', body: (row) => row.campaignName ?? '—' },
        { field: 'assignedToName', header: 'Assigned To', body: (row) => row.assignedToName ?? '—' },
        { field: 'value', header: 'Value', body: (row) => `Rs. ${row.value.toLocaleString('en-IN')}` },
        { field: 'status', header: 'Status', filter: false, body: (row) => <StatusBadge label={row.status} variant={row.status === 'Active' ? 'success' : 'neutral'} /> },
        { field: 'createdAt', header: 'Created', body: (row) => new Date(row.createdAt).toLocaleDateString('en-IN') },
    ];

    return (
        <div>
            <FilterBar
                fields={filterFields}
                values={filters}
                onChange={(key, value) => setFilters((prev) => ({ ...prev, [key]: value }))}
                onReset={() => setFilters({ dateRange: null, stageId: null, sourceId: null, campaignId: null, status: null })}
                actions={(
                    <Button
                        label="Export to PDF"
                        icon={<HiOutlineArrowDownTray className="mr-2" />}
                        outlined
                        onClick={() => exportLeadsReportPdf(filteredLeads, filterSummary)}
                        disabled={filteredLeads.length === 0}
                    />
                )}
                quickActions={crmQuickActions}
            />

            {/* Each table gets its own block-level wrapper so it isn't a flex sibling of the
                other - the page root inherits display:flex/flex-direction:column from the
                app shell, and DataTable's own CSS (flex:1 1 auto + overflow:hidden) means two
                un-wrapped DataTables stacked directly would compete for shared flex space and
                clip instead of each sizing to its own content. */}
            <div>
                <h3 style={{ fontSize: '14px', margin: '16px 0 8px' }}>Summary by Stage</h3>
                <DataTable value={stageSummary} columns={stageSummaryColumns} paginator={false} loading={isLoading} dataKey="stage.id" />
            </div>

            <div>
                <h3 style={{ fontSize: '14px', margin: '20px 0 8px' }}>Filtered Leads ({filteredLeads.length})</h3>
                <DataTable value={filteredLeads} columns={leadColumns} loading={isLoading} dataKey="id" />
            </div>
        </div>
    );
};
export default CrmReportsPage;
