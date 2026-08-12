import { useContext, useRef, useState } from 'react';
import type { ChangeEvent, DragEvent } from 'react';
import { Dialog } from 'primereact/dialog';
import { InputText } from 'primereact/inputtext';
import { InputTextarea } from 'primereact/inputtextarea';
import { Dropdown } from 'primereact/dropdown';
import { SelectButton } from 'primereact/selectbutton';
import { Toast } from 'primereact/toast';
import { HiOutlineAdjustmentsHorizontal, HiOutlinePaintBrush, HiOutlineCheckCircle, HiOutlineBuildingOffice2, HiOutlineXMark, HiOutlineEyeSlash } from 'react-icons/hi2';
import { settingsMockData } from '../../../mockData/settingsData';
import { DEFAULT_DATA_TYPE_VALUE } from '../../constants/commonConstant';
import { useThemeContext } from '../../../context/ThemeContextDefinition';
import { useDateFormatContext } from '../../../context/DateFormatContextDefinition';
import { useCompanyLogoContext } from '../../../context/CompanyLogoContextDefinition';
import { useCompanySettingsContext } from '../../../context/CompanySettingsContextDefinition';
import { AppContext } from '../../../context/AppContextDefinition';
import { formatDate, type DateFormatOption } from '../../commonFunctions/dateFormat';
import VisibilitySettingsDialog from '../visibilitySettingsDialog/VisibilitySettingsDialog';
import './SettingsDialog.css';

const financialYears = ['2024-2025', '2025-2026', '2026-2027'];

const today = new Date().toISOString();
const dateFormatOptions: { label: string; value: DateFormatOption }[] = [
    { label: `Short (${formatDate(today, 'short')})`, value: 'short' },
    { label: `Medium (${formatDate(today, 'medium')})`, value: 'medium' },
    { label: `Long (${formatDate(today, 'long')})`, value: 'long' },
];

const tabs = [
    { key: 'general', label: 'General', icon: HiOutlineAdjustmentsHorizontal },
    { key: 'appearance', label: 'Appearance', icon: HiOutlinePaintBrush },
] as const;

type TabKey = (typeof tabs)[number]['key'];

interface SettingsDialogProps {
    visible: boolean;
    onHide: () => void;
}

const SettingsDialog = ({ visible, onHide }: SettingsDialogProps) => {
    const toast = useRef<Toast>(DEFAULT_DATA_TYPE_VALUE.NULL);
    const [activeTab, setActiveTab] = useState<TabKey>('general');
    const { companyName, setCompanyName, address, setAddress } = useCompanySettingsContext();
    const [gstNumber, setGstNumber] = useState(settingsMockData.gstNumber);
    const [invoicePrefix, setInvoicePrefix] = useState(settingsMockData.invoicePrefix);
    const [financialYear, setFinancialYear] = useState(settingsMockData.financialYear);
    const { theme, setTheme } = useThemeContext();
    const { dateFormat, setDateFormat } = useDateFormatContext();
    const { companyLogo, setCompanyLogo } = useCompanyLogoContext();
    const { fetchUiVisibility } = useContext(AppContext);
    const [visibilityDialogOpen, setVisibilityDialogOpen] = useState(DEFAULT_DATA_TYPE_VALUE.FALSE);

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
                header="Settings"
                className="settings-dialog"
                style={{ width: '760px', maxWidth: '95vw' }}
                footer={
                    <>
                        <button type="button" className="settings-dialog-cancel" onClick={onHide}>Cancel</button>
                        <button type="button" className="settings-dialog-save" onClick={handleSave}>
                            <HiOutlineCheckCircle className="mr-2" />
                            Save
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
                                <tab.icon size={17} />
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    <div className="settings-dialog-content">
                        {activeTab === 'general' && (
                            <div className="settings-dialog-grid">
                                <div className="form-field">
                                    <label>Company Name</label>
                                    <InputText value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
                                </div>
                                <div className="form-field">
                                    <label>GST Number</label>
                                    <InputText value={gstNumber} onChange={(e) => setGstNumber(e.target.value)} placeholder="Enter GST number" />
                                </div>
                                <div className="form-field settings-dialog-full">
                                    <label>Address</label>
                                    <InputTextarea value={address} onChange={(e) => setAddress(e.target.value)} rows={2} placeholder="Enter company address" />
                                </div>
                                <div className="form-field">
                                    <label>Invoice Prefix</label>
                                    <InputText value={invoicePrefix} onChange={(e) => setInvoicePrefix(e.target.value)} />
                                </div>
                                <div className="form-field">
                                    <label>Financial Year</label>
                                    <Dropdown value={financialYear} onChange={(e) => setFinancialYear(e.value)} options={financialYears} />
                                </div>
                                <div className="form-field">
                                    <label>Date Format</label>
                                    <Dropdown value={dateFormat} onChange={(e) => setDateFormat(e.value)} options={dateFormatOptions} />
                                </div>
                                <div className="form-field settings-dialog-full">
                                    <label>Company Logo</label>
                                    <label className="settings-dialog-logo-dropzone" onDragOver={(e) => e.preventDefault()} onDrop={handleLogoDrop}>
                                        {companyLogo ? (
                                            <>
                                                <img src={companyLogo} alt="Company logo preview" />
                                                <span className="settings-dialog-logo-dropzone-hint">Drag &amp; drop or click to replace</span>
                                                <button
                                                    type="button"
                                                    className="settings-dialog-logo-remove"
                                                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); setCompanyLogo(null); }}
                                                >
                                                    <HiOutlineXMark size={12} />
                                                </button>
                                            </>
                                        ) : (
                                            <div className="settings-dialog-logo-dropzone-empty">
                                                <HiOutlineBuildingOffice2 size={26} />
                                                <span>Drag &amp; drop logo here or click to upload</span>
                                            </div>
                                        )}
                                        <input type="file" accept="image/*" hidden onChange={handleLogoSelect} />
                                    </label>
                                </div>
                            </div>
                        )}

                        {activeTab === 'appearance' && (
                            <div className="settings-dialog-grid">
                                <div className="form-field">
                                    <label>Theme</label>
                                    <SelectButton
                                        value={theme === 'dark' ? 'Dark' : 'Light'}
                                        onChange={(e) => e.value && setTheme(e.value === 'Dark' ? 'dark' : 'light')}
                                        options={['Light', 'Dark']}
                                    />
                                </div>
                                <div className="form-field settings-dialog-full">
                                    <label>Menu &amp; Quick Action Visibility</label>
                                    <button type="button" className="settings-dialog-visibility-btn" onClick={() => setVisibilityDialogOpen(DEFAULT_DATA_TYPE_VALUE.TRUE)}>
                                        <HiOutlineEyeSlash size={16} />
                                        Manage Visibility
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </Dialog>

            <VisibilitySettingsDialog
                visible={visibilityDialogOpen}
                onHide={() => setVisibilityDialogOpen(DEFAULT_DATA_TYPE_VALUE.FALSE)}
                onSaved={fetchUiVisibility}
            />
        </>
    );
};
export default SettingsDialog;
