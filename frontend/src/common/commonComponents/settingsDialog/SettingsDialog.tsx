import { useRef, useState } from 'react';
import type { ChangeEvent, DragEvent } from 'react';
import { Dialog } from 'primereact/dialog';
import { InputText } from 'primereact/inputtext';
import { InputTextarea } from 'primereact/inputtextarea';
import { Dropdown } from 'primereact/dropdown';
import { Toast } from 'primereact/toast';
import {
    HiOutlinePaintBrush, HiOutlineBuildingOffice2, HiOutlineXMark, HiOutlineCog6Tooth,
    HiOutlineCloudArrowUp, HiOutlineDocumentText, HiOutlineMapPin,
    HiOutlineCalendarDays, HiOutlineSun, HiOutlineMoon, HiOutlineCheck,
} from 'react-icons/hi2';
import { FiSave } from 'react-icons/fi';
import DialogHeader from '../dialogHeader/DialogHeader';
import { settingsMockData } from '../../../mockData/settingsData';
import { DEFAULT_DATA_TYPE_VALUE } from '../../constants/commonConstant';
import { useThemeContext } from '../../../context/ThemeContextDefinition';
import { ACCENT_COLORS, useAccentColorContext } from '../../../context/AccentColorContextDefinition';
import { SIDEBAR_COLORS, useSidebarColorContext } from '../../../context/SidebarColorContextDefinition';
import { useDateFormatContext } from '../../../context/DateFormatContextDefinition';
import { useCompanyLogoContext } from '../../../context/CompanyLogoContextDefinition';
import { useCompanySettingsContext } from '../../../context/CompanySettingsContextDefinition';
import { formatDate, type DateFormatOption } from '../../commonFunctions/dateFormat';
import './SettingsDialog.css';

const financialYears = ['2024-2025', '2025-2026', '2026-2027'];

const today = new Date().toISOString();
const dateFormatOptions: { label: string; value: DateFormatOption }[] = [
    { label: `Short (${formatDate(today, 'short')})`, value: 'short' },
    { label: `Medium (${formatDate(today, 'medium')})`, value: 'medium' },
    { label: `Long (${formatDate(today, 'long')})`, value: 'long' },
];

const tabs = [
    { key: 'general', label: 'General', subtitle: 'Company & basic settings', icon: HiOutlineBuildingOffice2 },
    { key: 'appearance', label: 'Appearance', subtitle: 'Theme, colors & display', icon: HiOutlinePaintBrush },
] as const;

type TabKey = (typeof tabs)[number]['key'];

const themeOptions = [
    { key: 'light', label: 'Light', subtitle: 'Clean, bright interface', icon: HiOutlineSun },
    { key: 'dark', label: 'Dark', subtitle: 'Easier on the eyes', icon: HiOutlineMoon },
] as const;

interface SettingsDialogProps {
    visible: boolean;
    onHide: () => void;
}

const SettingsDialog = ({ visible, onHide }: SettingsDialogProps) => {
    const toast = useRef<Toast>(DEFAULT_DATA_TYPE_VALUE.NULL);
    const [activeTab, setActiveTab] = useState<TabKey>('general');
    const { companyName, setCompanyName, address, setAddress } = useCompanySettingsContext();
    const [gstNumber, setGstNumber] = useState(settingsMockData.gstNumber);
    const [financialYear, setFinancialYear] = useState(settingsMockData.financialYear);
    const { theme, setTheme } = useThemeContext();
    const { dateFormat, setDateFormat } = useDateFormatContext();
    const { companyLogo, setCompanyLogo } = useCompanyLogoContext();
    const { accentColor, accentColorHex, setAccentColor } = useAccentColorContext();
    const { sidebarColor, setSidebarColor } = useSidebarColorContext();

    // Read as a base64 data: URL (not URL.createObjectURL) so the logo can be persisted to
    // localStorage and embedded directly into jsPDF documents via doc.addImage() - applied
    // immediately (not deferred to the Save button) so it takes effect across the system
    // as soon as it's chosen.
    const readLogoFile = (file: File | undefined) => {
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => setCompanyLogo(reader.result as string);
        reader.readAsDataURL(file);
    };

    const handleLogoSelect = (e: ChangeEvent<HTMLInputElement>) => {
        readLogoFile(e.target.files?.[0]);
        e.target.value = DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING;
    };

    const handleLogoDrop = (e: DragEvent<HTMLLabelElement>) => {
        e.preventDefault();
        readLogoFile(e.dataTransfer.files?.[0]);
    };

    const handleSave = () => {
        toast.current?.show({ severity: 'success', summary: 'Settings saved', life: 3000 });
        onHide();
    };

    return (
        <>
            <Toast ref={toast} />
            <Dialog
                visible={visible}
                onHide={onHide}
                header={<DialogHeader icon={HiOutlineCog6Tooth} title="Settings" />}
                className="settings-dialog"
                style={{ width: '760px', maxWidth: '95vw' }}
                footer={
                    <>
                        <button type="button" className="settings-dialog-cancel" onClick={onHide}>Cancel</button>
                        <button type="button" className="settings-dialog-save" onClick={handleSave}>
                            <FiSave size={15} />
                            Save Changes
                        </button>
                    </>
                }
            >
                <div className="settings-dialog-body">
                    <div className="settings-dialog-tabs">
                        {tabs.map((tab) => (
                            <button
                                type="button"
                                key={tab.key}
                                className={`settings-dialog-tab${activeTab === tab.key ? ' settings-dialog-tab--active' : ''}`}
                                onClick={() => setActiveTab(tab.key)}
                            >
                                <span className="settings-dialog-tab-icon">
                                    <tab.icon size={17} />
                                </span>
                                <span className="settings-dialog-tab-text">
                                    <span className="settings-dialog-tab-label">{tab.label}</span>
                                    <span className="settings-dialog-tab-subtitle">{tab.subtitle}</span>
                                </span>
                            </button>
                        ))}
                    </div>

                    <div className="settings-dialog-content">
                        {activeTab === 'general' && (
                            <div className="settings-dialog-grid">
                                <div className="form-field">
                                    <label>Company Name</label>
                                    <div className="settings-field-input">
                                        <span className="settings-field-icon"><HiOutlineBuildingOffice2 size={14} /></span>
                                        <InputText value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
                                    </div>
                                </div>
                                <div className="form-field">
                                    <label>GST Number</label>
                                    <div className="settings-field-input">
                                        <span className="settings-field-icon"><HiOutlineDocumentText size={14} /></span>
                                        <InputText value={gstNumber} onChange={(e) => setGstNumber(e.target.value)} placeholder="Enter GST number" />
                                    </div>
                                </div>
                                <div className="form-field settings-dialog-full">
                                    <label>Address</label>
                                    <div className="settings-field-input settings-field-input--textarea">
                                        <span className="settings-field-icon"><HiOutlineMapPin size={14} /></span>
                                        <InputTextarea value={address} onChange={(e) => setAddress(e.target.value)} rows={2} placeholder="Enter company address" />
                                    </div>
                                </div>
                                <div className="form-field">
                                    <label>Financial Year</label>
                                    <div className="settings-field-input">
                                        <span className="settings-field-icon"><HiOutlineCalendarDays size={14} /></span>
                                        <Dropdown value={financialYear} onChange={(e) => setFinancialYear(e.value)} options={financialYears} />
                                    </div>
                                </div>
                                <div className="form-field">
                                    <label>Date Format</label>
                                    <div className="settings-field-input">
                                        <span className="settings-field-icon"><HiOutlineCalendarDays size={14} /></span>
                                        <Dropdown value={dateFormat} onChange={(e) => setDateFormat(e.value)} options={dateFormatOptions} />
                                    </div>
                                </div>
                                <div className="form-field settings-dialog-full">
                                    <label>Company Logo</label>
                                    <label
                                        className={`settings-dialog-logo-dropzone${companyLogo ? ' settings-dialog-logo-dropzone--filled' : ''}`}
                                        onDragOver={(e) => e.preventDefault()}
                                        onDrop={handleLogoDrop}
                                    >
                                        {companyLogo && (
                                            <>
                                                <div className="settings-dialog-logo-preview">
                                                    <img src={companyLogo} alt="Company logo preview" />
                                                </div>
                                                <button
                                                    type="button"
                                                    className="settings-dialog-logo-remove"
                                                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); setCompanyLogo(null); }}
                                                >
                                                    <HiOutlineXMark size={12} />
                                                </button>
                                            </>
                                        )}
                                        <div className="settings-dialog-logo-dropzone-empty">
                                            <span className="settings-dialog-logo-upload-icon">
                                                <HiOutlineCloudArrowUp size={22} />
                                            </span>
                                            <span className="settings-dialog-logo-dropzone-title">
                                                Drag &amp; drop your logo here or <span className="settings-dialog-logo-browse-link">click to browse</span>
                                            </span>
                                            <span className="settings-dialog-logo-dropzone-hint">PNG, JPG or SVG. Max size 2MB</span>
                                        </div>
                                        <input type="file" accept="image/*" hidden onChange={handleLogoSelect} />
                                    </label>
                                </div>
                            </div>
                        )}

                        {activeTab === 'appearance' && (
                            <div className="settings-appearance">
                                <div className="settings-appearance-intro">
                                    <span className="settings-appearance-intro-title">Appearance</span>
                                    <span className="settings-appearance-intro-subtitle">Customize the look and feel of your workspace.</span>
                                </div>

                                <div className="settings-appearance-section">
                                    <div className="settings-appearance-section-header">
                                        <span className="settings-appearance-section-label">Theme</span>
                                        <span className="settings-appearance-current">
                                            Currently: <strong>{theme === 'dark' ? 'Dark' : 'Light'}</strong>
                                        </span>
                                    </div>
                                    <div className="settings-theme-options">
                                        {themeOptions.map((option) => {
                                            const isSelected = theme === option.key;
                                            return (
                                                <button
                                                    type="button"
                                                    key={option.key}
                                                    className={`settings-theme-card${isSelected ? ' settings-theme-card--active' : ''}`}
                                                    onClick={() => setTheme(option.key)}
                                                >
                                                    {isSelected && (
                                                        <span className="settings-theme-check" style={{ background: accentColorHex }}>
                                                            <HiOutlineCheck size={12} />
                                                        </span>
                                                    )}
                                                    <span className="settings-theme-icon">
                                                        <option.icon size={20} />
                                                    </span>
                                                    <span className="settings-theme-label">{option.label}</span>
                                                    <span className="settings-theme-subtitle">{option.subtitle}</span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                <div className="settings-appearance-section">
                                    <div className="settings-appearance-section-header">
                                        <span className="settings-appearance-section-label">Accent Color</span>
                                    </div>
                                    <div className="settings-accent-options">
                                        {ACCENT_COLORS.map((option) => {
                                            const isSelected = accentColor === option.key;
                                            return (
                                                <button
                                                    type="button"
                                                    key={option.key}
                                                    className={`settings-accent-chip${isSelected ? ' settings-accent-chip--active' : ''}`}
                                                    onClick={() => setAccentColor(option.key)}
                                                    style={isSelected ? { borderColor: option.color, background: `${option.color}14` } : undefined}
                                                >
                                                    <span className="settings-accent-dot" style={{ background: option.color }}>
                                                        {isSelected && <HiOutlineCheck size={11} />}
                                                    </span>
                                                    {option.label}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                <div className="settings-appearance-section">
                                    <div className="settings-appearance-section-header">
                                        <span className="settings-appearance-section-label">Sidebar Background</span>
                                    </div>
                                    <div className="settings-accent-options">
                                        {SIDEBAR_COLORS.map((option) => {
                                            const isSelected = sidebarColor === option.key;
                                            return (
                                                <button
                                                    type="button"
                                                    key={option.key}
                                                    className={`settings-accent-chip${isSelected ? ' settings-accent-chip--active' : ''}`}
                                                    onClick={() => setSidebarColor(option.key)}
                                                    style={isSelected ? { borderColor: option.color, background: `${option.color}14` } : undefined}
                                                >
                                                    <span className="settings-accent-dot" style={{ background: option.color }}>
                                                        {isSelected && <HiOutlineCheck size={11} />}
                                                    </span>
                                                    {option.label}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </Dialog>
        </>
    );
};
export default SettingsDialog;
