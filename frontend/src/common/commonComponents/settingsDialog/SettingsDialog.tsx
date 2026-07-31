import { useRef, useState } from 'react';
import { Dialog } from 'primereact/dialog';
import { InputText } from 'primereact/inputtext';
import { InputTextarea } from 'primereact/inputtextarea';
import { Dropdown } from 'primereact/dropdown';
import { SelectButton } from 'primereact/selectbutton';
import { FileUpload, type FileUploadHandlerEvent } from 'primereact/fileupload';
import { Toast } from 'primereact/toast';
import { HiOutlineAdjustmentsHorizontal, HiOutlinePaintBrush } from 'react-icons/hi2';
import { settingsMockData } from '../../../mockData/settingsData';
import { DEFAULT_DATA_TYPE_VALUE } from '../../constants/commonConstant';
import { useThemeContext } from '../../../context/ThemeContextDefinition';
import './SettingsDialog.css';

const financialYears = ['2024-2025', '2025-2026', '2026-2027'];

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
    const [companyName, setCompanyName] = useState(settingsMockData.companyName);
    const [address, setAddress] = useState(settingsMockData.address);
    const [gstNumber, setGstNumber] = useState(settingsMockData.gstNumber);
    const [invoicePrefix, setInvoicePrefix] = useState(settingsMockData.invoicePrefix);
    const [financialYear, setFinancialYear] = useState(settingsMockData.financialYear);
    const { theme, setTheme } = useThemeContext();
    const [logoPreview, setLogoPreview] = useState<string | null>(DEFAULT_DATA_TYPE_VALUE.NULL);

    const handleLogoSelect = (event: FileUploadHandlerEvent) => {
        const file = event.files[0];
        if (file) setLogoPreview(URL.createObjectURL(file));
    };

    const handleSave = () => {
        toast.current?.show({ severity: 'success', summary: 'Settings saved', life: 3000 });
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
                        <button type="button" className="settings-dialog-save" onClick={handleSave}>Save Changes</button>
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
                                    <label>Logo Upload</label>
                                    <FileUpload mode="basic" name="logo" accept="image/*" maxFileSize={2000000} chooseLabel="Choose Logo" customUpload uploadHandler={handleLogoSelect} auto />
                                    {logoPreview && <img src={logoPreview} alt="Company logo preview" className="settings-dialog-logo-preview" />}
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
