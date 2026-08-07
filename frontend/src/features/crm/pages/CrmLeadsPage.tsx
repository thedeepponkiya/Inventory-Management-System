import { useMemo, useRef, useState } from 'react';
import {
    DndContext,
    DragOverlay,
    PointerSensor,
    closestCenter,
    useSensor,
    useSensors,
    type DragEndEvent,
    type DragOverEvent,
    type DragStartEvent,
    type DropAnimation,
    type UniqueIdentifier,
} from '@dnd-kit/core';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { Dropdown } from 'primereact/dropdown';
import { Toast } from 'primereact/toast';
import { confirmDialog } from 'primereact/confirmdialog';
import { HiOutlineFunnel, HiOutlinePlus, HiOutlineSquares2X2, HiOutlineTableCells, HiOutlineTrash } from 'react-icons/hi2';
import FilterBar, { type FilterField } from '../../../common/commonComponents/filterBar/FilterBar';
import DataTable, { type ColumnConfig } from '../../../common/commonComponents/dataTable/DataTable';
import StatusBadge from '../../../common/commonComponents/statusBadge/StatusBadge';
import { showToast } from '../../../common/commonFunctions/commonFunction';
import { useLeadsQuery, useCreateLead, useUpdateLead, useReorderLeads, useDeleteLead, useAssignableUsersQuery } from '../hooks/useLeadsQuery';
import { useCreateNote } from '../hooks/useNotesQuery';
import { useStagesQuery } from '../hooks/useStagesQuery';
import { useSourcesQuery } from '../hooks/useSourcesQuery';
import LeadFormDialog from '../components/LeadFormDialog';
import LeadDetailDrawer from '../components/LeadDetailDrawer';
import KanbanColumn from '../components/KanbanColumn';
import { LeadKanbanCardOverlay } from '../components/LeadKanbanCard';
import { crmQuickActions } from '../crmQuickActions';
import { PERIOD_OPTIONS, getPeriodRange } from '../utils/period';
import type { CrmLead, CrmLeadPayload } from '../types/lead.types';
import './CrmLeadsPage.css';

const emptyFilters = { search: '', sourceId: null, assignedTo: null, period: null };

// dnd-kit's default drop animation tries to slide the overlay clone from its last dragged
// position to wherever the real card ends up. That target is measured right as the drag ends,
// which is *before* the reorder mutation's optimistic update has actually reached the DOM - so
// it reliably measures the card's old (pre-drop) position and animates the overlay backwards
// toward it before vanishing, instead of forward into the real slot. There's no reliable way to
// know the true destination in time, so instead of guessing, this just fades the overlay out in
// place where it was released - the real card (see its own `opacity`/`transform` in
// LeadKanbanCard) is already visible by then and glides into its real slot on its own. Kept
// short (60ms, vs the 180ms this started at) so that fade-out window barely overlaps with the
// real card's own slide - a longer overlap briefly showed both the (now-stationary) overlay and
// the (already-moving) real card on screen at once, in two different spots, which read as a
// flicker/double-image right after dropping.
const dropAnimationConfig: DropAnimation = ({ dragOverlay }) => {
    const animation = dragOverlay.node.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 60, easing: 'ease' });
    return new Promise((resolve) => {
        animation.onfinish = () => resolve();
    });
};

// Returns `allLeads` with the dragged lead (activeId) spliced into the stage/position implied
// by `overId` - either another lead's id (land right at that card's index) or a stage's own id
// (land at the end of that stage, dropped on empty column space). Used both to drive the live
// "cards slide apart to open a gap" preview while still dragging (onDragOver, below) and to
// compute the actual final order on drop (handleDragEnd) - the two call sites share this so the
// drop can never land somewhere different from what the live preview last showed.
function moveLeadForPreview(allLeads: CrmLead[], activeId: string, overId: UniqueIdentifier): CrmLead[] {
    const activeLead = allLeads.find((l) => l.id === activeId);
    if (!activeLead) return allLeads;

    const overLead = allLeads.find((l) => l.id === overId);
    const targetStageId = overLead ? overLead.stageId : (overId === 'unassigned' ? null : String(overId));

    const targetStageLeads = allLeads
        .filter((l) => l.stageId === targetStageId && l.id !== activeId)
        .sort((a, b) => a.sortOrder - b.sortOrder);
    const dropIndex = overLead ? targetStageLeads.findIndex((l) => l.id === overLead.id) : -1;
    targetStageLeads.splice(dropIndex === -1 ? targetStageLeads.length : dropIndex, 0, { ...activeLead, stageId: targetStageId });

    const reindexed = targetStageLeads.map((l, i) => ({ ...l, sortOrder: i }));
    const reindexedIds = new Set(reindexed.map((l) => l.id));
    const untouched = allLeads.filter((l) => !reindexedIds.has(l.id));
    return [...untouched, ...reindexed];
}

const CrmLeadsPage = () => {
    const toast = useRef<Toast>(null);
    const { data: leads = [], isLoading } = useLeadsQuery();
    const { data: stages = [] } = useStagesQuery();
    const { data: sources = [] } = useSourcesQuery();
    const { data: users = [] } = useAssignableUsersQuery();
    const createLead = useCreateLead();
    const updateLead = useUpdateLead();
    const reorderLeads = useReorderLeads();
    const deleteLead = useDeleteLead();
    const createNote = useCreateNote();

    const [view, setView] = useState<'table' | 'kanban'>('kanban');
    const [filters, setFilters] = useState<Record<string, unknown>>(emptyFilters);
    const [filterDialogVisible, setFilterDialogVisible] = useState(false);
    const [dialogVisible, setDialogVisible] = useState(false);
    const [editing, setEditing] = useState<CrmLead | null>(null);
    const [addStageId, setAddStageId] = useState<string | null>(null);
    const [drawerLead, setDrawerLead] = useState<CrmLead | null>(null);
    const [drawerInitialTab, setDrawerInitialTab] = useState(0);

    // Live preview order while a drag is in progress (see handleDragOver) - null outside of a
    // drag, in which case the real server-backed `leads` is used directly.
    const [liveLeads, setLiveLeads] = useState<CrmLead[] | null>(null);
    const displayLeads = liveLeads ?? leads;

    // tab: 0 = Overview (default), 1 = Notes, 2 = Follow-ups - see LeadKanbanCard's
    // Add Note / Schedule Follow-up action icons.
    const openDrawer = (lead: CrmLead, tab = 0) => {
        setDrawerLead(lead);
        setDrawerInitialTab(tab);
    };

    const filterFields: FilterField[] = [
        { key: 'search', type: 'search', label: 'Search', placeholder: 'Search by name / company / lead code' },
    ];

    const activeFilterCount = ['sourceId', 'assignedTo', 'period'].filter((key) => filters[key]).length;

    const filteredLeads = useMemo(() => {
        const search = (filters.search as string)?.toLowerCase() ?? '';
        const period = filters.period as string | null;
        const periodRange = period ? getPeriodRange(period) : null;

        return displayLeads.filter((lead) => {
            const matchesSearch = !search
                || lead.name.toLowerCase().includes(search)
                || (lead.company ?? '').toLowerCase().includes(search)
                || lead.leadCode.toLowerCase().includes(search);
            const matchesSource = !filters.sourceId || lead.sourceId === filters.sourceId;
            const matchesAssigned = !filters.assignedTo || String(lead.assignedTo) === filters.assignedTo;
            const matchesPeriod = !periodRange || (() => {
                const createdAt = new Date(lead.createdAt);
                return createdAt >= periodRange.start && createdAt <= periodRange.end;
            })();
            return matchesSearch && matchesSource && matchesAssigned && matchesPeriod;
        });
    }, [displayLeads, filters]);

    const sortedStages = useMemo(() => [...stages].sort((a, b) => a.sortOrder - b.sortOrder), [stages]);
    const unassignedLeads = useMemo(() => filteredLeads.filter((lead) => !lead.stageId), [filteredLeads]);

    const openAddDialog = (stageId: string | null = null) => {
        setEditing(null);
        setAddStageId(stageId);
        setDialogVisible(true);
    };

    const openEditDialog = (lead: CrmLead) => {
        setEditing(lead);
        setAddStageId(null);
        setDialogVisible(true);
    };

    // `notes` comes from the form dialog's own Notes textarea - not a CrmLeadPayload field.
    // Notes are a separate feature (their own tab/table), so a non-empty value here just
    // means "also create a real note against whichever lead this save produces."
    const handleSave = (payload: CrmLeadPayload, notes: string) => {
        if (editing) {
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
        } else {
            createLead.mutate(payload, {
                onSuccess: (created) => {
                    showToast(toast, 'success', 'Created', 'Lead created successfully');
                    setDialogVisible(false);
                    if (notes) createNote.mutate({ leadId: created.id, body: notes });
                },
                onError: (err) => showToast(toast, 'error', 'Error', err instanceof Error ? err.message : 'Something went wrong'),
            });
        }
    };

    const handleDelete = (lead: CrmLead) => {
        confirmDialog({
            message: `Delete lead "${lead.name}"? This cannot be undone.`,
            header: 'Delete Lead',
            icon: 'pi pi-exclamation-triangle',
            acceptClassName: 'p-button-danger',
            accept: () => {
                deleteLead.mutate(lead.id, {
                    // Closing the drawer here is a no-op when deleting from the Kanban card's ×
                    // or the table row's trash icon (the drawer is already closed then, since
                    // its modal mask blocks interacting with anything behind it) - it only
                    // actually does something when deleting via the drawer's own kebab menu,
                    // where leaving it open would otherwise keep showing the now-deleted lead's
                    // stale data.
                    onSuccess: () => {
                        showToast(toast, 'success', 'Deleted', 'Lead deleted successfully');
                        setDrawerLead(null);
                    },
                    onError: (err) => showToast(toast, 'error', 'Error', err instanceof Error ? err.message : 'Something went wrong'),
                });
            },
        });
    };

    // Drives the DragOverlay clone below - see LeadKanbanCardOverlay for why a dragged card
    // needs one instead of just moving the original element in place.
    const [activeLead, setActiveLead] = useState<CrmLead | null>(null);

    const handleDragStart = (event: DragStartEvent) => {
        setActiveLead(leads.find((l) => l.id === event.active.id) ?? null);
        setLiveLeads(leads);
    };

    // Fires continuously while hovering during a drag (not just on drop) - this is what makes
    // the other cards visibly slide apart to open a gap exactly where the pointer is, instead
    // of only re-sorting once you release. Purely a local preview: it never touches the server
    // or the real `leads` query data, only the temporary `liveLeads` used for rendering. Always
    // live-moves the card regardless of which stage is being hovered - handleDragEnd below now
    // trusts this preview directly instead of recomputing from the drop event, which is what
    // makes moving *between* stages safe here (previously, relocating the card into a different
    // stage's rendered list here - a different KanbanColumn, a different React parent - would
    // still work visually, but by drop time `event.over` could no longer be trusted: it was
    // sometimes reporting the just-relocated card hovering over itself, which handleDragEnd's
    // old "over.id === active.id -> nothing to do" guard misread as no move being needed at
    // all, silently swallowing the drop).
    const handleDragOver = (event: DragOverEvent) => {
        const { active, over } = event;
        if (!over || over.id === active.id) return;
        setLiveLeads((prev) => moveLeadForPreview(prev ?? leads, String(active.id), over.id));
    };

    const handleDragEnd = (event: DragEndEvent) => {
        setActiveLead(null);
        // `liveLeads` already reflects exactly where onDragOver last showed the card landing -
        // trust it directly rather than re-deriving from `event.over` (see handleDragOver).
        const finalLeads = liveLeads;
        setLiveLeads(null);
        if (!finalLeads) return;

        const draggedLead = finalLeads.find((l) => l.id === event.active.id);
        if (!draggedLead) return;

        const targetStageId = draggedLead.stageId;
        const orderedLeadIds = finalLeads
            .filter((l) => l.stageId === targetStageId)
            .sort((a, b) => a.sortOrder - b.sortOrder)
            .map((l) => l.id);

        // Skip the API call if the drag never actually changed anything (picked up and put
        // back in the same spot).
        const originalOrder = leads
            .filter((l) => l.stageId === targetStageId)
            .sort((a, b) => a.sortOrder - b.sortOrder)
            .map((l) => l.id);
        if (JSON.stringify(originalOrder) === JSON.stringify(orderedLeadIds)) return;

        reorderLeads.mutate(
            { stageId: targetStageId, orderedLeadIds },
            { onError: () => showToast(toast, 'error', 'Error', 'Could not move lead - please try again') },
        );
    };

    // Requires an 8px pointer move before a drag actually starts - without this, dnd-kit
    // treats every pointerdown as a potential drag and swallows plain clicks on the card's
    // own delete button / quick-action links / edit-on-click.
    const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

    const columns: ColumnConfig<CrmLead>[] = [
        { field: 'leadCode', header: 'Lead Code', body: (row) => <span className="common-table-id-link" onClick={() => openDrawer(row)}>#{row.leadCode}</span> },
        { field: 'name', header: 'Name' },
        { field: 'company', header: 'Company', body: (row) => row.company ?? '—' },
        {
            field: 'stageName',
            header: 'Stage',
            filter: false,
            body: (row) => (row.stageName ? (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 600 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: row.stageColor ?? '#64748B', display: 'inline-block' }} />
                    {row.stageName}
                </span>
            ) : '—'),
        },
        { field: 'sourceName', header: 'Source', body: (row) => row.sourceName ?? '—' },
        { field: 'campaignName', header: 'Campaign', body: (row) => row.campaignName ?? '—' },
        { field: 'assignedToName', header: 'Assigned To', body: (row) => row.assignedToName ?? '—' },
        {
            field: 'priority',
            header: 'Priority',
            filter: false,
            body: (row) => {
                const colors: Record<CrmLead['priority'], { text: string; bg: string }> = {
                    High: { text: 'var(--accent-danger-text)', bg: 'var(--accent-danger-bg)' },
                    Medium: { text: '#92600a', bg: '#fdf1d3' },
                    Low: { text: 'var(--text-muted)', bg: 'var(--surface-subtle)' },
                };
                const { text, bg } = colors[row.priority];
                return (
                    <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', padding: '2px 8px', borderRadius: '999px', color: text, background: bg }}>
                        {row.priority}
                    </span>
                );
            },
        },
        { field: 'value', header: 'Value', body: (row) => `Rs. ${row.value.toLocaleString('en-IN')}` },
        { field: 'status', header: 'Status', filter: false, body: (row) => <StatusBadge label={row.status} variant={row.status === 'Active' ? 'success' : 'neutral'} /> },
    ];

    const actionTemplate = (row: CrmLead) => (
        <div className="data-table-actions">
            <HiOutlineTrash size={16} color="var(--accent-danger-text)" title="Delete" onClick={() => handleDelete(row)} />
        </div>
    );

    return (
        <div className="crm-leads-page">
            <Toast ref={toast} />
            <FilterBar
                fields={filterFields}
                values={filters}
                onChange={(key, value) => setFilters((prev) => ({ ...prev, [key]: value }))}
                onReset={() => setFilters(emptyFilters)}
                quickActions={crmQuickActions}
                actions={(
                    <>
                        <Button label="Add Lead" icon={<HiOutlinePlus className="mr-2" />} onClick={() => openAddDialog()} outlined />
                        <Button
                            className="crm-leads-filter-btn"
                            icon={<HiOutlineFunnel className="mr-2" />}
                            label={activeFilterCount > 0 ? `Filter (${activeFilterCount})` : 'Filter'}
                            outlined
                            onClick={() => setFilterDialogVisible(true)}
                        />
                    </>
                )}
                trailingActions={(
                    <div className="crm-leads-view-toggle">
                        <button type="button" className={`crm-leads-view-btn${view === 'kanban' ? ' crm-leads-view-btn--active' : ''}`} onClick={() => setView('kanban')} title="Kanban view">
                            <HiOutlineSquares2X2 size={16} />
                        </button>
                        <button type="button" className={`crm-leads-view-btn${view === 'table' ? ' crm-leads-view-btn--active' : ''}`} onClick={() => setView('table')} title="Table view">
                            <HiOutlineTableCells size={16} />
                        </button>
                    </div>
                )}
            />

            {view === 'table' && (
                <DataTable value={filteredLeads} columns={columns} loading={isLoading} actionBodyTemplate={actionTemplate} dataKey="id" />
            )}

            {view === 'kanban' && !isLoading && (
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragOver={handleDragOver} onDragEnd={handleDragEnd}>
                    <div className="kanban-board">
                        {unassignedLeads.length > 0 && (
                            <KanbanColumn
                                id="unassigned"
                                name="Unassigned"
                                color="#94A3B8"
                                leads={unassignedLeads}
                                onAdd={openAddDialog}
                                onEdit={openDrawer}
                                onDelete={handleDelete}
                                onOpenTab={openDrawer}
                            />
                        )}
                        {sortedStages.map((stage) => (
                            <KanbanColumn
                                key={stage.id}
                                id={stage.id}
                                name={stage.name}
                                color={stage.color}
                                outcome={stage.outcome}
                                leads={filteredLeads.filter((lead) => lead.stageId === stage.id)}
                                onAdd={openAddDialog}
                                onEdit={openDrawer}
                                onDelete={handleDelete}
                                onOpenTab={openDrawer}
                            />
                        ))}
                    </div>
                    <DragOverlay dropAnimation={dropAnimationConfig}>
                        {activeLead && <LeadKanbanCardOverlay lead={activeLead} onDelete={handleDelete} onOpenTab={openDrawer} />}
                    </DragOverlay>
                </DndContext>
            )}

            <Dialog
                visible={filterDialogVisible}
                onHide={() => setFilterDialogVisible(false)}
                position="bottom-right"
                header="Filter Leads"
                style={{ width: '320px' }}
                className="crm-leads-filter-dialog"
            >
                <div className="dialog-form-body">
                    <div className="form-field">
                        <label>Source</label>
                        <Dropdown
                            value={filters.sourceId ?? null}
                            options={sources.map((s) => ({ label: s.name, value: s.id }))}
                            onChange={(e) => setFilters((prev) => ({ ...prev, sourceId: e.value }))}
                            placeholder="Select source"
                            showClear
                        />
                    </div>
                    <div className="form-field">
                        <label>Assigned To</label>
                        <Dropdown
                            value={filters.assignedTo ?? null}
                            options={users.map((u) => ({ label: u.userName, value: String(u.id) }))}
                            onChange={(e) => setFilters((prev) => ({ ...prev, assignedTo: e.value }))}
                            placeholder="Select user"
                            showClear
                        />
                    </div>
                    <div className="form-field">
                        <label>Created</label>
                        <Dropdown
                            value={filters.period ?? null}
                            options={PERIOD_OPTIONS}
                            onChange={(e) => setFilters((prev) => ({ ...prev, period: e.value }))}
                            placeholder="Any time"
                            showClear
                        />
                    </div>
                    <div className="crm-leads-filter-actions">
                        <Button
                            label="Clear Filters"
                            outlined
                            onClick={() => setFilters(emptyFilters)}
                            disabled={activeFilterCount === 0 && !filters.search}
                        />
                    </div>
                </div>
            </Dialog>

            <LeadFormDialog
                visible={dialogVisible}
                editing={editing}
                onHide={() => setDialogVisible(false)}
                onSave={handleSave}
                defaultStageId={addStageId ?? undefined}
            />
            <LeadDetailDrawer
                visible={!!drawerLead}
                lead={drawerLead ? (leads.find((l) => l.id === drawerLead.id) ?? drawerLead) : null}
                onHide={() => setDrawerLead(null)}
                onEdit={openEditDialog}
                onDelete={handleDelete}
                initialTab={drawerInitialTab}
            />
        </div>
    );
};
export default CrmLeadsPage;
