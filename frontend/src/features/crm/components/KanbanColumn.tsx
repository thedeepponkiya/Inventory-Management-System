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
    onAdd: (stageId: string | null) => void;
    onEdit: (lead: CrmLead) => void;
    onDelete: (lead: CrmLead) => void;
    // tab: 1 = drawer's Notes tab, 2 = drawer's Follow-ups tab - see LeadKanbanCard's
    // Add Note / Schedule Follow-up action icons.
    onOpenTab: (lead: CrmLead, tab: number) => void;
}

const KanbanColumn = ({ id, name, color, leads, onAdd, onEdit, onDelete, onOpenTab }: KanbanColumnProps) => {
    const { setNodeRef, isOver } = useDroppable({ id });
    const totalValue = leads.reduce((sum, lead) => sum + lead.value, 0);

    return (
        <div className={`kanban-column${isOver ? ' kanban-column--over' : ''}`}>
            <div className="kanban-column-header">
                <span className="kanban-column-title">{name}</span>
                <span className="kanban-column-count" style={{ color, background: `${color}26` }}>{leads.length}</span>
                <button type="button" className="kanban-column-add" onClick={() => onAdd(id === 'unassigned' ? null : id)} title="Add lead">
                    <HiOutlinePlus size={15} />
                </button>
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
                        <LeadKanbanCard key={lead.id} lead={lead} onEdit={onEdit} onDelete={onDelete} onOpenTab={onOpenTab} />
                    ))}
                </SortableContext>
            </div>
        </div>
    );
};
export default KanbanColumn;
