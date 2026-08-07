import { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Chart } from 'primereact/chart';
import { Dropdown } from 'primereact/dropdown';
import { Toast } from 'primereact/toast';
import type { Chart as ChartJSInstance } from 'chart.js';
import { MdOutlineDonutLarge, MdOutlinePieChart, MdOutlineBarChart } from 'react-icons/md';
import {
    HiOutlineBanknotes,
    HiOutlineChartBar,
    HiOutlineClock,
    HiOutlineExclamationTriangle,
    HiOutlineTrophy,
    HiOutlineUsers,
    HiOutlineXCircle,
} from 'react-icons/hi2';
import { KpiCardRow } from '../../../common/commonComponents/kpiCard/KpiCard';
import DataTable, { type ColumnConfig } from '../../../common/commonComponents/dataTable/DataTable';
import { showToast } from '../../../common/commonFunctions/commonFunction';
import { pieColors, trendChartOptions } from '../../../components/dashboard/dashboardUtils';
import { useLeadsQuery, useUpdateLead } from '../hooks/useLeadsQuery';
import { useCreateNote } from '../hooks/useNotesQuery';
import { useStagesQuery } from '../hooks/useStagesQuery';
import { useFollowupsQuery } from '../hooks/useFollowupsQuery';
import LeadDetailDrawer from '../components/LeadDetailDrawer';
import LeadFormDialog from '../components/LeadFormDialog';
import { PERIOD_OPTIONS, getPeriodRange } from '../utils/period';
import type { CrmLead, CrmLeadPayload } from '../types/lead.types';
import type { CrmFollowup } from '../types/followup.types';
import './CrmDashboardPage.css';

interface FollowupRow extends CrmFollowup {
    leadName: string;
    isOverdue: boolean;
}

const CrmDashboardPage = () => {
    const navigate = useNavigate();
    const toast = useRef<Toast>(null);
    const { data: leads = [] } = useLeadsQuery();
    const { data: stages = [] } = useStagesQuery();
    const { data: followups = [] } = useFollowupsQuery();
    const updateLead = useUpdateLead();
    const createNote = useCreateNote();

    const [drawerLead, setDrawerLead] = useState<CrmLead | null>(null);
    const [dialogVisible, setDialogVisible] = useState(false);
    const [editing, setEditing] = useState<CrmLead | null>(null);
    const [stagePeriod, setStagePeriod] = useState('This Month');
    const [sourceView, setSourceView] = useState<'donut' | 'pie' | 'bar'>('donut');
    const [sourcePeriod, setSourcePeriod] = useState('This Month');

    const stageById = useMemo(() => new Map(stages.map((s) => [s.id, s])), [stages]);

    const kpis = useMemo(() => {
        const totalLeads = leads.length;

        const openPipelineValue = leads.reduce((sum, lead) => {
            const stage = lead.stageId ? stageById.get(lead.stageId) : null;
            const isOpen = !stage || stage.outcome === 'open';
            return isOpen ? sum + lead.value : sum;
        }, 0);

        const won = leads.filter((lead) => lead.stageId && stageById.get(lead.stageId)?.outcome === 'won').length;
        const lost = leads.filter((lead) => lead.stageId && stageById.get(lead.stageId)?.outcome === 'lost').length;

        const now = new Date();
        const overdueFollowups = followups.filter((f) => f.status === 'Pending' && new Date(f.dueAt) < now).length;

        return { totalLeads, openPipelineValue, won, lost, overdueFollowups };
    }, [leads, stageById, followups]);

    const stageChartData = useMemo(() => {
        const { start, end } = getPeriodRange(stagePeriod);
        const periodLeads = leads.filter((lead) => {
            const createdAt = new Date(lead.createdAt);
            return createdAt >= start && createdAt <= end;
        });

        const sortedStages = [...stages].sort((a, b) => a.sortOrder - b.sortOrder);
        const unassignedCount = periodLeads.filter((lead) => !lead.stageId).length;

        const labels: string[] = [];
        const counts: number[] = [];
        const colors: string[] = [];

        if (unassignedCount > 0) {
            labels.push('Unassigned');
            counts.push(unassignedCount);
            colors.push('#94A3B8');
        }
        sortedStages.forEach((stage) => {
            labels.push(stage.name);
            counts.push(periodLeads.filter((lead) => lead.stageId === stage.id).length);
            colors.push(stage.color);
        });

        return {
            labels,
            datasets: [{ label: 'Leads', data: counts, backgroundColor: colors, borderRadius: 4 }],
        };
    }, [leads, stages, stagePeriod]);

    // Every real source, by name - no top-N folding into "Other". The legend below is a
    // scrollable HTML list (not Chart.js's own canvas-drawn legend), so showing all of them
    // doesn't turn into an unreadable wall of text - same approach as StockDistribution.tsx's
    // "Location Wise SKU" chart.
    const sourceEntries = useMemo(() => {
        const { start, end } = getPeriodRange(sourcePeriod);
        const periodLeads = leads.filter((lead) => {
            const createdAt = new Date(lead.createdAt);
            return createdAt >= start && createdAt <= end;
        });

        const totals = new Map<string, number>();
        periodLeads.forEach((lead) => {
            const name = lead.sourceName ?? 'Unknown';
            totals.set(name, (totals.get(name) ?? 0) + 1);
        });
        return Array.from(totals.entries()).sort((a, b) => b[1] - a[1]);
    }, [leads, sourcePeriod]);

    const sourceColors = useMemo(
        () => sourceEntries.map((_, index) => pieColors[index % pieColors.length]),
        [sourceEntries],
    );

    const sourceDonutData = useMemo(() => ({
        labels: sourceEntries.map(([label]) => label),
        datasets: [{ data: sourceEntries.map(([, value]) => value), backgroundColor: sourceColors, borderWidth: 0, borderRadius: 8, spacing: 3, hoverOffset: 6 }],
    }), [sourceEntries, sourceColors]);

    const sourcePieData = useMemo(() => ({
        labels: sourceEntries.map(([label]) => label),
        datasets: [{ data: sourceEntries.map(([, value]) => value), backgroundColor: sourceColors, borderWidth: 0 }],
    }), [sourceEntries, sourceColors]);

    const sourceBarData = useMemo(() => ({
        labels: sourceEntries.map(([label]) => label),
        datasets: [{ label: 'Leads', data: sourceEntries.map(([, value]) => value), backgroundColor: sourceColors, borderRadius: 4, barThickness: 22 }],
    }), [sourceEntries, sourceColors]);

    const totalSourceLeads = useMemo(() => sourceEntries.reduce((sum, [, value]) => sum + value, 0), [sourceEntries]);

    const sourceCenterTextPlugin = useMemo(() => ({
        id: 'centerText',
        afterDraw: (chart: ChartJSInstance) => {
            const { ctx, chartArea } = chart;
            if (!chartArea) return;
            const centerX = (chartArea.left + chartArea.right) / 2;
            const centerY = (chartArea.top + chartArea.bottom) / 2;
            ctx.save();
            ctx.font = '600 14px Inter, system-ui, sans-serif';
            ctx.fillStyle = '#0f172a';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(`Total: ${totalSourceLeads}`, centerX, centerY);
            ctx.restore();
        },
    }), [totalSourceLeads]);

    const sourceSliceOptions = {
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            tooltip: { callbacks: { label: (context: { label?: string; parsed: number }) => `${context.label}: ${context.parsed} Leads` } },
        },
    };
    const sourceDonutOptions = { ...sourceSliceOptions, cutout: '68%' };
    const sourceBarOptions = {
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            tooltip: { callbacks: { label: (context: { parsed: { y: number } }) => `${context.parsed.y} Leads` } },
        },
        scales: { x: { grid: { display: false } }, y: { grid: { color: '#f1f5f9' }, ticks: { precision: 0 } } },
    };

    const upcomingFollowups: FollowupRow[] = useMemo(() => {
        const now = new Date();
        return followups
            .filter((f) => f.status === 'Pending')
            .sort((a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime())
            .slice(0, 8)
            .map((f) => {
                const lead = leads.find((l) => l.id === f.leadId);
                return { ...f, leadName: lead?.name ?? '—', isOverdue: new Date(f.dueAt) < now };
            });
    }, [followups, leads]);

    const recentLeads = useMemo(
        () => [...leads].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 6),
        [leads],
    );

    const openLeadDrawer = (leadId: string) => {
        const lead = leads.find((l) => l.id === leadId);
        if (lead) setDrawerLead(lead);
    };

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

    const followupColumns: ColumnConfig<FollowupRow>[] = [
        {
            field: 'leadName',
            header: 'Lead',
            body: (row) => <span className="common-table-id-link" onClick={() => openLeadDrawer(row.leadId)}>{row.leadName}</span>,
        },
        {
            field: 'dueAt',
            header: 'Due At',
            body: (row) => (
                <span className={row.isOverdue ? 'crm-dashboard-followup-overdue' : ''}>
                    {new Date(row.dueAt).toLocaleString('en-IN')}
                </span>
            ),
        },
        { field: 'type', header: 'Type' },
    ];

    const leadColumns: ColumnConfig<CrmLead>[] = [
        {
            field: 'name',
            header: 'Name',
            body: (row) => <span className="common-table-id-link" onClick={() => openLeadDrawer(row.id)}>{row.name}</span>,
        },
        {
            field: 'stageName',
            header: 'Stage',
            body: (row) => (row.stageName ? (
                <span className="crm-dashboard-lead-stage">
                    <span className="crm-dashboard-lead-stage-dot" style={{ background: row.stageColor ?? '#64748B' }} />
                    {row.stageName}
                </span>
            ) : '—'),
        },
        { field: 'value', header: 'Value', body: (row) => `Rs. ${row.value.toLocaleString('en-IN')}` },
    ];

    return (
        <div className="crm-dashboard-page">
            <Toast ref={toast} />

            <div className="crm-dashboard-kpis">
                <KpiCardRow
                    columns={5}
                    items={[
                        { icon: HiOutlineUsers, label: 'Total Leads', value: kpis.totalLeads, iconBg: '#dbeafe', iconColor: '#2563eb', sublabel: 'All leads in your pipeline', linkLabel: 'View all leads', onClick: () => navigate('/crm/leads') },
                        { icon: HiOutlineBanknotes, label: 'Open Pipeline Value', value: `Rs. ${kpis.openPipelineValue.toLocaleString('en-IN')}`, iconBg: '#dcfce7', iconColor: '#16a34a', sublabel: 'Active deals not yet closed', linkLabel: 'View pipeline', onClick: () => navigate('/crm/leads') },
                        { icon: HiOutlineTrophy, label: 'Won', value: kpis.won, iconBg: '#dcfce7', iconColor: '#16a34a', sublabel: 'Deals marked Won', linkLabel: 'View leads', onClick: () => navigate('/crm/leads') },
                        { icon: HiOutlineXCircle, label: 'Lost', value: kpis.lost, iconBg: '#fee2e2', iconColor: '#dc2626', sublabel: 'Deals marked Lost', linkLabel: 'View leads', onClick: () => navigate('/crm/leads') },
                        { icon: HiOutlineExclamationTriangle, label: 'Overdue Follow-ups', value: kpis.overdueFollowups, iconBg: '#fef3c7', iconColor: '#d97706', sublabel: 'Pending follow-ups past due', linkLabel: 'View follow-ups', onClick: () => navigate('/crm/followups') },
                    ]}
                />
            </div>

            <div className="crm-dashboard-overview-grid">
                <div className="crm-dashboard-card">
                    <div className="crm-dashboard-card-header">
                        <h2><HiOutlineChartBar size={18} className="crm-dashboard-card-header-icon" />Leads by Stage</h2>
                        <div className="crm-dashboard-card-header-actions">
                            <Dropdown
                                value={stagePeriod}
                                onChange={(e) => setStagePeriod(e.value)}
                                options={PERIOD_OPTIONS}
                                className="crm-dashboard-period-dropdown"
                            />
                        </div>
                    </div>
                    {stageChartData.labels.length > 0 ? (
                        <Chart key={`stage-${stagePeriod}-${leads.length}`} type="bar" data={stageChartData} options={trendChartOptions} className="crm-dashboard-chart" />
                    ) : <p className="crm-dashboard-empty-state">No leads in this period.</p>}
                </div>
                <div className="crm-dashboard-card">
                    <div className="crm-dashboard-card-header">
                        <h2><HiOutlineChartBar size={18} className="crm-dashboard-card-header-icon" />Leads by Source</h2>
                        <div className="crm-dashboard-card-header-actions">
                            <Dropdown
                                value={sourcePeriod}
                                onChange={(e) => setSourcePeriod(e.value)}
                                options={PERIOD_OPTIONS}
                                className="crm-dashboard-period-dropdown"
                            />
                            <div className="crm-dashboard-chart-type-toggle">
                                <button type="button" className={`crm-dashboard-chart-type-btn${sourceView === 'donut' ? ' crm-dashboard-chart-type-btn--active' : ''}`} onClick={() => setSourceView('donut')} title="Donut chart">
                                    <MdOutlineDonutLarge size={16} />
                                </button>
                                <button type="button" className={`crm-dashboard-chart-type-btn${sourceView === 'pie' ? ' crm-dashboard-chart-type-btn--active' : ''}`} onClick={() => setSourceView('pie')} title="Pie chart">
                                    <MdOutlinePieChart size={16} />
                                </button>
                                <button type="button" className={`crm-dashboard-chart-type-btn${sourceView === 'bar' ? ' crm-dashboard-chart-type-btn--active' : ''}`} onClick={() => setSourceView('bar')} title="Bar chart">
                                    <MdOutlineBarChart size={16} />
                                </button>
                            </div>
                        </div>
                    </div>

                    {sourceEntries.length === 0 && <p className="crm-dashboard-empty-state">No leads in this period.</p>}

                    {sourceEntries.length > 0 && sourceView === 'donut' && (
                        <div className="crm-dashboard-source-row">
                            <Chart key={`source-donut-${sourcePeriod}-${leads.length}`} type="doughnut" data={sourceDonutData} options={sourceDonutOptions} plugins={[sourceCenterTextPlugin]} className="crm-dashboard-pie-chart" />
                            <div className="crm-dashboard-legend">
                                {sourceEntries.map(([label, value], index) => (
                                    <div className="crm-dashboard-legend-item" key={label}>
                                        <span className="crm-dashboard-legend-swatch" style={{ background: sourceColors[index] }} />
                                        <span className="crm-dashboard-legend-label">{label}</span>
                                        <span className="crm-dashboard-legend-count">{value} Leads</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {sourceEntries.length > 0 && sourceView === 'pie' && (
                        <div className="crm-dashboard-source-row">
                            <Chart key={`source-pie-${sourcePeriod}-${leads.length}`} type="pie" data={sourcePieData} options={sourceSliceOptions} className="crm-dashboard-pie-chart" />
                            <div className="crm-dashboard-legend">
                                {sourceEntries.map(([label, value], index) => (
                                    <div className="crm-dashboard-legend-item" key={label}>
                                        <span className="crm-dashboard-legend-swatch" style={{ background: sourceColors[index] }} />
                                        <span className="crm-dashboard-legend-label">{label}</span>
                                        <span className="crm-dashboard-legend-count">{value} Leads</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {sourceEntries.length > 0 && sourceView === 'bar' && (
                        <Chart key={`source-bar-${sourcePeriod}-${leads.length}`} type="bar" data={sourceBarData} options={sourceBarOptions} className="crm-dashboard-chart" />
                    )}
                </div>
            </div>

            <div className="crm-dashboard-grid">
                <div className="crm-dashboard-card">
                    <div className="crm-dashboard-card-header">
                        <h2><HiOutlineClock size={18} className="crm-dashboard-card-header-icon" />Upcoming Follow-ups</h2>
                    </div>
                    <DataTable value={upcomingFollowups} columns={followupColumns} paginator={false} dataKey="id" />
                </div>
                <div className="crm-dashboard-card">
                    <div className="crm-dashboard-card-header">
                        <h2><HiOutlineUsers size={18} className="crm-dashboard-card-header-icon" />Recent Leads</h2>
                    </div>
                    <DataTable value={recentLeads} columns={leadColumns} paginator={false} dataKey="id" />
                </div>
            </div>

            <LeadDetailDrawer
                visible={!!drawerLead}
                lead={drawerLead ? (leads.find((l) => l.id === drawerLead.id) ?? drawerLead) : null}
                onHide={() => setDrawerLead(null)}
                onEdit={openEditDialog}
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
export default CrmDashboardPage;
