import type { ComponentType } from 'react';
import './DialogHeader.css';

interface DialogHeaderProps {
    icon: ComponentType<{ size?: number }>;
    title: string;
    // Optional, defaults to the usual blue - every existing call site keeps its current look
    // unchanged. Added for a dialog (e.g. RawSku.tsx's Update Stock) that wants its badge to
    // match its own theme instead of the app's default accent.
    badgeColor?: 'blue' | 'green';
}

// Shared header content for every PrimeReact <Dialog header={...}> across the app - an icon
// badge + the title, nothing else (no subtitle) - so every dialog reads consistently instead
// of each one hand-rolling its own icon/title markup and CSS.
const DialogHeader = ({ icon: Icon, title, badgeColor = 'blue' }: DialogHeaderProps) => (
    <div className="dialog-header-with-icon">
        <span className={`dialog-header-icon-badge${badgeColor === 'green' ? ' dialog-header-icon-badge--green' : ''}`}>
            <Icon size={15} />
        </span>
        <span className="dialog-header-icon-title">{title}</span>
    </div>
);
export default DialogHeader;
