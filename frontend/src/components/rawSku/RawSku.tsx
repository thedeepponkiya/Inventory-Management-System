import { useMemo, useRef, useState } from 'react';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { InputTextarea } from 'primereact/inputtextarea';
import { InputNumber } from 'primereact/inputnumber';
import { Dropdown } from 'primereact/dropdown';
import { InputSwitch } from 'primereact/inputswitch';
import { Dialog } from 'primereact/dialog';
import { Toast } from 'primereact/toast';
import { confirmDialog } from 'primereact/confirmdialog';
import { HiOutlinePlus } from 'react-icons/hi2';
import FilterBar, { type FilterField } from '../../common/commonComponents/filterBar/FilterBar';
import DataTable from '../../common/commonComponents/dataTable/DataTable';
import { skuMockData, type Sku } from '../../mockData/skuData';
import { categoryMockData } from '../../mockData/categoryData';
import { locationMockData } from '../../mockData/locationData';
import { DEFAULT_DATA_TYPE_VALUE } from '../../common/constants/commonConstant';
import { getRawSkuColumns } from '../../common/commonFunctions/CommonUtilities';
import { showToast } from '../../common/commonFunctions/commonFunction';
import './RawSku.css';

const emptyForm: Omit<Sku, 'id' | 'code'> = {
    name: DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING, categoryName: DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING, locationName: DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING, unit: 'PCS', currentStock: DEFAULT_DATA_TYPE_VALUE.ZERO, unitPrice: DEFAULT_DATA_TYPE_VALUE.ZERO, reorderLevel: DEFAULT_DATA_TYPE_VALUE.ZERO, description: DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING, status: 'Active',
};

const RawSku = () => {
    const toast = useRef<Toast>(DEFAULT_DATA_TYPE_VALUE.NULL);
    const [skus, setSkus] = useState<Sku[]>(skuMockData);
    const [filters, setFilters] = useState<Record<string, unknown>>({ search: DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING });
    const [panelVisible, setPanelVisible] = useState(DEFAULT_DATA_TYPE_VALUE.FALSE);
    const [form, setForm] = useState(emptyForm);
    const [editingId, setEditingId] = useState<string | null>(DEFAULT_DATA_TYPE_VALUE.NULL);

    const filterFields: FilterField[] = [
        { key: 'search', type: 'search', label: 'Search', placeholder: 'Search by SKU name / code' },
    ];

    const filteredSkus = useMemo(() => {
        const search = (filters.search as string)?.toLowerCase() ?? DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING;
        return skus.filter((sku) => {
            return !search || sku.name.toLowerCase().includes(search) || sku.code.toLowerCase().includes(search);
        });
    }, [skus, filters]);

    const openAddDialog = () => {
        setEditingId(DEFAULT_DATA_TYPE_VALUE.NULL);
        setForm(emptyForm);
        setPanelVisible(DEFAULT_DATA_TYPE_VALUE.TRUE);
    };

    const openEditDialog = (sku: Sku) => {
        setEditingId(sku.id);
        setForm({
            name: sku.name,
            categoryName: sku.categoryName,
            locationName: sku.locationName,
            unit: sku.unit,
            currentStock: sku.currentStock,
            unitPrice: sku.unitPrice,
            reorderLevel: sku.reorderLevel,
            description: sku.description,
            status: sku.status,
        });
        setPanelVisible(DEFAULT_DATA_TYPE_VALUE.TRUE);
    };

    const handleDelete = (sku: Sku) => {
        confirmDialog({
            message: `Delete SKU "${sku.name}"? This cannot be undone.`,
            header: 'Delete SKU',
            icon: 'pi pi-exclamation-triangle',
            acceptClassName: 'p-button-danger',
            accept: () => {
                setSkus((prev) => prev.filter((item) => item.id !== sku.id));
                showToast(toast, 'success', 'Deleted', 'SKU deleted successfully');
            },
        });
    };

    const handleSave = () => {
        if (editingId) {
            setSkus((prev) => prev.map((sku) => (sku.id === editingId ? { ...sku, ...form } : sku)));
            showToast(toast, 'success', 'Updated', 'SKU updated successfully');
        } else {
            const nextCode = `SKU-${String(skus.length + 1).padStart(3, '0')}`;
            setSkus((prev) => [...prev, { id: nextCode, code: nextCode, ...form }]);
            showToast(toast, 'success', 'Created', 'SKU created successfully');
        }
        setForm(emptyForm);
        setEditingId(DEFAULT_DATA_TYPE_VALUE.NULL);
        setPanelVisible(DEFAULT_DATA_TYPE_VALUE.FALSE);
    };

    // toast.current is only read inside handleDelete's own click callback, never during render
    // eslint-disable-next-line react-hooks/refs
    const columns = getRawSkuColumns(openEditDialog, handleDelete);

    return (
        <div className="sku-master-page">
            <Toast ref={toast} />

            <FilterBar
                fields={filterFields}
                values={filters}
                onChange={(key, value) => setFilters((prev) => ({ ...prev, [key]: value }))}
                onReset={() => setFilters({ search: DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING })}
                actions={<Button label="Add SKU" icon={<HiOutlinePlus className="mr-2" />} onClick={openAddDialog} outlined />}
            />

            <DataTable value={filteredSkus} columns={columns} />

            <Dialog
                visible={panelVisible}
                onHide={() => setPanelVisible(DEFAULT_DATA_TYPE_VALUE.FALSE)}
                header={editingId ? 'Edit SKU' : 'Add New SKU'}
                style={{ width: '480px' }}
                footer={
                    <>
                        <Button label="Cancel" outlined onClick={() => setPanelVisible(DEFAULT_DATA_TYPE_VALUE.FALSE)} />
                        <Button label={editingId ? 'Save Changes' : 'Save SKU'} onClick={handleSave} />
                    </>
                }
            >
                <div className="dialog-form-body">
                    <div className="form-field">
                        <label>SKU Name</label>
                        <InputText value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Enter SKU name" />
                    </div>
                    <div className="form-field">
                        <label>Category (Box)</label>
                        <Dropdown
                            value={form.categoryName}
                            onChange={(e) => setForm({ ...form, categoryName: e.value })}
                            options={categoryMockData.map((c) => ({ label: c.name, value: c.name }))}
                            placeholder="Select category"
                        />
                    </div>
                    <div className="form-field">
                        <label>Location</label>
                        <Dropdown
                            value={form.locationName}
                            onChange={(e) => setForm({ ...form, locationName: e.value })}
                            options={locationMockData.map((l) => ({ label: l.name, value: l.name }))}
                            placeholder="Select location"
                        />
                    </div>
                    <div className="form-field">
                        <label>Unit</label>
                        <Dropdown value={form.unit} onChange={(e) => setForm({ ...form, unit: e.value })} options={['PCS', 'KG', 'MTR', 'BOX']} placeholder="Select unit" />
                    </div>
                    <div className="form-field">
                        <label>Unit Price (Rs.)</label>
                        <InputNumber value={form.unitPrice} onValueChange={(e) => setForm({ ...form, unitPrice: e.value ?? DEFAULT_DATA_TYPE_VALUE.ZERO })} mode="decimal" minFractionDigits={2} />
                    </div>
                    <div className="form-field">
                        <label>Reorder Level</label>
                        <InputNumber value={form.reorderLevel} onValueChange={(e) => setForm({ ...form, reorderLevel: e.value ?? DEFAULT_DATA_TYPE_VALUE.ZERO })} />
                    </div>
                    <div className="form-field">
                        <label>Description (Optional)</label>
                        <InputTextarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} placeholder="Enter description" />
                    </div>
                    <div className="form-field form-field--row">
                        <label>Status</label>
                        <InputSwitch checked={form.status === 'Active'} onChange={(e) => setForm({ ...form, status: e.value ? 'Active' : 'Inactive' })} />
                    </div>
                </div>
            </Dialog>
        </div>
    );
};
export default RawSku;
