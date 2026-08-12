import { Tag } from 'primereact/tag';
import './StatusBadge.css';

export type StatusVariant = 'success' | 'danger' | 'warning' | 'info' | 'neutral' | 'purple';

interface StatusBadgeProps {
    label: string;
    variant: StatusVariant;
}

const variantToSeverity: Record<StatusVariant, 'success' | 'danger' | 'warning' | 'info' | undefined> = {
    success: 'success',
    danger: 'danger',
    warning: 'warning',
    info: 'info',
    neutral: undefined,
    purple: undefined,
};

const StatusBadge = ({ label, variant }: StatusBadgeProps) => {
    return (
        <Tag
            value={label}
            severity={variantToSeverity[variant]}
            rounded
            className={`status-badge status-badge--${variant}`}
        />
    );
};

export default StatusBadge;
