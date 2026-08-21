import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
    HiOutlineCalendar,
    HiOutlineCalendarDays,
    HiOutlineChatBubbleLeftRight,
    HiOutlineClipboardDocumentList,
    HiOutlineEnvelope,
    HiOutlinePhone,
    HiOutlineXMark,
} from 'react-icons/hi2';
import { useDateFormatContext } from '../../../context/DateFormatContextDefinition';
import { formatDate } from '../../../common/commonFunctions/dateFormat';
import { getBadgeColors, getColorForString, getInitials } from '../utils/cardStyle';
import type { CrmLead } from '../types/lead.types';
import './LeadKanbanCard.css';

interface LeadKanbanCardProps {
    lead: CrmLead;
    onEdit: (lead: CrmLead) => void;
    // Omitted entirely (not just disabled) for a role that isn't allowed to delete leads - see
    // CrmLeadsPage.tsx's canManageCrm - so the card shows no delete (x) button at all.
    onDelete?: (lead: CrmLead) => void;
    // 'notes'/'followups' - which of the drawer's tabs to land on (see LeadDetailDrawer.tsx's
    // tabKeys). String keys rather than a raw index, so which physical TabView slot a tab
    // lands in can change (e.g. Follow-ups being hidden entirely for Sales User) without this
    // call site needing to know about it.
    onOpenTab: (lead: CrmLead, tab: 'notes' | 'followups') => void;
    // False for Sales User - hides the "Schedule follow-up" icon, since that role doesn't get
    // the drawer's Follow-ups tab to land on (see LeadDetailDrawer.tsx's showFollowupsTab).
    // "Add note" stays available regardless.
    showFollowupsAction?: boolean;
}

const priorityClass: Record<CrmLead['priority'], string> = {
    High: 'lead-kanban-priority--high',
    Medium: 'lead-kanban-priority--medium',
    Low: 'lead-kanban-priority--low',
};

// Shared visual body, used both by the normal draggable card (below) and by the DragOverlay
// clone (LeadKanbanCardOverlay) that CrmLeadsPage renders while a drag is in progress - see
// that component for why a separate, non-draggable clone is needed at all.
const LeadKanbanCardBody = ({ lead, onDelete, onOpenTab, showFollowupsAction = true }: Omit<LeadKanbanCardProps, 'onEdit'>) => {
    const { dateFormat } = useDateFormatContext();
    const avatarColor = getColorForString(lead.id);
    const sourceBadgeColors = lead.sourceName ? getBadgeColors(lead.sourceName) : null;

    return (
        <>
            <div className="lead-kanban-card-header">
                <span className="lead-kanban-avatar" style={{ background: avatarColor }}>{getInitials(lead.name)}</span>
                <div className="lead-kanban-card-title-block">
                    <span className="lead-kanban-card-name">{lead.name}</span>
                    {lead.company && <span className="lead-kanban-card-company">{lead.company}</span>}
                </div>
                {onDelete && (
                    <button
                        type="button"
                        className="lead-kanban-card-close-btn"
                        onClick={(e) => { e.stopPropagation(); onDelete(lead); }}
                        title="Delete"
                    >
                        <HiOutlineXMark size={16} />
                    </button>
                )}
            </div>

            {lead.phone && (
                <div className="lead-kanban-card-detail">
                    <HiOutlinePhone size={13} />
                    <span>{lead.phone}</span>
                </div>
            )}
            {lead.email && (
                <div className="lead-kanban-card-detail">
                    <HiOutlineEnvelope size={13} />
                    <span>{lead.email}</span>
                </div>
            )}

            {lead.sourceName && sourceBadgeColors && (
                <div className="lead-kanban-card-tags">
                    <span className="lead-kanban-source-badge" style={{ color: sourceBadgeColors.text, background: sourceBadgeColors.bg }}>
                        {lead.sourceName}
                    </span>
                </div>
            )}

            <div className="lead-kanban-card-value-row">
                <span className={`lead-kanban-priority ${priorityClass[lead.priority]}`}>{lead.priority}</span>
                <span className="lead-kanban-card-value">₹{lead.value.toLocaleString('en-IN')}</span>
            </div>

            <div className="lead-kanban-card-date">
                <HiOutlineCalendar size={13} />
                <span>{formatDate(lead.createdAt, dateFormat)}</span>
            </div>

            <div className="lead-kanban-card-divider" />

            <div className="lead-kanban-card-actions">
                {lead.phone && (
                    <a className="lead-kanban-action-btn lead-kanban-action-btn--call" href={`tel:${lead.phone}`} onClick={(e) => e.stopPropagation()} title="Call">
                        <HiOutlinePhone size={14} />
                    </a>
                )}
                {lead.phone && (
                    <a className="lead-kanban-action-btn lead-kanban-action-btn--whatsapp" href={`https://wa.me/${lead.phone}`} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} title="WhatsApp">
                        <HiOutlineChatBubbleLeftRight size={14} />
                    </a>
                )}
                {lead.email && (
                    <a className="lead-kanban-action-btn lead-kanban-action-btn--email" href={`mailto:${lead.email}`} onClick={(e) => e.stopPropagation()} title="Email">
                        <HiOutlineEnvelope size={14} />
                    </a>
                )}
                <button type="button" className="lead-kanban-action-btn lead-kanban-action-btn--note" onClick={(e) => { e.stopPropagation(); onOpenTab(lead, 'notes'); }} title="Add note">
                    <HiOutlineClipboardDocumentList size={14} />
                </button>
                {showFollowupsAction && (
                    <button type="button" className="lead-kanban-action-btn lead-kanban-action-btn--schedule" onClick={(e) => { e.stopPropagation(); onOpenTab(lead, 'followups'); }} title="Schedule follow-up">
                        <HiOutlineCalendarDays size={14} />
                    </button>
                )}
            </div>
        </>
    );
};

const LeadKanbanCard = ({ lead, onEdit, onDelete, onOpenTab, showFollowupsAction }: LeadKanbanCardProps) => {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: lead.id });

    // Always applies its own reflow transform (like every other card in the list), even while
    // dragging - just made invisible via opacity instead of skipping the transform entirely.
    // dnd-kit's DragOverlay drop animation measures *this* node's current position as the
    // "landing spot" it animates the visible clone into; if this node were left static at its
    // original slot during the drag (as it was before), that measurement would still point at
    // the original slot, and the overlay would animate backwards into it instead of the real
    // destination. Keeping it live but invisible means the measurement is always correct.
    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0 : 1,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...listeners}
            {...attributes}
            className="lead-kanban-card"
            onClick={() => onEdit(lead)}
        >
            <LeadKanbanCardBody lead={lead} onDelete={onDelete} onOpenTab={onOpenTab} showFollowupsAction={showFollowupsAction} />
        </div>
    );
};

// Rendered inside dnd-kit's <DragOverlay> (in a portal, outside every column's clipping
// `overflow-y: auto`/`overflow-x: auto` box) so the card the user is dragging floats visibly
// on top of the whole board instead of getting clipped by its origin column as soon as it
// crosses that column's edge. Deliberately NOT draggable itself (no useDraggable/listeners) -
// it's a pure visual clone that follows the pointer; the real LeadKanbanCard above stays
// mounted (invisible via opacity, see its style) for the actual drag/drop hit-testing.
export const LeadKanbanCardOverlay = ({ lead, onDelete, onOpenTab, showFollowupsAction }: Omit<LeadKanbanCardProps, 'onEdit'>) => (
    <div className="lead-kanban-card lead-kanban-card--overlay">
        <LeadKanbanCardBody lead={lead} onDelete={onDelete} onOpenTab={onOpenTab} showFollowupsAction={showFollowupsAction} />
    </div>
);

export default LeadKanbanCard;
