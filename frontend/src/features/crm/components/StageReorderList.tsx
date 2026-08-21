import { HiOutlineChevronUp, HiOutlineChevronDown, HiOutlinePencilSquare, HiOutlineTrash } from 'react-icons/hi2';
import type { CrmStage } from '../types/stage.types';
import './StageReorderList.css';

interface StageReorderListProps {
    stages: CrmStage[];
    onEdit: (stage: CrmStage) => void;
    // Omitted entirely (not just disabled) for a role that isn't allowed to delete stages - see
    // CrmSettingsPage.tsx's canManageCrm - so the row shows no delete button at all.
    onDelete?: (stage: CrmStage) => void;
    onMoveUp: (stage: CrmStage) => void;
    onMoveDown: (stage: CrmStage) => void;
}

// Simple up/down reorder for an admin settings list - no @dnd-kit here, that's scoped to
// the Kanban board module where drag-and-drop actually matters for day-to-day use.
const StageReorderList = ({ stages, onEdit, onDelete, onMoveUp, onMoveDown }: StageReorderListProps) => (
    <div className="stage-reorder-list">
        {stages.map((stage, index) => (
            <div className="stage-reorder-item" key={stage.id}>
                <span className="stage-reorder-swatch" style={{ background: stage.color }} />
                <span className="stage-reorder-name">{stage.name}</span>
                <span className={`stage-reorder-outcome stage-reorder-outcome--${stage.outcome}`}>{stage.outcome}</span>
                <div className="stage-reorder-actions">
                    <button type="button" disabled={index === 0} onClick={() => onMoveUp(stage)} title="Move up">
                        <HiOutlineChevronUp size={16} />
                    </button>
                    <button type="button" disabled={index === stages.length - 1} onClick={() => onMoveDown(stage)} title="Move down">
                        <HiOutlineChevronDown size={16} />
                    </button>
                    <button type="button" onClick={() => onEdit(stage)} title="Edit">
                        <HiOutlinePencilSquare size={16} />
                    </button>
                    {onDelete && (
                        <button type="button" onClick={() => onDelete(stage)} title="Delete">
                            <HiOutlineTrash size={16} />
                        </button>
                    )}
                </div>
            </div>
        ))}
    </div>
);
export default StageReorderList;
