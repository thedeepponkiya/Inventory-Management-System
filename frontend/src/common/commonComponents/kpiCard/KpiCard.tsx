import type { IconType } from 'react-icons';
import './KpiCard.css';

export interface KpiCardProps {
    icon: IconType;
    iconBg?: string;
    iconColor?: string;
    label: string;
    value: string | number;
    sublabel?: string;
    delta?: { value: string; direction: 'up' | 'down' | 'flat' };
    linkLabel?: string;
    onClick?: () => void;
}

export const KpiCard = ({
    icon: Icon,
    iconColor = '#2563eb',
    label,
    value,
    sublabel,
    delta,
    linkLabel,
    onClick,
}: KpiCardProps) => {
    return (
        <div className={`kpi-card ${onClick ? 'kpi-card--clickable' : ''}`} onClick={onClick}>
            <div className="kpi-card-top">
                <div className="kpi-card-icon" style={{ color: iconColor }}>
                    <Icon size={34} />
                </div>
                <div className="kpi-card-text">
                    <div className="kpi-card-label">{label}</div>
                    <div className="kpi-card-value">
                        {value}
                        {delta && <span className={`kpi-card-value-delta kpi-card-value-delta--${delta.direction}`}>({delta.value})</span>}
                    </div>
                </div>
            </div>
            {sublabel && <div className="kpi-card-sublabel">{sublabel}</div>}
            {linkLabel && (
                <div className="kpi-card-link" style={{ color: iconColor }}>
                    {linkLabel} &rarr;
                </div>
            )}
        </div>
    );
};

interface KpiCardRowProps {
    items: KpiCardProps[];
    columns?: number;
}

export const KpiCardRow = ({ items, columns = 4 }: KpiCardRowProps) => {
    return (
        <div className="kpi-card-row" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
            {items.map((item) => (
                <KpiCard key={item.label} {...item} />
            ))}
        </div>
    );
};

export default KpiCard;
