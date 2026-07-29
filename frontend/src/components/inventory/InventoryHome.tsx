import { useMemo, useRef, useState } from 'react';
import type { ChangeEvent, DragEvent } from 'react';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { InputNumber } from 'primereact/inputnumber';
import { Dropdown } from 'primereact/dropdown';
import { InputSwitch } from 'primereact/inputswitch';
import { Dialog } from 'primereact/dialog';
import { Toast } from 'primereact/toast';
import { confirmDialog } from 'primereact/confirmdialog';
import { HiOutlinePlus, HiOutlineCube, HiOutlineXMark } from 'react-icons/hi2';
import FilterBar, { type FilterField } from '../../common/commonComponents/filterBar/FilterBar';
import DataTable from '../../common/commonComponents/dataTable/DataTable';
import { inventoryHomeMockData, type InventoryItem, type AssemblyLine } from '../../mockData/inventoryHomeData';
import { categoryMockData } from '../../mockData/categoryData';
import { productTypeMockData } from '../../mockData/productTypeData';
import { locationMockData } from '../../mockData/locationData';
import { skuMockData } from '../../mockData/skuData';
import { DEFAULT_DATA_TYPE_VALUE } from '../../common/constants/commonConstant';
import { getInventoryHomeColumns, getInventoryHomeAssemblyColumns, type AssemblyRow } from '../../common/commonFunctions/CommonUtilities';
import { showToast } from '../../common/commonFunctions/commonFunction';
import './InventoryHome.css';

let nextAssemblyRowId = 1;
const emptyAssemblyRow = (): AssemblyRow => ({ rowId: nextAssemblyRowId++, skuCode: DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING, skuName: DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING, quantity: 1 });
const rowsFromAssembly = (assembly: AssemblyLine[]): AssemblyRow[] => assembly.map((line) => ({ ...line, rowId: nextAssemblyRowId++ }));

const emptyForm: Omit<InventoryItem, 'id' | 'createdDate' | 'assembly'> = {
    images: [], skuId: DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING, productName: DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING, categoryName: DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING, productType: DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING, barcode: DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING, quantity: DEFAULT_DATA_TYPE_VALUE.ZERO, unit: 'PCS', locationName: DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING, status: 'Active', unitCost: DEFAULT_DATA_TYPE_VALUE.ZERO,
};

const InventoryHome = () => {
    const toast = useRef<Toast>(DEFAULT_DATA_TYPE_VALUE.NULL);
    const [inventoryHomeItems, setInventoryHomeItems] = useState<InventoryItem[]>(inventoryHomeMockData);
    const [filters, setFilters] = useState<Record<string, unknown>>({ search: DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING });
    const [panelVisible, setPanelVisible] = useState(DEFAULT_DATA_TYPE_VALUE.FALSE);
    const [activeDialogTab, setActiveDialogTab] = useState<'details' | 'assembly'>('details');
    const [form, setForm] = useState(emptyForm);
    const [assemblyRows, setAssemblyRows] = useState<AssemblyRow[]>([]);
    const [activeImageIndex, setActiveImageIndex] = useState(DEFAULT_DATA_TYPE_VALUE.ZERO);
    const [editingId, setEditingId] = useState<string | null>(DEFAULT_DATA_TYPE_VALUE.NULL);

    const filterFields: FilterField[] = [
        { key: 'search', type: 'search', label: 'Search', placeholder: 'Search by SKU ID or product name' },
    ];

    const filteredItems = useMemo(() => {
        const search = (filters.search as string)?.toLowerCase() ?? DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING;
        return inventoryHomeItems.filter((item) => {
            return !search || item.skuId.toLowerCase().includes(search) || item.productName.toLowerCase().includes(search);
        });
    }, [inventoryHomeItems, filters]);

    const addAssemblyRow = () => {
        setAssemblyRows((prev) => [...prev, emptyAssemblyRow()]);
    };

    const updateAssemblyRow = (rowId: number, patch: Partial<AssemblyRow>) => {
        setAssemblyRows((prev) => prev.map((row) => (row.rowId === rowId ? { ...row, ...patch } : row)));
    };

    const removeAssemblyRow = (rowId: number) => {
        setAssemblyRows((prev) => prev.filter((row) => row.rowId !== rowId));
    };

    const addImages = (files: FileList | null) => {
        if (!files || files.length === 0) return;
        const newUrls = Array.from(files).map((file) => URL.createObjectURL(file));
        setForm((prev) => {
            setActiveImageIndex(prev.images.length);
            return { ...prev, images: [...prev.images, ...newUrls] };
        });
    };

    const handleImagesSelect = (e: ChangeEvent<HTMLInputElement>) => {
        addImages(e.target.files);
        e.target.value = DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING;
    };

    const handleImageDrop = (e: DragEvent<HTMLLabelElement>) => {
        e.preventDefault();
        addImages(e.dataTransfer.files);
    };

    const removeImage = (index: number) => {
        setForm((prev) => ({ ...prev, images: prev.images.filter((_, i) => i !== index) }));
        setActiveImageIndex((prev) => (prev >= index ? Math.max(0, prev - 1) : prev));
    };

    const openAddDialog = () => {
        setEditingId(DEFAULT_DATA_TYPE_VALUE.NULL);
        setForm(emptyForm);
        setAssemblyRows([]);
        setActiveDialogTab('details');
        setActiveImageIndex(DEFAULT_DATA_TYPE_VALUE.ZERO);
        setPanelVisible(DEFAULT_DATA_TYPE_VALUE.TRUE);
    };

    const openEditDialog = (item: InventoryItem) => {
        setEditingId(item.id);
        setForm({
            images: item.images,
            skuId: item.skuId,
            productName: item.productName,
            categoryName: item.categoryName,
            productType: item.productType,
            barcode: item.barcode,
            quantity: item.quantity,
            unit: item.unit,
            locationName: item.locationName,
            status: item.status,
            unitCost: item.unitCost,
        });
        setAssemblyRows(rowsFromAssembly(item.assembly));
        setActiveDialogTab('details');
        setActiveImageIndex(DEFAULT_DATA_TYPE_VALUE.ZERO);
        setPanelVisible(DEFAULT_DATA_TYPE_VALUE.TRUE);
    };

    const handleDelete = (item: InventoryItem) => {
        confirmDialog({
            message: `Delete inventory item "${item.productName}"? This cannot be undone.`,
            header: 'Delete Inventory Item',
            icon: 'pi pi-exclamation-triangle',
            acceptClassName: 'p-button-danger',
            accept: () => {
                setInventoryHomeItems((prev) => prev.filter((i) => i.id !== item.id));
                showToast(toast, 'success', 'Deleted', 'Inventory item deleted successfully');
            },
        });
    };

    const handleSave = () => {
        const assembly = assemblyRows.map(({ skuCode, skuName, quantity }) => ({ skuCode, skuName, quantity }));
        if (editingId) {
            setInventoryHomeItems((prev) => prev.map((item) => (item.id === editingId ? { ...item, ...form, assembly } : item)));
            showToast(toast, 'success', 'Updated', 'Inventory item updated successfully');
        } else {
            const createdDate = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
            setInventoryHomeItems((prev) => [...prev, { id: form.skuId, createdDate, ...form, assembly }]);
            showToast(toast, 'success', 'Created', 'Inventory item created successfully');
        }
        setForm(emptyForm);
        setAssemblyRows([]);
        setActiveDialogTab('details');
        setActiveImageIndex(DEFAULT_DATA_TYPE_VALUE.ZERO);
        setEditingId(DEFAULT_DATA_TYPE_VALUE.NULL);
        setPanelVisible(DEFAULT_DATA_TYPE_VALUE.FALSE);
    };

    // toast.current is only read inside handleDelete's own click callback, never during render
    // eslint-disable-next-line react-hooks/refs
    const columns = getInventoryHomeColumns(openEditDialog, handleDelete);

    const assemblyColumns = getInventoryHomeAssemblyColumns(assemblyRows, skuMockData, updateAssemblyRow, removeAssemblyRow);

    return (
        <div className="inventory-home-page">
            <Toast ref={toast} />

            <FilterBar
                fields={filterFields}
                values={filters}
                onChange={(key, value) => setFilters((prev) => ({ ...prev, [key]: value }))}
                onReset={() => setFilters({ search: DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING })}
                actions={<Button label="Add New Item" icon={<HiOutlinePlus className="mr-2" />} onClick={openAddDialog} outlined />}
            />

            <DataTable value={filteredItems} columns={columns} />

            <Dialog
                visible={panelVisible}
                onHide={() => setPanelVisible(DEFAULT_DATA_TYPE_VALUE.FALSE)}
                header={editingId ? 'Edit Inventory Item' : 'Add New Inventory Item'}
                style={{ width: '860px', maxWidth: '95vw' }}
                footer={
                    <>
                        <Button label="Cancel" outlined onClick={() => setPanelVisible(DEFAULT_DATA_TYPE_VALUE.FALSE)} />
                        <Button label={editingId ? 'Save Changes' : 'Save Item'} onClick={handleSave} />
                    </>
                }
            >
                <div className="inventory-home-dialog-tabs">
                    <button
                        type="button"
                        className={`inventory-home-dialog-tab${activeDialogTab === 'details' ? ' inventory-home-dialog-tab--active' : ''}`}
                        onClick={() => setActiveDialogTab('details')}
                    >
                        Inventory Details
                    </button>
                    <button
                        type="button"
                        className={`inventory-home-dialog-tab${activeDialogTab === 'assembly' ? ' inventory-home-dialog-tab--active' : ''}`}
                        onClick={() => setActiveDialogTab('assembly')}
                    >
                        Product Assembly
                    </button>
                </div>

                {activeDialogTab === 'details' && (
                    <div className="dialog-form-body">
                        <div className="inventory-home-form-columns">
                            <div className="inventory-home-form-main">
                                <div className="inventory-home-form-section">
                                    <h3 className="inventory-home-form-section-title">Basic Information</h3>
                                    <div className="inventory-home-form-grid">
                                        <div className="form-field">
                                            <label>SKU (ID)</label>
                                            <InputText value={form.skuId} onChange={(e) => setForm({ ...form, skuId: e.target.value })} placeholder="e.g. SKU-014" />
                                        </div>
                                        <div className="form-field">
                                            <label>Product Name</label>
                                            <InputText value={form.productName} onChange={(e) => setForm({ ...form, productName: e.target.value })} placeholder="Enter product name" />
                                        </div>
                                        <div className="form-field">
                                            <label>Category</label>
                                            <Dropdown
                                                value={form.categoryName}
                                                onChange={(e) => setForm({ ...form, categoryName: e.value })}
                                                options={categoryMockData.map((c) => ({ label: c.name, value: c.name }))}
                                                placeholder="Select category"
                                            />
                                        </div>
                                        <div className="form-field">
                                            <label>Product Type</label>
                                            <Dropdown
                                                value={form.productType}
                                                onChange={(e) => setForm({ ...form, productType: e.value })}
                                                options={productTypeMockData.map((t) => ({ label: t.name, value: t.name }))}
                                                placeholder="Select product type"
                                            />
                                        </div>
                                        <div className="form-field">
                                            <label>Barcode</label>
                                            <InputText value={form.barcode} onChange={(e) => setForm({ ...form, barcode: e.target.value })} placeholder="Enter barcode" />
                                        </div>
                                        <div className="form-field">
                                            <label>Unit</label>
                                            <Dropdown value={form.unit} onChange={(e) => setForm({ ...form, unit: e.value })} options={['PCS', 'KG', 'MTR', 'BOX']} placeholder="Select unit" />
                                        </div>
                                    </div>
                                </div>

                                <div className="inventory-home-form-section">
                                    <div className="inventory-home-form-section-header">
                                        <h3 className="inventory-home-form-section-title">Stock &amp; Pricing</h3>
                                        <div className="inventory-home-form-section-toggle">
                                            <label>Active</label>
                                            <InputSwitch checked={form.status === 'Active'} onChange={(e) => setForm({ ...form, status: e.value ? 'Active' : 'Inactive' })} />
                                        </div>
                                    </div>
                                    <div className="inventory-home-form-grid">
                                        <div className="form-field">
                                            <label>Quantity</label>
                                            <InputNumber value={form.quantity} onValueChange={(e) => setForm({ ...form, quantity: e.value ?? DEFAULT_DATA_TYPE_VALUE.ZERO })} />
                                        </div>
                                        <div className="form-field">
                                            <label>Unit Cost (Rs.)</label>
                                            <InputNumber value={form.unitCost} onValueChange={(e) => setForm({ ...form, unitCost: e.value ?? DEFAULT_DATA_TYPE_VALUE.ZERO })} mode="decimal" minFractionDigits={2} />
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
                                    </div>
                                </div>
                            </div>

                            <div className="inventory-home-form-side">
                                <div className="inventory-home-form-section">
                                    <h3 className="inventory-home-form-section-title">Product Image</h3>

                                    <label className="inventory-home-image-dropzone" onDragOver={(e) => e.preventDefault()} onDrop={handleImageDrop}>
                                        {form.images.length > 0 ? (
                                            <>
                                                <img src={form.images[Math.min(activeImageIndex, form.images.length - 1)]} alt="Selected product" />
                                                <span className="inventory-home-image-dropzone-hint">Drag &amp; drop or click to add more</span>
                                            </>
                                        ) : (
                                            <div className="inventory-home-image-dropzone-empty">
                                                <HiOutlineCube size={26} />
                                                <span>Drag &amp; drop image here or click to upload</span>
                                            </div>
                                        )}
                                        <input type="file" accept="image/*" multiple hidden onChange={handleImagesSelect} />
                                    </label>

                                    <div className="inventory-home-image-strip">
                                        {form.images.map((src, index) => (
                                            <div
                                                key={src}
                                                className={`inventory-home-image-preview${index === activeImageIndex ? ' inventory-home-image-preview--active' : ''}`}
                                                onClick={() => setActiveImageIndex(index)}
                                            >
                                                <img src={src} alt={`Product ${index + 1}`} />
                                                <button type="button" className="inventory-home-image-remove" onClick={(e) => { e.stopPropagation(); removeImage(index); }}>
                                                    <HiOutlineXMark size={12} />
                                                </button>
                                            </div>
                                        ))}
                                        <label className="inventory-home-image-add">
                                            <HiOutlinePlus size={18} />
                                            <input type="file" accept="image/*" multiple hidden onChange={handleImagesSelect} />
                                        </label>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeDialogTab === 'assembly' && (
                    <div className="dialog-form-body">
                        <div className="inventory-home-assembly-header">
                            <div>
                                <h3>Product Assembly</h3>
                                <span className="inventory-home-assembly-subtitle">Which SKUs (and how many of each) are used to assemble this product.</span>
                            </div>
                            <Button label="Add Component" icon={<HiOutlinePlus className="mr-2" />} size="small" onClick={addAssemblyRow} outlined />
                        </div>
                        <DataTable
                            value={assemblyRows}
                            columns={assemblyColumns}
                            paginator={false}
                            sortable={false}
                            filterable={false}
                            dataKey="rowId"
                            emptyMessage="No components added yet."
                        />
                    </div>
                )}
            </Dialog>
        </div>
    );
};
export default InventoryHome;
