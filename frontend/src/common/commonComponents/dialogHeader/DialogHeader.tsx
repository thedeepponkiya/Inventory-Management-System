import type { ComponentType } from 'react';
import './DialogHeader.css';

interface DialogHeaderProps {
    icon: ComponentType<{ size?: number }>;
    title: string;
}

// Shared header content for every PrimeReact <Dialog header={...}> across the app - an icon
// badge + the title, nothing else (no subtitle) - so every dialog reads consistently instead
// of each one hand-rolling its own icon/title markup and CSS.
const DialogHeader = ({ icon: Icon, title }: DialogHeaderProps) => (
    <div className="dialog-header-with-icon">
        <span className="dialog-header-icon-badge">
            <Icon size={15} />
        </span>
        <span className="dialog-header-icon-title">{title}</span>
    </div>
);
export default DialogHeader;
