import { useRef, useState } from 'react';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { InputText } from 'primereact/inputtext';
import { Toast } from 'primereact/toast';
import type { IconType } from 'react-icons';
import {
    HiOutlineExclamationTriangle,
    HiOutlineCheckCircle,
    HiOutlineTrash,
    HiOutlineLockClosed,
    HiOutlineShieldCheck,
    HiOutlineChevronDown,
    HiOutlineDocumentText,
    HiOutlineShoppingCart,
    HiOutlineTruck,
    HiOutlineClipboardDocumentList,
    HiOutlineArchiveBox,
    HiOutlineTag,
    HiOutlineUser,
    HiOutlineMegaphone,
    HiOutlineUsers,
    HiOutlineCircleStack,
    HiOutlineCog6Tooth,
    HiOutlineCodeBracket,
    HiCheckCircle,
} from 'react-icons/hi2';
import { FaSitemap } from 'react-icons/fa';
import { resetDatabase } from '../../../services/databaseResetService';
import { DEFAULT_DATA_TYPE_VALUE } from '../../constants/commonConstant';
import { showToast } from '../../commonFunctions/commonFunction';
import './DatabaseResetPanel.css';

const CONFIRM_PHRASE = 'RESET';

interface ResetDataItem {
    label: string;
    detail: string;
    icon: IconType;
}

// Kept in sync by hand with backend/src/models/databaseReset.model.js's TABLES_TO_RESET / the
// tables intentionally excluded from it - this list is display-only, the backend is the
// actual source of truth and re-checks everything server-side regardless of what this shows.
const clearedItems: ResetDataItem[] = [
    { label: 'Purchase Orders', detail: 'Orders and their payment history', icon: HiOutlineDocumentText },
    { label: 'Sales Orders', detail: 'Orders and their payment history', icon: HiOutlineShoppingCart },
    { label: 'Material Inward', detail: 'Goods-received records', icon: HiOutlineTruck },
    { label: 'Invoices', detail: 'All generated invoices', icon: HiOutlineClipboardDocumentList },
    { label: 'Inventory', detail: 'On-hand stock records (Inventory Home)', icon: HiOutlineArchiveBox },
    { label: 'BOM', detail: 'Bill of Materials, in-process and completed', icon: FaSitemap },
    { label: 'Finished / Raw SKU', detail: 'SKU catalog and stock levels', icon: HiOutlineTag },
    { label: 'CRM Leads', detail: 'Leads, notes, follow-ups, activity timeline, notifications', icon: HiOutlineUser },
    { label: 'CRM Campaigns', detail: 'Marketing campaigns', icon: HiOutlineMegaphone },
];

const keptItems: ResetDataItem[] = [
    { label: 'Users', detail: 'All accounts - nobody gets locked out', icon: HiOutlineUsers },
    { label: 'Master Data', detail: 'Locations, Category, Product Type, Unit, Vendor, Customer', icon: HiOutlineCircleStack },
    { label: 'CRM Settings', detail: 'Pipeline Stages, Sources, Tags, Meta integration connection', icon: HiOutlineCog6Tooth },
    { label: 'Developer Admin Settings', detail: 'Manage Visibility and every other saved setting', icon: HiOutlineCodeBracket },
];

const checklistItems = [
    'This action cannot be undone.',
    'All cleared data will be permanently deleted.',
    'Please confirm that you want to reset all business data.',
];

// Inline Developer Admin section (rendered directly, no dialog wrapper - matches this page's
// "direct access" convention for Manage Visibility). Deliberately has NO Save/Cancel wiring
// into the page's common toolbar (see DeveloperAdmin.tsx) - there's nothing to "save" here,
// only a single destructive action gated behind its own explicit confirm step.
const DatabaseResetPanel = () => {
    const toast = useRef<Toast>(DEFAULT_DATA_TYPE_VALUE.NULL);
    const [confirmOpen, setConfirmOpen] = useState(DEFAULT_DATA_TYPE_VALUE.FALSE);
    const [confirmText, setConfirmText] = useState('');
    const [resetting, setResetting] = useState(DEFAULT_DATA_TYPE_VALUE.FALSE);

    const closeDialog = () => {
        if (resetting) return;
        setConfirmOpen(DEFAULT_DATA_TYPE_VALUE.FALSE);
        setConfirmText('');
    };

    const handleConfirmReset = async () => {
        setResetting(DEFAULT_DATA_TYPE_VALUE.TRUE);
        try {
            await resetDatabase();
            showToast(toast, 'success', 'Database reset', 'All business data has been cleared. Reloading...');
            // A full reload is the simplest way to guarantee every piece of cached state
            // (AppContext's fetched lists + CRM's separate react-query cache) reflects the
            // now-empty database, instead of hand-picking every fetch function across both.
            window.setTimeout(() => window.location.reload(), 1200);
        } catch (err) {
            showToast(toast, 'error', 'Error', err instanceof Error ? err.message : 'Failed to reset database');
            setResetting(DEFAULT_DATA_TYPE_VALUE.FALSE);
        }
    };

    const renderCard = (variant: 'danger' | 'info', title: string, subtitle: string, icon: IconType, items: ResetDataItem[]) => {
        const Icon = icon;
        return (
            <div className={`database-reset-card database-reset-card--${variant}`}>
                <div className="database-reset-card-header">
                    <span className={`database-reset-badge database-reset-badge--${variant} database-reset-badge--lg`}>
                        <Icon size={20} />
                    </span>
                    <div className="database-reset-card-header-text">
                        <h3>{title}</h3>
                        <p>{subtitle}</p>
                    </div>
                </div>
                <div className="database-reset-item-list">
                    {items.map((item) => (
                        <div className="database-reset-item" key={item.label}>
                            <span className={`database-reset-badge database-reset-badge--${variant}`}>
                                <item.icon size={16} />
                            </span>
                            <div className="database-reset-item-text">
                                <span className="database-reset-item-label">{item.label}</span>
                                <span className="database-reset-item-detail">{item.detail}</span>
                            </div>
                            <HiOutlineChevronDown size={16} className="database-reset-item-chevron" />
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    return (
        <div className="database-reset-panel">
            <Toast ref={toast} />

            <div className="database-reset-header">
                <h2>Database Reset</h2>
                <p>Permanently clear or keep specific data. This action cannot be undone.</p>
            </div>

            <div className="database-reset-warning">
                <HiOutlineExclamationTriangle size={22} className="database-reset-warning-icon" />
                <div>
                    <strong>This action is permanent and cannot be undone.</strong>
                    <p>It clears real business data from the live database. There is no backup/restore for this action - once confirmed, the data is gone.</p>
                </div>
            </div>

            <div className="database-reset-groups">
                {renderCard('danger', 'Will be cleared', 'The following data will be permanently deleted.', HiOutlineTrash, clearedItems)}
                {renderCard('info', 'Will be kept', 'The following data will be retained.', HiOutlineLockClosed, keptItems)}
            </div>

            <div className="database-reset-checklist-card">
                <div className="database-reset-card-header">
                    <span className="database-reset-badge database-reset-badge--purple database-reset-badge--lg">
                        <HiOutlineShieldCheck size={20} />
                    </span>
                    <div className="database-reset-card-header-text">
                        <h3>Before you continue</h3>
                    </div>
                </div>
                <ul className="database-reset-checklist">
                    {checklistItems.map((text) => (
                        <li key={text}>
                            <HiCheckCircle size={17} className="database-reset-checklist-icon" />
                            <span>{text}</span>
                        </li>
                    ))}
                </ul>
            </div>

            <div className="database-reset-action">
                <Button
                    label="Reset All Business Data"
                    severity="danger"
                    icon={<HiOutlineExclamationTriangle className="mr-2" />}
                    onClick={() => setConfirmOpen(DEFAULT_DATA_TYPE_VALUE.TRUE)}
                />
            </div>

            <Dialog
                header="Confirm Database Reset"
                visible={confirmOpen}
                onHide={closeDialog}
                style={{ width: '460px' }}
                breakpoints={{ '640px': '95vw' }}
                closable={!resetting}
                closeOnEscape={!resetting}
            >
                <p className="database-reset-dialog-text">
                    This will permanently delete every Purchase Order, Sales Order, Material Inward, Invoice, Inventory record, BOM, Finished/Raw SKU, and CRM Lead/Campaign. Users and master data will not be affected.
                </p>
                <p className="database-reset-dialog-text">
                    Type <strong>{CONFIRM_PHRASE}</strong> below to confirm.
                </p>
                <InputText
                    value={confirmText}
                    onChange={(e) => setConfirmText(e.target.value)}
                    placeholder={CONFIRM_PHRASE}
                    className="database-reset-dialog-input"
                    disabled={resetting}
                    autoFocus
                />
                <div className="database-reset-dialog-actions">
                    <Button label="Cancel" outlined onClick={closeDialog} disabled={resetting} />
                    <Button
                        label={resetting ? 'Resetting...' : 'Confirm Reset'}
                        severity="danger"
                        icon={<HiOutlineCheckCircle className="mr-2" />}
                        onClick={handleConfirmReset}
                        disabled={confirmText !== CONFIRM_PHRASE || resetting}
                        loading={resetting}
                    />
                </div>
            </Dialog>
        </div>
    );
};

export default DatabaseResetPanel;
