import { useContext, useMemo, useRef, useState } from 'react';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { InputTextarea } from 'primereact/inputtextarea';
import { InputNumber } from 'primereact/inputnumber';
import { Dropdown } from 'primereact/dropdown';
import { Dialog } from 'primereact/dialog';
import { Toast } from 'primereact/toast';
import { confirmDialog } from 'primereact/confirmdialog';
import { HiOutlinePlus, HiOutlineCheckCircle } from 'react-icons/hi2';
import FilterBar, { type FilterField } from '../../common/commonComponents/filterBar/FilterBar';
import DataTable from '../../common/commonComponents/dataTable/DataTable';
import { AppContext } from '../../context/AppContextDefinition';
import { useDateFormatContext } from '../../context/DateFormatContextDefinition';
import { createRawSku, updateRawSku, deleteRawSku, getNextSkuCode, type RawSku as RawSkuType, type RawSkuPayload } from '../../services/rawSkuService';
import type { Category } from '../../services/categoryService';
import type { ProductType } from '../../services/productTypeService';
import type { Unit } from '../../services/unitService';
import type { Location as LocationRecord } from '../../services/locationService';
import { DEFAULT_DATA_TYPE_VALUE } from '../../common/constants/commonConstant';
import { getRawSkuColumns, getActionBodyTemplate } from '../../common/commonFunctions/CommonUtilities';
import { showToast } from '../../common/commonFunctions/commonFunction';
import './RawSku.css';

interface RawSkuForm {
    skuName: string;
    categoryId: number | null;
    productTypeId: number | null;
    locationId: number | null;
    unit: string;
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
    productTypeId: DEFAULT_DATA_TYPE_VALUE.NULL,
    locationId: DEFAULT_DATA_TYPE_VALUE.NULL,
    unit: 'PCS',
    minStock: DEFAULT_DATA_TYPE_VALUE.ZERO,
    maxStock: DEFAULT_DATA_TYPE_VALUE.ZERO,
    reorderLevel: DEFAULT_DATA_TYPE_VALUE.ZERO,
    openingStock: DEFAULT_DATA_TYPE_VALUE.ZERO,
    currentStock: DEFAULT_DATA_TYPE_VALUE.ZERO,
    description: DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING,
    status: 'Active',
};

const RawSku = () => {
    const { rawSkus, rawSkusLoading, fetchRawSkus, categories, productTypes, units, locations } = useContext(AppContext);
    const { dateFormat } = useDateFormatContext();
    const toast = useRef<Toast>(DEFAULT_DATA_TYPE_VALUE.NULL);
    const [filters, setFilters] = useState<Record<string, unknown>>({ search: DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING });
    const [panelVisible, setPanelVisible] = useState(DEFAULT_DATA_TYPE_VALUE.FALSE);
    const [form, setForm] = useState<RawSkuForm>(emptyForm);
    const [editingId, setEditingId] = useState<number | null>(DEFAULT_DATA_TYPE_VALUE.NULL);
    const [editingSkuCode, setEditingSkuCode] = useState(DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING);
    const [previewSkuCode, setPreviewSkuCode] = useState(DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING);

    const filterFields: FilterField[] = [
        { key: 'search', type: 'search', label: 'Search', placeholder: 'Search by SKU name / code' },
    ];

    const filteredSkus = useMemo(() => {
        const search = (filters.search as string)?.toLowerCase() ?? DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING;
        return (rawSkus as RawSkuType[]).filter((sku) => {
            return !search || sku.skuName.toLowerCase().includes(search) || sku.skuCode.toLowerCase().includes(search);
        });
    }, [rawSkus, filters]);

    const openAddDialog = async () => {
        setEditingId(DEFAULT_DATA_TYPE_VALUE.NULL);
        setEditingSkuCode(DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING);
        setForm(emptyForm);
        setPanelVisible(DEFAULT_DATA_TYPE_VALUE.TRUE);
        try {
            setPreviewSkuCode(await getNextSkuCode());
        } catch {
            setPreviewSkuCode(DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING);
        }
    };

    const openEditDialog = (sku: RawSkuType) => {
        setEditingId(sku.id);
        setEditingSkuCode(sku.skuCode);
        setForm({
            skuName: sku.skuName,
            categoryId: sku.categoryId,
            productTypeId: sku.productTypeId,
            locationId: sku.locationId,
            unit: sku.unit,
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
            productTypeId: form.productTypeId,
            locationId: form.locationId,
            unit: form.unit,
            // These are no longer surfaced in the UI (see RawSku.tsx history) - inertly
            // default them since RawSkuPayload still requires them and no automation reads
            // any of these fields today (same Tier-1 scoping as when they were first added).
            inventoryEntryMode: 'MANUAL',
            sourceType: 'Direct Purchase',
            rawMaterialId: DEFAULT_DATA_TYPE_VALUE.NULL,
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

    const handleToggleStatus = async (sku: RawSkuType) => {
        try {
            await updateRawSku(sku.id, { status: sku.status === 'Active' ? 'Inactive' : 'Active' });
            fetchRawSkus();
            showToast(toast, 'success', 'Updated', 'SKU status updated successfully');
        } catch (err) {
            showToast(toast, 'error', 'Error', err instanceof Error ? err.message : 'Something went wrong');
        }
    };

    // toast.current is only read inside handleToggleStatus's own async callback, never during render
    // eslint-disable-next-line react-hooks/refs
    const columns = getRawSkuColumns(dateFormat, handleToggleStatus, openEditDialog);

    // toast.current is only read inside handleDelete's own click callback, never during render
    // eslint-disable-next-line react-hooks/refs
    const actionTemplate = getActionBodyTemplate<RawSkuType>({ onDelete: handleDelete });

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
                <div className="raw-sku-dialog-body">
                    <div className="raw-sku-form-section">
                        <h3 className="raw-sku-form-section-title">Basic Information</h3>
                        <div className="raw-sku-dialog-grid">
                            <div className="form-field">
                                <label>SKU Code</label>
                                <InputText value={editingId ? editingSkuCode : (previewSkuCode || 'Generating...')} disabled />
                            </div>
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
                                <label>Product Type</label>
                                <Dropdown
                                    value={form.productTypeId}
                                    onChange={(e) => setForm({ ...form, productTypeId: e.value })}
                                    options={(productTypes as ProductType[]).map((t) => ({ label: t.productType, value: t.id }))}
                                    placeholder="Select product type"
                                    showClear
                                />
                            </div>
                            <div className="form-field">
                                <label>Unit</label>
                                <Dropdown value={form.unit} onChange={(e) => setForm({ ...form, unit: e.value })} options={(units as Unit[]).map((u) => u.unit)} placeholder="Select unit" />
                            </div>
                            <div className="form-field">
                                <label>Location</label>
                                <Dropdown
                                    value={form.locationId}
                                    onChange={(e) => setForm({ ...form, locationId: e.value })}
                                    options={(locations as LocationRecord[]).map((l) => ({ label: l.location, value: l.id }))}
                                    placeholder="Select location"
                                    filter
                                    showClear
                                />
                            </div>
                        </div>
                    </div>

                    <div className="raw-sku-form-section">
                        <h3 className="raw-sku-form-section-title">Stock Levels</h3>
                        <div className="raw-sku-dialog-grid">
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
                        </div>
                    </div>

                    <div className="raw-sku-form-section">
                        <h3 className="raw-sku-form-section-title">Additional Details</h3>
                        <div className="form-field">
                            <label>Description (Optional)</label>
                            <InputTextarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} placeholder="Enter description" />
                        </div>
                    </div>
                </div>
            </Dialog>
        </div>
    );
};
export default RawSku;