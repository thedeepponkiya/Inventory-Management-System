import type { IconType } from 'react-icons';
import { HiOutlineInformationCircle, HiOutlineArrowTrendingUp, HiOutlineArrowTrendingDown } from 'react-icons/hi2';
import './KpiCard.css';

export interface KpiCardProps {
    icon: IconType;
    iconColor?: string;
    label: string;
    value: string | number;
    sublabel?: string;
    delta?: { value: string; direction: 'up' | 'down' | 'flat' };
    linkLabel?: string;
    onClick?: () => void;
    // 'plain' (default) matches the Dashboard's icon-only look; 'boxed' renders it inside a
    // rounded, tinted square - opt-in per page rather than a global restyle, since Dashboard's
    // plain look was itself a deliberate earlier change (see git history on this component).
    iconVariant?: 'plain' | 'boxed';
    // 'inline' (default) is the Dashboard's "(value)" suffix; 'pill' renders a standalone
    // tinted chip with a trend arrow (Reports page's design) - same reasoning as iconVariant.
    deltaVariant?: 'inline' | 'pill';
    // Tooltip text for a small (i) icon next to the label - native title attribute, no new
    // popover dependency for what's just a one-line explainer.
    info?: string;
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
    iconVariant = 'plain',
    deltaVariant = 'inline',
    info,
}: KpiCardProps) => {
    return (
        <div className={`kpi-card ${onClick ? 'kpi-card--clickable' : ''}`} onClick={onClick}>
            <div className="kpi-card-top">
                <div
                    className={`kpi-card-icon${iconVariant === 'boxed' ? ' kpi-card-icon--boxed' : ''}`}
                    style={iconVariant === 'boxed' ? { color: iconColor, background: `${iconColor}1a` } : { color: iconColor }}
                >
                    <Icon size={iconVariant === 'boxed' ? 22 : 34} />
                </div>
                <div className="kpi-card-text">
                    <div className="kpi-card-label">
                        {label}
                        {info && <HiOutlineInformationCircle size={13} className="kpi-card-info-icon" title={info} />}
                    </div>
                    <div className="kpi-card-value">
                        {value}
                        {delta && deltaVariant === 'inline' && (
                            <span className={`kpi-card-value-delta kpi-card-value-delta--${delta.direction}`}>({delta.value})</span>
                        )}
                    </div>
                </div>
            </div>
            {sublabel && <div className="kpi-card-sublabel">{sublabel}</div>}
            {delta && deltaVariant === 'pill' && (
                <span className={`kpi-card-delta-pill kpi-card-delta-pill--${delta.direction}`}>
                    {delta.direction === 'up' && <HiOutlineArrowTrendingUp size={12} />}
                    {delta.direction === 'down' && <HiOutlineArrowTrendingDown size={12} />}
                    {delta.value}
                </span>
            )}
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
