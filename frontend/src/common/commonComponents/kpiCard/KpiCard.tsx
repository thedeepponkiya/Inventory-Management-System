import type { IconType } from 'react-icons';
import { HiArrowUp, HiArrowDown } from 'react-icons/hi2';
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
    iconBg = '#dbeafe',
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
                <div className="kpi-card-icon" style={{ backgroundColor: iconBg, color: iconColor }}>
                    <Icon size={22} />
                </div>
                <div className="kpi-card-text">
                    <div className="kpi-card-label">{label}</div>
                    <div className="kpi-card-value">{value}</div>
                </div>
            </div>
            {delta && (
                <div className={`kpi-card-delta kpi-card-delta--${delta.direction}`}>
                    {delta.direction === 'up' && <HiArrowUp size={12} />}
                    {delta.direction === 'down' && <HiArrowDown size={12} />}
                    <span>{delta.value}</span>
                </div>
            )}
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
