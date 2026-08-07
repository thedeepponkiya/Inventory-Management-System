import { useRef, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { Sidebar } from 'primereact/sidebar';
import { TabView, TabPanel } from 'primereact/tabview';
import { Button } from 'primereact/button';
import { InputTextarea } from 'primereact/inputtextarea';
import { Dropdown } from 'primereact/dropdown';
import { Calendar } from 'primereact/calendar';
import { Toast } from 'primereact/toast';
import { confirmDialog } from 'primereact/confirmdialog';
import {
    HiChevronRight,
    HiOutlineBuildingOffice2,
    HiOutlineCalendarDays,
    HiOutlineChartBar,
    HiOutlineChatBubbleLeftRight,
    HiOutlineCheckCircle,
    HiOutlineDocumentDuplicate,
    HiOutlineDocumentText,
    HiOutlineEnvelope,
    HiOutlinePencilSquare,
    HiOutlinePhone,
    HiOutlineSparkles,
    HiOutlineTrash,
    HiOutlineXMark,
} from 'react-icons/hi2';
import StatusBadge from '../../../common/commonComponents/statusBadge/StatusBadge';
import { showToast } from '../../../common/commonFunctions/commonFunction';
import { useDateFormatContext } from '../../../context/DateFormatContextDefinition';
import { formatDate } from '../../../common/commonFunctions/dateFormat';
import { getBadgeColors, getColorForString, getInitials } from '../utils/cardStyle';
import { useNotesQuery, useCreateNote, useDeleteNote } from '../hooks/useNotesQuery';
import { useFollowupsQuery, useCreateFollowup, useUpdateFollowup, useDeleteFollowup } from '../hooks/useFollowupsQuery';
import { useUpdateLead, useAssignableUsersQuery } from '../hooks/useLeadsQuery';
import { useStagesQuery } from '../hooks/useStagesQuery';
import type { CrmLead } from '../types/lead.types';
import type { CrmFollowup, CrmFollowupType } from '../types/followup.types';
import type { CrmNote } from '../types/note.types';
import type { CrmStage } from '../types/stage.types';
import './LeadDetailDrawer.css';

interface LeadDetailDrawerProps {
    visible: boolean;
    lead: CrmLead | null;
    onHide: () => void;
    onEdit: (lead: CrmLead) => void;
    // Only CrmLeadsPage wires this - CrmDashboardPage/CrmFollowupsPage open the drawer as a
    // quick-view without delete wired up, so the kebab menu simply doesn't render there.
    onDelete?: (lead: CrmLead) => void;
    // Lets a caller (e.g. the Kanban card's Add Note / Schedule Follow-up icons) open the
    // drawer straight to that tab instead of always landing on Overview.
    initialTab?: number;
}

const priorityColors: Record<CrmLead['priority'], { text: string; bg: string }> = {
    High: { text: 'var(--accent-danger-text)', bg: 'var(--accent-danger-bg)' },
    Medium: { text: '#92600a', bg: '#fdf1d3' },
    Low: { text: 'var(--text-muted)', bg: 'var(--surface-subtle)' },
};

const statusColors: Record<CrmLead['status'], { text: string; bg: string }> = {
    Active: { text: 'var(--accent-success-text)', bg: 'var(--accent-success-bg)' },
    Archived: { text: 'var(--text-muted)', bg: 'var(--surface-subtle)' },
};

const FOLLOWUP_TYPES: CrmFollowupType[] = ['Call', 'Email', 'WhatsApp', 'Meeting', 'Other'];

function formatDateTime(value: string | null | undefined, dateFormat: 'short' | 'medium' | 'long'): string {
    if (!value) return '—';
    return `${formatDate(value, dateFormat)}, ${format(parseISO(value), 'hh:mm a')}`;
}

// No stage-completion tracking exists to derive a "real" probability from, so this is a simple,
// transparent heuristic: how far along the (open) pipeline this stage sits. Won/Lost are the
// only stages with a defined outcome, so they short-circuit to 100/0 instead of participating
// in the position math.
function getConversionProbability(lead: CrmLead, stages: CrmStage[]): number {
    const stage = stages.find((s) => s.id === lead.stageId);
    if (!stage) return 0;
    if (stage.outcome === 'won') return 100;
    if (stage.outcome === 'lost') return 0;
    const sorted = [...stages].sort((a, b) => a.sortOrder - b.sortOrder);
    const index = sorted.findIndex((s) => s.id === stage.id);
    if (index === -1 || sorted.length === 0) return 0;
    return Math.round(((index + 1) / sorted.length) * 100);
}

interface ActivityItem {
    id: string;
    icon: typeof HiOutlineSparkles;
    color: string;
    title: string;
    description?: string;
    at: string;
    by: string | null;
}

// No activity-log table is actually written to anywhere in the backend (crm_activities exists
// but nothing inserts into it) - rather than instrument every mutation to also log an entry,
// this synthesizes the same "recent activity" feel by merging the two things that already are
// tracked (Notes, Follow-ups) with a synthetic "Lead Created" entry, sorted newest-first.
function buildActivityFeed(lead: CrmLead, notes: CrmNote[], followups: CrmFollowup[]): ActivityItem[] {
    const items: ActivityItem[] = [
        {
            id: `created-${lead.id}`,
            icon: HiOutlineSparkles,
            color: '#d97706',
            title: 'Lead Created',
            description: `Lead added from ${lead.sourceName ?? 'an unknown'} source.`,
            at: lead.createdAt,
            by: 'System',
        },
    ];

    notes.forEach((note) => {
        items.push({
            id: `note-${note.id}`,
            icon: HiOutlineDocumentText,
            color: '#2563eb',
            title: 'Note Added',
            description: note.body,
            at: note.createdAt,
            by: note.createdByName,
        });
    });

    followups.forEach((followup) => {
        if (followup.status === 'Completed' && followup.completedAt) {
            items.push({
                id: `followup-done-${followup.id}`,
                icon: followup.type === 'Email' ? HiOutlineEnvelope : followup.type === 'WhatsApp' ? HiOutlineChatBubbleLeftRight : HiOutlineCheckCircle,
                color: '#16a34a',
                title: `${followup.type} Completed`,
                description: followup.notes ?? undefined,
                at: followup.completedAt,
                by: followup.createdByName,
            });
        } else {
            items.push({
                id: `followup-scheduled-${followup.id}`,
                icon: HiOutlineCalendarDays,
                color: '#92600a',
                title: `${followup.type} Scheduled`,
                description: followup.notes ?? undefined,
                at: followup.createdAt,
                by: followup.createdByName,
            });
        }
    });

    return items.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
}

function getLastContact(notes: CrmNote[], followups: CrmFollowup[]): string | null {
    const timestamps: string[] = [];
    if (notes[0]) timestamps.push(notes[0].createdAt);
    const lastCompleted = [...followups]
        .filter((f) => f.status === 'Completed' && f.completedAt)
        .sort((a, b) => new Date(b.completedAt as string).getTime() - new Date(a.completedAt as string).getTime())[0];
    if (lastCompleted?.completedAt) timestamps.push(lastCompleted.completedAt);
    if (timestamps.length === 0) return null;
    return timestamps.sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0];
}

function getNextFollowup(followups: CrmFollowup[]): CrmFollowup | null {
    const pending = [...followups]
        .filter((f) => f.status === 'Pending')
        .sort((a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime());
    return pending[0] ?? null;
}

const LeadDetailDrawer = ({ visible, lead, onHide, onEdit, onDelete, initialTab }: LeadDetailDrawerProps) => {
    const toast = useRef<Toast>(null);
    const [activeTab, setActiveTab] = useState(0);

    // Reset to the requested tab whenever the drawer transitions from hidden to visible -
    // adjusting state during render (React's documented alternative to a setState-in-effect,
    // using plain state rather than a ref so it stays compiler/lint-safe) since PrimeReact's
    // Sidebar keeps this component mounted the whole time instead of remounting it per lead.
    const [wasVisible, setWasVisible] = useState(visible);
    if (visible !== wasVisible) {
        setWasVisible(visible);
        if (visible) setActiveTab(initialTab ?? 0);
    }

    const [noteBody, setNoteBody] = useState('');
    const [followupType, setFollowupType] = useState<CrmFollowupType>('Call');
    const [followupDueAt, setFollowupDueAt] = useState<Date | null>(null);
    const [followupNotes, setFollowupNotes] = useState('');

    const { dateFormat } = useDateFormatContext();
    const leadId = lead?.id;

    const { data: notes = [], isLoading: notesLoading } = useNotesQuery(leadId);
    const createNote = useCreateNote();
    const deleteNote = useDeleteNote(leadId);

    const { data: followups = [], isLoading: followupsLoading } = useFollowupsQuery(leadId);
    const createFollowup = useCreateFollowup();
    const updateFollowup = useUpdateFollowup();
    const deleteFollowup = useDeleteFollowup();

    const { data: stages = [] } = useStagesQuery();
    const { data: users = [] } = useAssignableUsersQuery();
    const updateLead = useUpdateLead();

    if (!lead) return null;

    const handleAddNote = () => {
        if (!noteBody.trim()) return;
        createNote.mutate(
            { leadId: lead.id, body: noteBody.trim() },
            {
                onSuccess: () => {
                    setNoteBody('');
                    showToast(toast, 'success', 'Added', 'Note added successfully');
                },
                onError: (err) => showToast(toast, 'error', 'Error', err instanceof Error ? err.message : 'Something went wrong'),
            },
        );
    };

    const handleDeleteNote = (id: string) => {
        confirmDialog({
            message: 'Delete this note? This cannot be undone.',
            header: 'Delete Note',
            icon: 'pi pi-exclamation-triangle',
            acceptClassName: 'p-button-danger',
            accept: () => deleteNote.mutate(id, {
                onSuccess: () => showToast(toast, 'success', 'Deleted', 'Note deleted successfully'),
                onError: (err) => showToast(toast, 'error', 'Error', err instanceof Error ? err.message : 'Something went wrong'),
            }),
        });
    };

    const handleAddFollowup = () => {
        if (!followupDueAt) return;
        createFollowup.mutate(
            { leadId: lead.id, dueAt: followupDueAt.toISOString(), type: followupType, notes: followupNotes.trim() || null },
            {
                onSuccess: () => {
                    setFollowupDueAt(null);
                    setFollowupNotes('');
                    setFollowupType('Call');
                    showToast(toast, 'success', 'Added', 'Follow-up scheduled successfully');
                },
                onError: (err) => showToast(toast, 'error', 'Error', err instanceof Error ? err.message : 'Something went wrong'),
            },
        );
    };

    const handleMarkComplete = (id: string) => {
        updateFollowup.mutate(
            { id, payload: { status: 'Completed' } },
            {
                onSuccess: () => showToast(toast, 'success', 'Updated', 'Follow-up marked complete'),
                onError: (err) => showToast(toast, 'error', 'Error', err instanceof Error ? err.message : 'Something went wrong'),
            },
        );
    };

    const handleDeleteFollowup = (id: string) => {
        confirmDialog({
            message: 'Delete this follow-up? This cannot be undone.',
            header: 'Delete Follow-up',
            icon: 'pi pi-exclamation-triangle',
            acceptClassName: 'p-button-danger',
            accept: () => deleteFollowup.mutate(id, {
                onSuccess: () => showToast(toast, 'success', 'Deleted', 'Follow-up deleted successfully'),
                onError: (err) => showToast(toast, 'error', 'Error', err instanceof Error ? err.message : 'Something went wrong'),
            }),
        });
    };

    const handleCopyCode = () => {
        navigator.clipboard.writeText(lead.leadCode).then(
            () => showToast(toast, 'success', 'Copied', 'Lead code copied to clipboard'),
            () => showToast(toast, 'error', 'Error', 'Could not copy to clipboard'),
        );
    };

    const { text: priorityText, bg: priorityBg } = priorityColors[lead.priority];
    const sourceBadgeColors = lead.sourceName ? getBadgeColors(lead.sourceName) : null;
    const assignedUser = users.find((u) => u.id === lead.assignedTo);
    const avatarColor = getColorForString(lead.id);
    const activityFeed = buildActivityFeed(lead, notes, followups);
    const lastContact = getLastContact(notes, followups);
    const nextFollowup = getNextFollowup(followups);
    const conversionProbability = getConversionProbability(lead, stages);
    const followupCounts = {
        total: followups.length,
        completed: followups.filter((f) => f.status === 'Completed').length,
        pending: followups.filter((f) => f.status === 'Pending' && new Date(f.dueAt) >= new Date()).length,
        overdue: followups.filter((f) => f.status === 'Pending' && new Date(f.dueAt) < new Date()).length,
    };

    const renderActivityFeed = (items: ActivityItem[]) => (
        <div className="lead-detail-activity-feed">
            {items.map((item) => {
                const Icon = item.icon;
                return (
                    <div className="lead-detail-activity-item" key={item.id}>
                        <span className="lead-detail-activity-icon" style={{ color: item.color, background: `${item.color}1F` }}>
                            <Icon size={14} />
                        </span>
                        <div className="lead-detail-activity-body">
                            <div className="lead-detail-activity-top">
                                <span className="lead-detail-activity-title">{item.title}</span>
                                <span className="lead-detail-activity-date">{formatDateTime(item.at, dateFormat)}</span>
                            </div>
                            {item.description && <div className="lead-detail-activity-desc">{item.description}</div>}
                            {item.by && <div className="lead-detail-activity-by">{item.by}</div>}
                        </div>
                    </div>
                );
            })}
        </div>
    );

    return (
        <Sidebar visible={visible} onHide={onHide} position="right" showCloseIcon={false} className="lead-detail-drawer">
            <Toast ref={toast} />
            <div className="lead-detail-drawer-header">
                <span className="lead-detail-avatar" style={{ background: avatarColor }}>{getInitials(lead.name)}</span>
                <div className="lead-detail-header-main">
                    <div className="lead-detail-header-name-row">
                        <h3>{lead.name}</h3>
                    </div>
                    <div className="lead-detail-header-code-row">
                        <span className="lead-detail-drawer-code">#{lead.leadCode}</span>
                        <button type="button" className="lead-detail-copy-btn" onClick={handleCopyCode} title="Copy lead code">
                            <HiOutlineDocumentDuplicate size={13} />
                        </button>
                    </div>
                </div>
                <button type="button" className="lead-detail-edit-btn" onClick={() => onEdit(lead)} title="Edit lead">
                    <HiOutlinePencilSquare size={17} />
                </button>
                {onDelete && (
                    <button type="button" className="lead-detail-delete-btn" onClick={() => onDelete(lead)} title="Delete lead">
                        <HiOutlineTrash size={18} />
                    </button>
                )}
                <button type="button" className="lead-detail-close-btn" onClick={onHide} title="Close">
                    <HiOutlineXMark size={18} />
                </button>
            </div>

            <div className="lead-detail-status-row">
                {lead.stageName && (
                    <span className="lead-detail-status-pill" style={{ color: lead.stageColor ?? '#64748B', background: `${lead.stageColor ?? '#64748B'}1F` }}>
                        <span className="lead-detail-status-dot" style={{ background: lead.stageColor ?? '#64748B' }} />
                        {lead.stageName}
                    </span>
                )}
                <span className="lead-detail-status-pill" style={{ color: priorityText, background: priorityBg }}>
                    <HiOutlineChartBar size={13} />
                    {lead.priority}
                </span>
                <StatusBadge label={lead.status} variant={lead.status === 'Active' ? 'success' : 'neutral'} />
            </div>

            <TabView activeIndex={activeTab} onTabChange={(e) => setActiveTab(e.index)}>
                <TabPanel header="Overview">
                    <div className="lead-detail-overview-card">
                    <div className="lead-detail-overview-grid">
                        <div className="lead-detail-grid-row">
                            <div className="lead-detail-field">
                                <span className="lead-detail-label">Company</span>
                                <div className="lead-detail-value-with-icon">
                                    <span className="lead-detail-icon-chip"><HiOutlineBuildingOffice2 size={15} /></span>
                                    <span className="lead-detail-value-14">{lead.company ?? '—'}</span>
                                </div>
                            </div>
                            <div className="lead-detail-field">
                                <span className="lead-detail-label">Phone</span>
                                <div className="lead-detail-field-with-action">
                                    <span className="lead-detail-value-14">{lead.phone ?? '—'}</span>
                                    {lead.phone && <a href={`tel:${lead.phone}`} className="lead-detail-inline-icon-btn lead-detail-inline-icon-btn--call"><HiOutlinePhone size={13} /></a>}
                                </div>
                            </div>
                        </div>

                        <div className="lead-detail-grid-row">
                            <div className="lead-detail-field">
                                <span className="lead-detail-label">Email</span>
                                <div className="lead-detail-field-with-action">
                                    <span className="lead-detail-truncate lead-detail-value-14">{lead.email ?? '—'}</span>
                                    {lead.email && <a href={`mailto:${lead.email}`} className="lead-detail-inline-icon-btn lead-detail-inline-icon-btn--email"><HiOutlineEnvelope size={13} /></a>}
                                </div>
                            </div>
                            <div className="lead-detail-field">
                                <span className="lead-detail-label">Stage</span>
                                <Dropdown
                                    value={lead.stageId}
                                    options={stages.map((s) => ({ label: s.name, value: s.id, color: s.color }))}
                                    onChange={(e) => updateLead.mutate({ id: lead.id, payload: { stageId: e.value } })}
                                    valueTemplate={(option) => option && (
                                        <span className="lead-detail-pill-value" style={{ color: option.color, background: `${option.color}1F` }}>
                                            <span className="lead-detail-status-dot" style={{ background: option.color }} />
                                            {option.label}
                                        </span>
                                    )}
                                    className="lead-detail-inline-dropdown lead-detail-pill-dropdown"
                                />
                            </div>
                        </div>

                        <div className="lead-detail-grid-row">
                            <div className="lead-detail-field">
                                <span className="lead-detail-label">Source</span>
                                {lead.sourceName && sourceBadgeColors ? (
                                    <span className="lead-detail-source-badge" style={{ color: sourceBadgeColors.text, background: sourceBadgeColors.bg }}>{lead.sourceName}</span>
                                ) : <span>—</span>}
                            </div>
                            <div className="lead-detail-field">
                                <span className="lead-detail-label">Campaign</span>
                                <span className="lead-detail-value-14">{lead.campaignName ?? '—'}</span>
                            </div>
                        </div>

                        <div className="lead-detail-grid-row">
                            <div className="lead-detail-field">
                                <span className="lead-detail-label">Assigned To</span>
                                <Dropdown
                                    value={lead.assignedTo}
                                    options={users.map((u) => ({ label: u.userName, value: u.id }))}
                                    onChange={(e) => updateLead.mutate({ id: lead.id, payload: { assignedTo: e.value } })}
                                    valueTemplate={(option) => (
                                        <span className="lead-detail-assigned-value">
                                            <span className="lead-detail-assigned-avatar" style={{ background: getColorForString(String(option?.value ?? '')) }}>
                                                {getInitials(option?.label ?? '?')}
                                            </span>
                                            <span className="lead-detail-assigned-name">{option?.label ?? assignedUser?.userName ?? '—'}</span>
                                            <HiChevronRight size={15} className="lead-detail-assigned-chevron" />
                                        </span>
                                    )}
                                    className="lead-detail-inline-dropdown lead-detail-assigned-dropdown"
                                />
                            </div>
                            <div className="lead-detail-field">
                                <span className="lead-detail-label">Value</span>
                                <span className="lead-detail-value-14">Rs. {lead.value.toLocaleString('en-IN')}</span>
                            </div>
                        </div>

                        <div className="lead-detail-grid-row">
                            <div className="lead-detail-field">
                                <span className="lead-detail-label">Priority</span>
                                <span className="lead-detail-priority" style={{ color: priorityText, background: priorityBg }}>{lead.priority}</span>
                            </div>
                            <div className="lead-detail-field">
                                <span className="lead-detail-label">Status</span>
                                <Dropdown
                                    value={lead.status}
                                    options={[
                                        { label: 'Active', value: 'Active', ...statusColors.Active },
                                        { label: 'Archived', value: 'Archived', ...statusColors.Archived },
                                    ]}
                                    onChange={(e) => updateLead.mutate({ id: lead.id, payload: { status: e.value } })}
                                    valueTemplate={(option) => option && (
                                        <span className="lead-detail-pill-value" style={{ color: option.text, background: option.bg }}>{option.label}</span>
                                    )}
                                    className="lead-detail-inline-dropdown lead-detail-pill-dropdown"
                                />
                            </div>
                        </div>
                    </div>
                    </div>

                    <div className="lead-detail-metric-row">
                        <div className="lead-detail-metric-card">
                            <HiOutlineCalendarDays size={16} />
                            <div>
                                <span className="lead-detail-metric-label">Lead Created</span>
                                <span className="lead-detail-metric-value">{formatDateTime(lead.createdAt, dateFormat)}</span>
                            </div>
                        </div>
                        <div className="lead-detail-metric-card">
                            <HiOutlinePhone size={16} />
                            <div>
                                <span className="lead-detail-metric-label">Last Contact</span>
                                <span className="lead-detail-metric-value">{lastContact ? formatDateTime(lastContact, dateFormat) : '—'}</span>
                            </div>
                        </div>
                        <div className="lead-detail-metric-card">
                            <HiOutlineCalendarDays size={16} />
                            <div>
                                <span className="lead-detail-metric-label">Next Follow-up</span>
                                <span className="lead-detail-metric-value">{nextFollowup ? formatDateTime(nextFollowup.dueAt, dateFormat) : '—'}</span>
                            </div>
                        </div>
                    </div>

                    <div className="lead-detail-two-col">
                        <div className="lead-detail-activity-card">
                            <div className="lead-detail-card-header">
                                <span>Recent Activity</span>
                                <button type="button" className="lead-detail-view-all" onClick={() => setActiveTab(3)}>View All</button>
                            </div>
                            {renderActivityFeed(activityFeed.slice(0, 4))}
                        </div>

                        <div className="lead-detail-side-col">
                            <div className="lead-detail-summary-card">
                                <div className="lead-detail-card-header"><span>Lead Summary</span></div>
                                <div className="lead-detail-summary-row"><span>Total Follow-ups</span><span>{followupCounts.total}</span></div>
                                <div className="lead-detail-summary-row"><span>Completed</span><span className="lead-detail-summary-success">{followupCounts.completed}</span></div>
                                <div className="lead-detail-summary-row"><span>Pending</span><span className="lead-detail-summary-warning">{followupCounts.pending}</span></div>
                                <div className="lead-detail-summary-row"><span>Overdue</span><span className="lead-detail-summary-danger">{followupCounts.overdue}</span></div>
                                <div className="lead-detail-summary-row"><span>Deal Value</span><span>Rs. {lead.value.toLocaleString('en-IN')}</span></div>
                                <div className="lead-detail-conversion">
                                    <div className="lead-detail-conversion-top">
                                        <span>Conversion Probability</span>
                                        <span>{conversionProbability}%</span>
                                    </div>
                                    <div className="lead-detail-conversion-track">
                                        <div className="lead-detail-conversion-fill" style={{ width: `${conversionProbability}%` }} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </TabPanel>

                <TabPanel header="Notes">
                    <div className="lead-detail-add-form">
                        <InputTextarea value={noteBody} onChange={(e) => setNoteBody(e.target.value)} rows={3} placeholder="Add a note..." />
                        <Button label="Add Note" onClick={handleAddNote} disabled={!noteBody.trim()} />
                    </div>
                    <div className="lead-detail-list">
                        {!notesLoading && notes.length === 0 && <p className="lead-detail-empty">No notes yet.</p>}
                        {notes.map((note) => (
                            <div className="lead-detail-note" key={note.id}>
                                <div className="lead-detail-note-body">{note.body}</div>
                                <div className="lead-detail-note-meta">
                                    <span>{note.createdByName ?? '—'} · {new Date(note.createdAt).toLocaleString('en-IN')}</span>
                                    <button type="button" onClick={() => handleDeleteNote(note.id)} title="Delete note">
                                        <HiOutlineTrash size={14} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </TabPanel>

                <TabPanel header="Follow-ups">
                    <div className="lead-detail-add-form">
                        <div className="lead-detail-followup-row">
                            <Dropdown
                                value={followupType}
                                options={FOLLOWUP_TYPES.map((t) => ({ label: t, value: t }))}
                                onChange={(e) => setFollowupType(e.value)}
                                placeholder="Type"
                            />
                            <Calendar
                                value={followupDueAt}
                                onChange={(e) => setFollowupDueAt(e.value ?? null)}
                                showTime
                                hourFormat="24"
                                dateFormat="dd M yy"
                                placeholder="Due date & time"
                            />
                        </div>
                        <InputTextarea value={followupNotes} onChange={(e) => setFollowupNotes(e.target.value)} rows={2} placeholder="Notes (optional)" />
                        <Button label="Schedule Follow-up" onClick={handleAddFollowup} disabled={!followupDueAt} />
                    </div>
                    <div className="lead-detail-list">
                        {!followupsLoading && followups.length === 0 && <p className="lead-detail-empty">No follow-ups scheduled.</p>}
                        {followups.map((followup) => (
                            <div className="lead-detail-followup" key={followup.id}>
                                <div className="lead-detail-followup-top">
                                    <span className="lead-detail-followup-type">{followup.type}</span>
                                    <StatusBadge label={followup.status} variant={followup.status === 'Completed' ? 'success' : 'warning'} />
                                </div>
                                <div className="lead-detail-followup-due">Due {new Date(followup.dueAt).toLocaleString('en-IN')}</div>
                                {followup.notes && <div className="lead-detail-followup-notes">{followup.notes}</div>}
                                <div className="lead-detail-followup-actions">
                                    {followup.status === 'Pending' && (
                                        <Button label="Mark Complete" size="small" outlined onClick={() => handleMarkComplete(followup.id)} />
                                    )}
                                    <button type="button" onClick={() => handleDeleteFollowup(followup.id)} title="Delete follow-up">
                                        <HiOutlineTrash size={14} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </TabPanel>

                <TabPanel header="Activity">
                    {renderActivityFeed(activityFeed)}
                </TabPanel>
            </TabView>

            {nextFollowup && (
                <div className="lead-detail-footer">
                    <div className="lead-detail-footer-info">
                        <span className="lead-detail-footer-label">Next Follow-up</span>
                        <span className="lead-detail-footer-value">
                            {formatDateTime(nextFollowup.dueAt, dateFormat)} · {nextFollowup.type}
                            {nextFollowup.notes && <span className="lead-detail-footer-notes"> — {nextFollowup.notes}</span>}
                        </span>
                    </div>
                    <Button label="Reschedule" outlined size="small" onClick={() => setActiveTab(2)} />
                </div>
            )}
        </Sidebar>
    );
};
export default LeadDetailDrawer;
