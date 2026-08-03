import { useContext, useMemo, useRef, useState } from 'react';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { InputTextarea } from 'primereact/inputtextarea';
import { InputNumber } from 'primereact/inputnumber';
import { Dropdown } from 'primereact/dropdown';
import { InputSwitch } from 'primereact/inputswitch';
import { Dialog } from 'primereact/dialog';
import { Toast } from 'primereact/toast';
import { confirmDialog } from 'primereact/confirmdialog';
import { HiOutlinePlus, HiOutlineCheckCircle } from 'react-icons/hi2';
import FilterBar, { type FilterField } from '../../common/commonComponents/filterBar/FilterBar';
import DataTable from '../../common/commonComponents/dataTable/DataTable';
import { AppContext } from '../../context/AppContextDefinition';
import {
    createRawSku,
    updateRawSku,
    deleteRawSku,
    type RawSku as RawSkuType,
    type RawSkuPayload,
    type InventoryEntryMode,
    type SourceType,
} from '../../services/rawSkuService';
import type { Category } from '../../services/categoryService';
import { DEFAULT_DATA_TYPE_VALUE } from '../../common/constants/commonConstant';
import { getRawSkuColumns, getActionBodyTemplate } from '../../common/commonFunctions/CommonUtilities';
import { showToast } from '../../common/commonFunctions/commonFunction';
import './RawSku.css';

const unitOptions = ['PCS', 'KG', 'MTR', 'BOX'];
const inventoryEntryModeOptions: InventoryEntryMode[] = ['AUTO', 'MANUAL'];
const sourceTypeOptions: SourceType[] = ['Direct Purchase', 'Processed'];

interface RawSkuForm {
    skuName: string;
    categoryId: number | null;
    unit: string;
    inventoryEntryMode: InventoryEntryMode;
    sourceType: SourceType;
    rawMaterialId: number | null;
    minStock: number;
    maxStock: number;
    reorderLevel: number;
    openingStock: number;
    currentStock: number;
    description: string;
    status: 'Active' | 'Inactive';
}

const emptyForm: RawSkuForm = {
    skuName: DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING,
    categoryId: DEFAULT_DATA_TYPE_VALUE.NULL,
    unit: 'PCS',
    inventoryEntryMode: 'MANUAL',
    sourceType: 'Direct Purchase',
    rawMaterialId: DEFAULT_DATA_TYPE_VALUE.NULL,
    minStock: DEFAULT_DATA_TYPE_VALUE.ZERO,
    maxStock: DEFAULT_DATA_TYPE_VALUE.ZERO,
    reorderLevel: DEFAULT_DATA_TYPE_VALUE.ZERO,
    openingStock: DEFAULT_DATA_TYPE_VALUE.ZERO,
    currentStock: DEFAULT_DATA_TYPE_VALUE.ZERO,
    description: DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING,
    status: 'Active',
};

const RawSku = () => {
    const { rawSkus, rawSkusLoading, fetchRawSkus, categories } = useContext(AppContext);
    const toast = useRef<Toast>(DEFAULT_DATA_TYPE_VALUE.NULL);
    const [filters, setFilters] = useState<Record<string, unknown>>({ search: DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING });
    const [panelVisible, setPanelVisible] = useState(DEFAULT_DATA_TYPE_VALUE.FALSE);
    const [form, setForm] = useState<RawSkuForm>(emptyForm);
    const [editingId, setEditingId] = useState<number | null>(DEFAULT_DATA_TYPE_VALUE.NULL);

    const filterFields: FilterField[] = [
        { key: 'search', type: 'search', label: 'Search', placeholder: 'Search by SKU name / code' },
    ];

    const filteredSkus = useMemo(() => {
        const search = (filters.search as string)?.toLowerCase() ?? DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING;
        return (rawSkus as RawSkuType[]).filter((sku) => {
            return !search || sku.skuName.toLowerCase().includes(search) || sku.skuCode.toLowerCase().includes(search);
        });
    }, [rawSkus, filters]);

    // A SKU can't be its own parent raw material, and only "Processed" SKUs have one at all.
    const parentOptions = useMemo(
        () => (rawSkus as RawSkuType[]).filter((sku) => sku.id !== editingId),
        [rawSkus, editingId],
    );

    const openAddDialog = () => {
        setEditingId(DEFAULT_DATA_TYPE_VALUE.NULL);
        setForm(emptyForm);
        setPanelVisible(DEFAULT_DATA_TYPE_VALUE.TRUE);
    };

    const openEditDialog = (sku: RawSkuType) => {
        setEditingId(sku.id);
        setForm({
            skuName: sku.skuName,
            categoryId: sku.categoryId,
            unit: sku.unit,
            inventoryEntryMode: sku.inventoryEntryMode,
            sourceType: sku.sourceType,
            rawMaterialId: sku.rawMaterialId,
            minStock: sku.minStock,
            maxStock: sku.maxStock,
            reorderLevel: sku.reorderLevel,
            openingStock: sku.openingStock,
            currentStock: sku.currentStock,
            description: sku.description ?? DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING,
            status: sku.status,
        });
        setPanelVisible(DEFAULT_DATA_TYPE_VALUE.TRUE);
    };

    const handleDelete = (sku: RawSkuType) => {
        confirmDialog({
            message: `Delete SKU "${sku.skuName}"? This cannot be undone.`,
            header: 'Delete SKU',
            icon: 'pi pi-exclamation-triangle',
            acceptClassName: 'p-button-danger',
            accept: async () => {
                try {
                    await deleteRawSku(sku.id);
                    fetchRawSkus();
                    showToast(toast, 'success', 'Deleted', 'SKU deleted successfully');
                } catch (err) {
                    showToast(toast, 'error', 'Error', err instanceof Error ? err.message : 'Something went wrong');
                }
            },
        });
    };

    const handleSave = async () => {
        if (!form.skuName.trim()) {
            showToast(toast, 'error', 'Error', 'SKU Name is required');
            return;
        }

        const payload: RawSkuPayload = {
            skuName: form.skuName,
            categoryId: form.categoryId,
            unit: form.unit,
            inventoryEntryMode: form.inventoryEntryMode,
            sourceType: form.sourceType,
            rawMaterialId: form.sourceType === 'Processed' ? form.rawMaterialId : DEFAULT_DATA_TYPE_VALUE.NULL,
            minStock: form.minStock,
            maxStock: form.maxStock,
            reorderLevel: form.reorderLevel,
            openingStock: form.openingStock,
            currentStock: form.currentStock,
            description: form.description || DEFAULT_DATA_TYPE_VALUE.NULL,
            status: form.status,
            createdBy: 'Admin User',
        };

        try {
            if (editingId) {
                await updateRawSku(editingId, payload);
                showToast(toast, 'success', 'Updated', 'SKU updated successfully');
            } else {
                await createRawSku(payload);
                showToast(toast, 'success', 'Created', 'SKU created successfully');
            }
            fetchRawSkus();
            setForm(emptyForm);
            setEditingId(DEFAULT_DATA_TYPE_VALUE.NULL);
            setPanelVisible(DEFAULT_DATA_TYPE_VALUE.FALSE);
        } catch (err) {
            showToast(toast, 'error', 'Error', err instanceof Error ? err.message : 'Something went wrong');
        }
    };

    const columns = getRawSkuColumns();

    // toast.current is only read inside handleDelete's own click callback, never during render
    // eslint-disable-next-line react-hooks/refs
    const actionTemplate = getActionBodyTemplate<RawSkuType>({ onEdit: openEditDialog, onDelete: handleDelete });

    return (
        <div className="raw-sku-page">
            <Toast ref={toast} />

            <FilterBar
                fields={filterFields}
                values={filters}
                onChange={(key, value) => setFilters((prev) => ({ ...prev, [key]: value }))}
                onReset={() => setFilters({ search: DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING })}
                actions={<Button label="Add SKU" icon={<HiOutlinePlus className="mr-2" />} onClick={openAddDialog} outlined />}
            />

            <DataTable value={filteredSkus} columns={columns} loading={rawSkusLoading} actionBodyTemplate={actionTemplate} />

            <Dialog
                visible={panelVisible}
                onHide={() => setPanelVisible(DEFAULT_DATA_TYPE_VALUE.FALSE)}
                header={editingId ? 'Edit SKU' : 'Add New SKU'}
                style={{ width: '640px', maxWidth: '95vw' }}
                footer={
                    <>
                        <Button label="Cancel" outlined onClick={() => setPanelVisible(DEFAULT_DATA_TYPE_VALUE.FALSE)} />
                        <Button label="Save" icon={<HiOutlineCheckCircle className="mr-2" />} onClick={handleSave} />
                    </>
                }
            >
                <div className="raw-sku-dialog-grid">
                    <div className="form-field">
                        <label>SKU Name *</label>
                        <InputText value={form.skuName} onChange={(e) => setForm({ ...form, skuName: e.target.value })} placeholder="Enter SKU name" />
                    </div>
                    <div className="form-field">
                        <label>Category</label>
                        <Dropdown
                            value={form.categoryId}
                            onChange={(e) => setForm({ ...form, categoryId: e.value })}
                            options={(categories as Category[]).map((c) => ({ label: c.category, value: c.id }))}
                            placeholder="Select category"
                            showClear
                        />
                    </div>
                    <div className="form-field">
                        <label>Unit</label>
                        <Dropdown value={form.unit} onChange={(e) => setForm({ ...form, unit: e.value })} options={unitOptions} placeholder="Select unit" />
                    </div>
                    <div className="form-field">
                        <label>Inventory Entry Mode</label>
                        <Dropdown value={form.inventoryEntryMode} onChange={(e) => setForm({ ...form, inventoryEntryMode: e.value })} options={inventoryEntryModeOptions} />
                    </div>
                    <div className="form-field">
                        <label>Source Type</label>
                        <Dropdown value={form.sourceType} onChange={(e) => setForm({ ...form, sourceType: e.value })} options={sourceTypeOptions} />
                    </div>
                    {form.sourceType === 'Processed' && (
                        <div className="form-field">
                            <label>Parent Raw Material</label>
                            <Dropdown
                                value={form.rawMaterialId}
                                onChange={(e) => setForm({ ...form, rawMaterialId: e.value })}
                                options={parentOptions.map((sku) => ({ label: `${sku.skuCode} - ${sku.skuName}`, value: sku.id }))}
                                placeholder="Select parent raw material"
                                filter
                                showClear
                            />
                        </div>
                    )}
                    <div className="form-field">
                        <label>Min Stock</label>
                        <InputNumber value={form.minStock} onValueChange={(e) => setForm({ ...form, minStock: e.value ?? DEFAULT_DATA_TYPE_VALUE.ZERO })} />
                    </div>
                    <div className="form-field">
                        <label>Max Stock</label>
                        <InputNumber value={form.maxStock} onValueChange={(e) => setForm({ ...form, maxStock: e.value ?? DEFAULT_DATA_TYPE_VALUE.ZERO })} />
                    </div>
                    <div className="form-field">
                        <label>Reorder Level</label>
                        <InputNumber value={form.reorderLevel} onValueChange={(e) => setForm({ ...form, reorderLevel: e.value ?? DEFAULT_DATA_TYPE_VALUE.ZERO })} />
                    </div>
                    <div className="form-field">
                        <label>Opening Stock</label>
                        <InputNumber
                            value={form.openingStock}
                            onValueChange={(e) => {
                                const openingStock = e.value ?? DEFAULT_DATA_TYPE_VALUE.ZERO;
                                // No transactions have happened yet on a brand-new SKU, so current
                                // stock tracks opening stock until the record is actually saved;
                                // once editing an existing SKU the two are independent.
                                setForm((prev) => ({ ...prev, openingStock, currentStock: editingId ? prev.currentStock : openingStock }));
                            }}
                        />
                    </div>
                    <div className="form-field">
                        <label>Current Stock</label>
                        <InputNumber value={form.currentStock} onValueChange={(e) => setForm({ ...form, currentStock: e.value ?? DEFAULT_DATA_TYPE_VALUE.ZERO })} />
                    </div>
                    <div className="form-field form-field--row">
                        <label>Status</label>
                        <InputSwitch checked={form.status === 'Active'} onChange={(e) => setForm({ ...form, status: e.value ? 'Active' : 'Inactive' })} />
                    </div>
                    <div className="form-field raw-sku-dialog-full">
                        <label>Description (Optional)</label>
                        <InputTextarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} placeholder="Enter description" />
                    </div>
                </div>
            </Dialog>
        </div>
    );
};
export default RawSku;
