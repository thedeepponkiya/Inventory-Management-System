import { useRef, useState } from 'react';
import { Dialog } from 'primereact/dialog';
import { InputText } from 'primereact/inputtext';
import { InputTextarea } from 'primereact/inputtextarea';
import { Dropdown } from 'primereact/dropdown';
import { SelectButton } from 'primereact/selectbutton';
import { FileUpload, type FileUploadHandlerEvent } from 'primereact/fileupload';
import { Toast } from 'primereact/toast';
import { HiOutlineAdjustmentsHorizontal, HiOutlinePaintBrush } from 'react-icons/hi2';
import { useDataContext } from '../../../context/DataContext';
import { DEFAULT_DATA_TYPE_VALUE } from '../../constants/commonConstant';
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
    const { settings, updateSettings } = useDataContext();
    const toast = useRef<Toast>(DEFAULT_DATA_TYPE_VALUE.NULL);
    const [activeTab, setActiveTab] = useState<TabKey>('general');
    const [companyName, setCompanyName] = useState(DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING);
    const [address, setAddress] = useState(DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING);
    const [gstNumber, setGstNumber] = useState(DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING);
    const [invoicePrefix, setInvoicePrefix] = useState(DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING);
    const [financialYear, setFinancialYear] = useState('2025-2026');
    const [theme, setTheme] = useState('Light');
    const [logoPreview, setLogoPreview] = useState<string | null>(DEFAULT_DATA_TYPE_VALUE.NULL);

    // useState's initializer only runs on first mount, so once settings.data resolves
    // (or is updated by a save) these fields must be reseeded. Adjusted during render
    // (React's recommended pattern for this), not in a useEffect, to avoid an extra
    // render pass.
    const [syncedSettingsData, setSyncedSettingsData] = useState(settings.data);
    if (settings.data !== syncedSettingsData) {
        setSyncedSettingsData(settings.data);
        setCompanyName(settings.data.companyName);
        setAddress(settings.data.address);
        setGstNumber(settings.data.gstNumber);
        setInvoicePrefix(settings.data.invoicePrefix);
        setFinancialYear(settings.data.financialYear);
        setTheme(settings.data.theme);
    }

    const handleLogoSelect = (event: FileUploadHandlerEvent) => {
        const file = event.files[0];
        if (file) setLogoPreview(URL.createObjectURL(file));
    };

    const handleSave = async () => {
        await updateSettings({ companyName, address, gstNumber, invoicePrefix, financialYear, theme });
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
                                    <SelectButton value={theme} onChange={(e) => e.value && setTheme(e.value)} options={['Light', 'Dark']} />
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
