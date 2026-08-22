import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { HiOutlinePlus } from 'react-icons/hi2';
import type { CrmLead } from '../types/lead.types';
import LeadKanbanCard from './LeadKanbanCard';
import './KanbanColumn.css';

interface KanbanColumnProps {
    id: string;
    name: string;
    color: string;
    outcome?: 'open' | 'won' | 'lost';
    leads: CrmLead[];
    // Both omitted entirely (not just disabled) for a role that isn't allowed to create/delete
    // leads - see CrmLeadsPage.tsx's canManageCrm - so the column header/cards show no
    // add/delete affordance at all instead of a dead button.
    onAdd?: (stageId: string | null) => void;
    onEdit: (lead: CrmLead) => void;
    onDelete?: (lead: CrmLead) => void;
    // Which of the drawer's tabs to land on - see LeadKanbanCard's Add Note / Schedule
    // Follow-up action icons.
    onOpenTab: (lead: CrmLead, tab: 'notes' | 'followups') => void;
    // False for Sales User - hides every card's "Schedule follow-up" icon, since that role
    // doesn't get the drawer's Follow-ups tab - see LeadKanbanCard.tsx.
    showFollowupsAction?: boolean;
}

const KanbanColumn = ({ id, name, color, leads, onAdd, onEdit, onDelete, onOpenTab, showFollowupsAction }: KanbanColumnProps) => {
    const { setNodeRef, isOver } = useDroppable({ id });
    const totalValue = leads.reduce((sum, lead) => sum + lead.value, 0);

    return (
        <div className={`kanban-column${isOver ? ' kanban-column--over' : ''}`}>
            <div className="kanban-column-header">
                <span className="kanban-column-title">{name}</span>
                <span className="kanban-column-count" style={{ color, background: `${color}26` }}>{leads.length}</span>
                {onAdd && (
                    <button type="button" className="kanban-column-add" onClick={() => onAdd(id === 'unassigned' ? null : id)} title="Add lead">
                        <HiOutlinePlus size={15} />
                    </button>
                )}
            </div>
            <div className="kanban-column-subtotal">₹{totalValue.toLocaleString('en-IN')}</div>
            <div className="kanban-column-divider" style={{ borderTopColor: color }} />
            {/* useDroppable (id = this stage) covers dropping on empty column space / below
                the last card; SortableContext covers live reflow + exact-index drops onto a
                specific card - see CrmLeadsPage's handleDragEnd for how `over.id` disambiguates
                between the two (a lead id vs this stage's id). */}
            <div ref={setNodeRef} className="kanban-column-body">
                <SortableContext items={leads.map((lead) => lead.id)} strategy={verticalListSortingStrategy}>
                    {leads.map((lead) => (
                        <LeadKanbanCard key={lead.id} lead={lead} onEdit={onEdit} onDelete={onDelete} onOpenTab={onOpenTab} showFollowupsAction={showFollowupsAction} />
                    ))}
                </SortableContext>
            </div>
        </div>
    );
};
export default KanbanColumn;
