import { useContext, useMemo, useRef, useState } from 'react';
import type { ChangeEvent, DragEvent } from 'react';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { InputNumber } from 'primereact/inputnumber';
import { Dropdown } from 'primereact/dropdown';
import { Dialog } from 'primereact/dialog';
import { Toast } from 'primereact/toast';
import {
    HiOutlinePlus,
    HiOutlineCube,
    HiOutlineXMark,
    HiOutlineCheckCircle,
    HiOutlineTag,
    HiOutlineQrCode,
    HiOutlineCurrencyRupee,
    HiOutlineClipboardDocumentList,
    HiOutlinePuzzlePiece,
    HiOutlineMapPin,
    HiOutlineInformationCircle,
    HiOutlinePhoto,
    HiOutlineChartBar,
    HiOutlineTrash,
    HiOutlineArrowPath,
} from 'react-icons/hi2';
import FilterBar, { type FilterField } from '../../common/commonComponents/filterBar/FilterBar';
import DataTable from '../../common/commonComponents/dataTable/DataTable';
import { useBulkDelete } from '../../common/commonFunctions/useBulkDelete';
import { createInventoryItem, updateInventoryItem, deleteInventoryItem, getNextSkuId, uploadProductImage, type InventoryItem, type AssemblyLine } from '../../services/inventoryService';
import { AppContext } from '../../context/AppContextDefinition';
import { useDateFormatContext } from '../../context/DateFormatContextDefinition';
import type { RawSku } from '../../services/rawSkuService';
import type { Category } from '../../services/categoryService';
import type { ProductType } from '../../services/productTypeService';
import type { Unit } from '../../services/unitService';
import type { Location as LocationRecord } from '../../services/locationService';
import { DEFAULT_DATA_TYPE_VALUE } from '../../common/constants/commonConstant';
import { getInventoryHomeColumns, getInventoryHomeAssemblyColumns, getActionBodyTemplate, getStockLevel, type AssemblyRow, type InventoryItemWithStockLevel } from '../../common/commonFunctions/CommonUtilities';
import { showToast, resolveImageUrl } from '../../common/commonFunctions/commonFunction';
import './InventoryHome.css';

let nextAssemblyRowId = 1;
const emptyAssemblyRow = (): AssemblyRow => ({ rowId: nextAssemblyRowId++, skuCode: DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING, skuName: DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING, quantity: 1, unit: 'PCS' });
const rowsFromAssembly = (assembly: AssemblyLine[]): AssemblyRow[] => assembly.map((line) => ({ ...line, rowId: nextAssemblyRowId++ }));

const emptyForm: Omit<InventoryItem, 'id' | 'skuId' | 'createdDate' | 'assembly'> = {
    images: [], productName: DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING, categoryName: DEFAULT_DATA_TYPE_VALUE.NULL, productType: DEFAULT_DATA_TYPE_VALUE.NULL, barcode: DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING, quantity: DEFAULT_DATA_TYPE_VALUE.ZERO, unit: 'PCS', locationName: DEFAULT_DATA_TYPE_VALUE.NULL, status: 'Active', unitCost: DEFAULT_DATA_TYPE_VALUE.ZERO, sellingCost: DEFAULT_DATA_TYPE_VALUE.ZERO, minStock: DEFAULT_DATA_TYPE_VALUE.ZERO, maxStock: DEFAULT_DATA_TYPE_VALUE.ZERO, openingStock: DEFAULT_DATA_TYPE_VALUE.ZERO,
};

const InventoryHome = () => {
    const { rawSkus, categories, productTypes, locations, inventories, inventoriesLoading, fetchInventories, units } = useContext(AppContext);
    const { dateFormat } = useDateFormatContext();
    const toast = useRef<Toast>(DEFAULT_DATA_TYPE_VALUE.NULL);
    const [filters, setFilters] = useState<Record<string, unknown>>({ search: DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING });
    const [panelVisible, setPanelVisible] = useState(DEFAULT_DATA_TYPE_VALUE.FALSE);
    const [activeDialogTab, setActiveDialogTab] = useState<'details' | 'assembly'>('details');
    const [form, setForm] = useState(emptyForm);
    const [assemblyRows, setAssemblyRows] = useState<AssemblyRow[]>([]);
    const [activeImageIndex, setActiveImageIndex] = useState(DEFAULT_DATA_TYPE_VALUE.ZERO);
    const [uploadingImages, setUploadingImages] = useState(DEFAULT_DATA_TYPE_VALUE.FALSE);
    const [editingId, setEditingId] = useState<number | null>(DEFAULT_DATA_TYPE_VALUE.NULL);
    const [editingSkuId, setEditingSkuId] = useState(DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING);
    const [previewSkuId, setPreviewSkuId] = useState(DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING);

    const filterFields: FilterField[] = [
        { key: 'search', type: 'search', label: 'Search', placeholder: 'Search by SKU ID or product name' },
    ];

    const filteredItems = useMemo(() => {
        const search = (filters.search as string)?.toLowerCase() ?? DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING;
        return (inventories as InventoryItem[])
            .filter((item) => !search || item.skuId.toLowerCase().includes(search) || item.productName.toLowerCase().includes(search))
            // stockLevel is precomputed here (not derived in the column body) so the Current
            // Stock column's dropdown filter has a plain field to match against.
            .map((item) => ({ ...item, stockLevel: getStockLevel(item.quantity, item.minStock, item.maxStock).label }));
    }, [inventories, filters]);

    const addAssemblyRow = () => {
        if (assemblyRows.some((row) => !row.skuCode)) {
            showToast(toast, 'warn', 'Warning', 'Please select a SKU for the existing row before adding another');
            return;
        }
        setAssemblyRows((prev) => [...prev, emptyAssemblyRow()]);
    };

    const updateAssemblyRow = (rowId: number, patch: Partial<AssemblyRow>) => {
        setAssemblyRows((prev) => prev.map((row) => (row.rowId === rowId ? { ...row, ...patch } : row)));
    };

    const removeAssemblyRow = (rowId: number) => {
        setAssemblyRows((prev) => prev.filter((row) => row.rowId !== rowId));
    };

    // Uploads each file to the backend (see inventoryService.ts's uploadProductImage) and
    // stores only the returned relative path - not a client-side blob: URL, which never
    // survives a page reload since it's never actually saved anywhere.
    const addImages = async (files: FileList | null) => {
        if (!files || files.length === 0) return;
        if (form.images.length >= 4) {
            showToast(toast, 'warn', 'Limit reached', 'You can upload up to 4 images per product');
            return;
        }
        const remainingSlots = 4 - form.images.length;
        const filesToUpload = Array.from(files).slice(0, remainingSlots);
        if (files.length > remainingSlots) {
            showToast(toast, 'warn', 'Limit reached', 'You can upload up to 4 images per product');
        }
        setUploadingImages(DEFAULT_DATA_TYPE_VALUE.TRUE);
        try {
            const uploadedPaths = await Promise.all(filesToUpload.map((file) => uploadProductImage(file)));
            setForm((prev) => {
                setActiveImageIndex(prev.images.length);
                return { ...prev, images: [...prev.images, ...uploadedPaths] };
            });
        } catch (err) {
            showToast(toast, 'error', 'Error', err instanceof Error ? err.message : 'Image upload failed');
        } finally {
            setUploadingImages(DEFAULT_DATA_TYPE_VALUE.FALSE);
        }
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

    const openAddDialog = async () => {
        setEditingId(DEFAULT_DATA_TYPE_VALUE.NULL);
        setEditingSkuId(DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING);
        setForm(emptyForm);
        setAssemblyRows([]);
        setActiveDialogTab('details');
        setActiveImageIndex(DEFAULT_DATA_TYPE_VALUE.ZERO);
        setPanelVisible(DEFAULT_DATA_TYPE_VALUE.TRUE);
        try {
            setPreviewSkuId(await getNextSkuId());
        } catch {
            setPreviewSkuId(DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING);
        }
    };

    const openEditDialog = (item: InventoryItem) => {
        setEditingId(item.id);
        setEditingSkuId(item.skuId);
        setForm({
            images: item.images,
            productName: item.productName,
            categoryName: item.categoryName,
            productType: item.productType,
            barcode: item.barcode,
            quantity: item.quantity,
            unit: item.unit,
            locationName: item.locationName,
            status: item.status,
            unitCost: item.unitCost,
            sellingCost: item.sellingCost,
            minStock: item.minStock,
            maxStock: item.maxStock,
            openingStock: item.openingStock,
        });
        setAssemblyRows(rowsFromAssembly(item.assembly));
        setActiveDialogTab('details');
        setActiveImageIndex(DEFAULT_DATA_TYPE_VALUE.ZERO);
        setPanelVisible(DEFAULT_DATA_TYPE_VALUE.TRUE);
    };

    const handleSave = async () => {
        if (assemblyRows.length === 0) {
            setActiveDialogTab('assembly');
            showToast(toast, 'warn', 'Warning', 'Please add at least one SKU');
            return;
        }

        const hasBlankAssemblyRow = assemblyRows.some((row) => !row.skuCode);
        if (hasBlankAssemblyRow) {
            setActiveDialogTab('assembly');
            showToast(toast, 'warn', 'Warning', 'Please select a SKU for every Product Assembly row, or remove the empty one');
            return;
        }

        const assembly = assemblyRows.map(({ skuCode, skuName, quantity, unit }) => ({ skuCode, skuName, quantity, unit }));
        if (editingId) {
            await updateInventoryItem(editingId, { ...form, assembly });
            showToast(toast, 'success', 'Updated', 'Inventory item updated successfully');
        } else {
            await createInventoryItem({ ...form, assembly });
            showToast(toast, 'success', 'Created', 'Inventory item created successfully');
        }
        fetchInventories();
        setForm(emptyForm);
        setAssemblyRows([]);
        setActiveDialogTab('details');
        setActiveImageIndex(DEFAULT_DATA_TYPE_VALUE.ZERO);
        setEditingId(DEFAULT_DATA_TYPE_VALUE.NULL);
        setPanelVisible(DEFAULT_DATA_TYPE_VALUE.FALSE);
    };

    const handleToggleStatus = async (item: InventoryItem) => {
        await updateInventoryItem(item.id, { status: item.status === 'Active' ? 'Inactive' : 'Active' });
        fetchInventories();
        showToast(toast, 'success', 'Updated', 'Inventory item status updated successfully');
    };

    // toast.current is only read inside handleToggleStatus's own async callback, never during render
    // eslint-disable-next-line react-hooks/refs
    const columns = getInventoryHomeColumns(dateFormat, handleToggleStatus, openEditDialog);

    const assemblyColumns = getInventoryHomeAssemblyColumns(assemblyRows, rawSkus as RawSku[], updateAssemblyRow, (units as Unit[]).map((u) => u.unit));

    const assemblyActionTemplate = getActionBodyTemplate<AssemblyRow>({ onDelete: (row) => removeAssemblyRow(row.rowId) });

    const { selectedRows, setSelectedRows, handleBulkDelete, bulkDeleting } = useBulkDelete<InventoryItemWithStockLevel>({
        getId: (row) => row.id,
        deleteOne: deleteInventoryItem,
        onDeleted: fetchInventories,
        toast,
        entityNamePlural: 'inventory items',
    });

    return (
        <div className="inventory-home-page">
            <Toast ref={toast} />

            <FilterBar
                fields={filterFields}
                values={filters}
                onChange={(key, value) => setFilters((prev) => ({ ...prev, [key]: value }))}
                onReset={() => setFilters({ search: DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING })}
                actions={
                    <>
                        {selectedRows.length > 0 && (
                            <Button
                                label={`Delete (${selectedRows.length})`}
                                icon={<HiOutlineTrash className="mr-2" />}
                                onClick={handleBulkDelete}
                                loading={bulkDeleting}
                                severity="danger"
                                outlined
                            />
                        )}
                        <Button label="Add New Item" icon={<HiOutlinePlus className="mr-2" />} onClick={openAddDialog} outlined />
                    </>
                }
                trailingActions={
                    <Button icon={<HiOutlineArrowPath />} outlined size="small" onClick={fetchInventories} loading={inventoriesLoading} aria-label="Refresh" title="Refresh" />
                }
            />

            <DataTable
                value={filteredItems}
                columns={columns}
                loading={inventoriesLoading}
                selectable
                selection={selectedRows}
                onSelectionChange={setSelectedRows}
            />

            <Dialog
                visible={panelVisible}
                onHide={() => setPanelVisible(DEFAULT_DATA_TYPE_VALUE.FALSE)}
                header={editingId ? 'Edit Inventory Item' : 'Add New Inventory Item'}
                className="inventory-home-dialog"
                style={{ width: '900px', maxWidth: '95vw' }}
                footer={
                    <>
                        <Button label="Cancel" outlined onClick={() => setPanelVisible(DEFAULT_DATA_TYPE_VALUE.FALSE)} />
                        <Button label={editingId ? 'Save Changes' : 'Save Item'} icon={<HiOutlineCheckCircle className="mr-2" />} onClick={handleSave} />
                    </>
                }
            >
                <div className="inventory-home-dialog-tabs">
                    <button
                        type="button"
                        className={`inventory-home-dialog-tab${activeDialogTab === 'details' ? ' inventory-home-dialog-tab--active' : ''}`}
                        onClick={() => setActiveDialogTab('details')}
                    >
                        <HiOutlineClipboardDocumentList size={15} />
                        Inventory Details
                    </button>
                    <button
                        type="button"
                        className={`inventory-home-dialog-tab${activeDialogTab === 'assembly' ? ' inventory-home-dialog-tab--active' : ''}`}
                        onClick={() => setActiveDialogTab('assembly')}
                    >
                        <HiOutlinePuzzlePiece size={15} />
                        Product Assembly
                    </button>
                </div>

                {activeDialogTab === 'details' && (
                    <div className="dialog-form-body">
                        <div className="inventory-home-form-columns">
                            <div className="inventory-home-form-main">
                                <div className="inventory-home-form-section">
                                    <div className="inventory-home-section-title-row">
                                        <h3 className="inventory-home-form-section-title">Basic Information</h3>
                                        <HiOutlineInformationCircle size={14} className="inventory-home-section-title-info" title="Core identity fields for this inventory item" />
                                    </div>
                                    <div className="inventory-home-form-grid">
                                        <div className="form-field">
                                            <label>SKU (ID) <span className="inventory-home-required">*</span></label>
                                            <div className="inventory-home-input-icon-wrapper">
                                                <InputText className="inventory-home-input inventory-home-input--icon" value={editingId ? editingSkuId : (previewSkuId || 'Generating...')} disabled />
                                                <HiOutlineTag size={15} className="inventory-home-input-icon" />
                                            </div>
                                        </div>
                                        <div className="form-field">
                                            <label>Product Name <span className="inventory-home-required">*</span></label>
                                            <div className="inventory-home-input-icon-wrapper">
                                                <InputText
                                                    className="inventory-home-input inventory-home-input--icon"
                                                    value={form.productName}
                                                    onChange={(e) => setForm({ ...form, productName: e.target.value })}
                                                    placeholder="Enter product name"
                                                />
                                                <HiOutlineCube size={15} className="inventory-home-input-icon" />
                                            </div>
                                        </div>
                                        <div className="form-field">
                                            <label>Category <span className="inventory-home-required">*</span></label>
                                            <Dropdown
                                                value={form.categoryName}
                                                onChange={(e) => setForm({ ...form, categoryName: e.value })}
                                                options={(categories as Category[]).map((c) => ({ label: c.category, value: c.category }))}
                                                placeholder="Select category"
                                            />
                                        </div>
                                        <div className="form-field">
                                            <label>Product Type <span className="inventory-home-required">*</span></label>
                                            <Dropdown
                                                value={form.productType}
                                                onChange={(e) => setForm({ ...form, productType: e.value })}
                                                options={(productTypes as ProductType[]).map((t) => ({ label: t.productType, value: t.productType }))}
                                                placeholder="Select product type"
                                            />
                                        </div>
                                        <div className="form-field">
                                            <label>Barcode</label>
                                            <div className="inventory-home-input-icon-wrapper">
                                                <InputText
                                                    className="inventory-home-input inventory-home-input--icon"
                                                    value={form.barcode ?? DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING}
                                                    onChange={(e) => setForm({ ...form, barcode: e.target.value })}
                                                    placeholder="Enter barcode"
                                                />
                                                <HiOutlineQrCode size={15} className="inventory-home-input-icon" />
                                            </div>
                                        </div>
                                        <div className="form-field">
                                            <label>Unit <span className="inventory-home-required">*</span></label>
                                            <Dropdown value={form.unit} onChange={(e) => setForm({ ...form, unit: e.value })} options={(units as Unit[]).map((u) => u.unit)} placeholder="Select unit" />
                                        </div>
                                    </div>
                                </div>

                                <div className="inventory-home-form-section">
                                    <div className="inventory-home-section-title-row">
                                        <HiOutlineChartBar size={14} className="inventory-home-section-title-icon" />
                                        <h3 className="inventory-home-form-section-title">Stock &amp; Pricing</h3>
                                    </div>
                                    <div className="inventory-home-form-grid">
                                        <div className="form-field">
                                            <label>Opening Stock <span className="inventory-home-required">*</span></label>
                                            <div className="inventory-home-input-icon-wrapper">
                                                <InputNumber
                                                    className="inventory-home-input inventory-home-input--icon"
                                                    value={form.openingStock}
                                                    onValueChange={(e) => {
                                                        const openingStock = e.value ?? DEFAULT_DATA_TYPE_VALUE.ZERO;
                                                        // No transactions have happened yet on a brand-new item, so
                                                        // current stock tracks opening stock until saved; once
                                                        // editing an existing item the two are independent (same
                                                        // pattern as RawSku's Opening Stock field).
                                                        setForm((prev) => ({ ...prev, openingStock, quantity: editingId ? prev.quantity : openingStock }));
                                                    }}
                                                />
                                                <HiOutlineCube size={15} className="inventory-home-input-icon" />
                                            </div>
                                        </div>
                                        <div className="form-field">
                                            <label>Current Stock <span className="inventory-home-required">*</span></label>
                                            <div className="inventory-home-input-icon-wrapper">
                                                <InputNumber
                                                    className="inventory-home-input inventory-home-input--icon"
                                                    value={form.quantity}
                                                    onValueChange={(e) => setForm({ ...form, quantity: e.value ?? DEFAULT_DATA_TYPE_VALUE.ZERO })}
                                                />
                                                <HiOutlineCube size={15} className="inventory-home-input-icon" />
                                            </div>
                                        </div>
                                        <div className="form-field">
                                            <label>Min Stock <span className="inventory-home-required">*</span></label>
                                            <div className="inventory-home-input-icon-wrapper">
                                                <InputNumber
                                                    className="inventory-home-input inventory-home-input--icon"
                                                    value={form.minStock}
                                                    onValueChange={(e) => setForm({ ...form, minStock: e.value ?? DEFAULT_DATA_TYPE_VALUE.ZERO })}
                                                />
                                                <HiOutlineCube size={15} className="inventory-home-input-icon" />
                                            </div>
                                        </div>
                                        <div className="form-field">
                                            <label>Max Stock <span className="inventory-home-required">*</span></label>
                                            <div className="inventory-home-input-icon-wrapper">
                                                <InputNumber
                                                    className="inventory-home-input inventory-home-input--icon"
                                                    value={form.maxStock}
                                                    onValueChange={(e) => setForm({ ...form, maxStock: e.value ?? DEFAULT_DATA_TYPE_VALUE.ZERO })}
                                                />
                                                <HiOutlineCube size={15} className="inventory-home-input-icon" />
                                            </div>
                                        </div>
                                        <div className="form-field">
                                            <label>Product Cost (Rs.) <span className="inventory-home-required">*</span></label>
                                            <div className="inventory-home-input-icon-wrapper">
                                                <InputNumber
                                                    className="inventory-home-input inventory-home-input--icon"
                                                    value={form.unitCost}
                                                    onValueChange={(e) => setForm({ ...form, unitCost: e.value ?? DEFAULT_DATA_TYPE_VALUE.ZERO })}
                                                    mode="decimal"
                                                    minFractionDigits={2}
                                                />
                                                <HiOutlineCurrencyRupee size={15} className="inventory-home-input-icon" />
                                            </div>
                                        </div>
                                        <div className="form-field">
                                            <label>Selling Cost (Rs.) <span className="inventory-home-required">*</span></label>
                                            <div className="inventory-home-input-icon-wrapper">
                                                <InputNumber
                                                    className="inventory-home-input inventory-home-input--icon"
                                                    value={form.sellingCost}
                                                    onValueChange={(e) => setForm({ ...form, sellingCost: e.value ?? DEFAULT_DATA_TYPE_VALUE.ZERO })}
                                                    mode="decimal"
                                                    minFractionDigits={2}
                                                />
                                                <HiOutlineCurrencyRupee size={15} className="inventory-home-input-icon" />
                                            </div>
                                        </div>
                                        <div className="form-field">
                                            <label>Location <span className="inventory-home-required">*</span></label>
                                            <Dropdown
                                                value={form.locationName}
                                                onChange={(e) => setForm({ ...form, locationName: e.value })}
                                                options={(locations as LocationRecord[]).map((l) => ({ label: l.location, value: l.location }))}
                                                valueTemplate={(option, props) => option ? (
                                                    <span className="inventory-home-location-value"><HiOutlineMapPin size={14} />{option.label}</span>
                                                ) : props.placeholder}
                                                placeholder="Select location"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="inventory-home-form-side">
                                <div className="inventory-home-form-section">
                                    <h3 className="inventory-home-form-section-title">Product Image</h3>
                                    <span className="inventory-home-form-section-subtitle">Upload clear images of your product</span>

                                    <label className="inventory-home-image-dropzone" onDragOver={(e) => e.preventDefault()} onDrop={handleImageDrop}>
                                        {uploadingImages ? (
                                            <span>Uploading…</span>
                                        ) : form.images.length > 0 ? (
                                            <>
                                                <img src={resolveImageUrl(form.images[Math.min(activeImageIndex, form.images.length - 1)])} alt="Selected product" className="inventory-home-image-dropzone-preview" />
                                                <span className="inventory-home-image-dropzone-overlay">Drag &amp; drop or click to add more</span>
                                            </>
                                        ) : (
                                            <>
                                                <span className="inventory-home-image-dropzone-icon"><HiOutlinePhoto size={22} /></span>
                                                <span className="inventory-home-image-dropzone-text">
                                                    Drag &amp; drop an image here<br />
                                                    or <span className="inventory-home-image-dropzone-link">click to browse</span>
                                                </span>
                                            </>
                                        )}
                                        <input type="file" accept="image/*" multiple hidden onChange={handleImagesSelect} disabled={uploadingImages || form.images.length >= 4} />
                                    </label>
                                    <span className="inventory-home-image-hint">JPG, PNG or WEBP. Max size 2MB.</span>

                                    <div className="inventory-home-image-strip">
                                        {form.images.map((src, index) => (
                                            <div
                                                key={src}
                                                className={`inventory-home-image-preview${index === activeImageIndex ? ' inventory-home-image-preview--active' : ''}`}
                                                onClick={() => setActiveImageIndex(index)}
                                            >
                                                <img src={resolveImageUrl(src)} alt={`Product ${index + 1}`} />
                                                <button type="button" className="inventory-home-image-remove" onClick={(e) => { e.stopPropagation(); removeImage(index); }}>
                                                    <HiOutlineXMark size={12} />
                                                </button>
                                            </div>
                                        ))}
                                        {form.images.length < 4 && (
                                            <label className="inventory-home-image-add">
                                                <HiOutlinePlus size={18} />
                                                <span>Add more</span>
                                                <input type="file" accept="image/*" multiple hidden onChange={handleImagesSelect} />
                                            </label>
                                        )}
                                    </div>
                                    <span className="inventory-home-image-hint">You can upload up to 4 images</span>
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
                            <Button label="Add SKU" icon={<HiOutlinePlus className="mr-2" />} size="small" onClick={addAssemblyRow} outlined />
                        </div>
                        <DataTable
                            value={assemblyRows}
                            columns={assemblyColumns}
                            actionBodyTemplate={assemblyActionTemplate}
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
