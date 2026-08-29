import { useContext, useMemo, useRef, useState } from 'react';
import type { ChangeEvent, DragEvent } from 'react';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { InputTextarea } from 'primereact/inputtextarea';
import { InputNumber } from 'primereact/inputnumber';
import { Dialog } from 'primereact/dialog';
import { InputSwitch } from 'primereact/inputswitch';
import { Toast } from 'primereact/toast';
import { HiOutlinePlus, HiOutlineCheckCircle, HiOutlineTrash, HiOutlineArrowPath, HiOutlinePhoto, HiOutlineXMark, HiOutlineCube, HiOutlineMinus } from 'react-icons/hi2';
import { TbCubePlus } from 'react-icons/tb';
import FilterBar, { type FilterField } from '../../common/commonComponents/filterBar/FilterBar';
import DataTable, { type DataTableHandle } from '../../common/commonComponents/dataTable/DataTable';
import DialogHeader from '../../common/commonComponents/dialogHeader/DialogHeader';
import QuickAddDropdown from '../../common/commonComponents/quickAddDropdown/QuickAddDropdown';
import { AppContext } from '../../context/AppContextDefinition';
import { useDateFormatContext } from '../../context/DateFormatContextDefinition';
import { useBulkDelete } from '../../common/commonFunctions/useBulkDelete';
import { createRawSku, updateRawSku, adjustRawSkuStock, deleteRawSku, getNextSkuCode, type RawSku as RawSkuType, type RawSkuPayload } from '../../services/rawSkuService';
import { uploadProductImage } from '../../services/inventoryService';
import type { Category } from '../../services/categoryService';
import type { ProductType } from '../../services/productTypeService';
import type { Unit } from '../../services/unitService';
import type { Location as LocationRecord } from '../../services/locationService';
import { DEFAULT_DATA_TYPE_VALUE } from '../../common/constants/commonConstant';
import { getRawSkuColumns, getActionBodyTemplate, getStockLevel, type RawSkuWithStockLevel } from '../../common/commonFunctions/CommonUtilities';
import { showToast, resolveImageUrl } from '../../common/commonFunctions/commonFunction';
import './RawSku.css';

interface RawSkuForm {
    images: string[];
    skuName: string;
    categoryId: number | null;
    productTypeId: number | null;
    locationId: number | null;
    unit: string;
    material: string;
    minStock: number;
    maxStock: number;
    reorderLevel: number;
    openingStock: number;
    currentStock: number;
    description: string;
    status: 'Active' | 'Inactive';
}

const emptyForm: RawSkuForm = {
    images: [],
    skuName: DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING,
    categoryId: DEFAULT_DATA_TYPE_VALUE.NULL,
    productTypeId: DEFAULT_DATA_TYPE_VALUE.NULL,
    locationId: DEFAULT_DATA_TYPE_VALUE.NULL,
    unit: 'PCS',
    material: DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING,
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
    const dataTableRef = useRef<DataTableHandle>(null);
    const [filters, setFilters] = useState<Record<string, unknown>>({ search: DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING });
    const [panelVisible, setPanelVisible] = useState(DEFAULT_DATA_TYPE_VALUE.FALSE);
    const [form, setForm] = useState<RawSkuForm>(emptyForm);
    const [activeImageIndex, setActiveImageIndex] = useState(DEFAULT_DATA_TYPE_VALUE.ZERO);
    const [uploadingImages, setUploadingImages] = useState(DEFAULT_DATA_TYPE_VALUE.FALSE);
    const [editingId, setEditingId] = useState<number | null>(DEFAULT_DATA_TYPE_VALUE.NULL);
    const [editingSkuCode, setEditingSkuCode] = useState(DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING);
    const [previewSkuCode, setPreviewSkuCode] = useState(DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING);
    // Snapshot of `currentStock` at the moment the Edit dialog was opened - see
    // InventoryHome.tsx's identical originalQuantityRef for why handleSave needs this to
    // decide whether `currentStock` actually belongs in the update payload.
    const originalCurrentStockRef = useRef<number | null>(null);

    // "Update Stock" dialog - a dedicated Add/Remove-by-quantity action (Action column),
    // separate from the Edit dialog's own Current Stock field so a quick stock movement
    // doesn't require opening the full edit form.
    const [stockDialogVisible, setStockDialogVisible] = useState(DEFAULT_DATA_TYPE_VALUE.FALSE);
    const [stockDialogSku, setStockDialogSku] = useState<RawSkuType | null>(DEFAULT_DATA_TYPE_VALUE.NULL);
    const [stockAdjustmentQty, setStockAdjustmentQty] = useState(DEFAULT_DATA_TYPE_VALUE.ZERO);
    const [stockSaving, setStockSaving] = useState(DEFAULT_DATA_TYPE_VALUE.FALSE);

    const filterFields: FilterField[] = [
        { key: 'search', type: 'search', label: 'Search', placeholder: 'Search by SKU name / code' },
    ];

    const filteredSkus = useMemo(() => {
        const search = (filters.search as string)?.toLowerCase() ?? DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING;
        return (rawSkus as RawSkuType[])
            .filter((sku) => !search || sku.skuName.toLowerCase().includes(search) || sku.skuCode.toLowerCase().includes(search))
            // stockLevel is precomputed here (not derived in the column body) so the Current
            // Stock column's dropdown filter has a plain field to match against.
            .map((sku) => ({ ...sku, stockLevel: getStockLevel(sku.currentStock, sku.reorderLevel, sku.maxStock).label }));
    }, [rawSkus, filters]);

    // Uploads each file to the backend (see inventoryService.ts's uploadProductImage) and
    // stores only the returned relative path - not a client-side blob: URL, which never
    // survives a page reload since it's never actually saved anywhere.
    const addImages = async (files: FileList | null) => {
        if (!files || files.length === 0) return;
        if (form.images.length >= 4) {
            showToast(toast, 'warn', 'Limit reached', 'You can upload up to 4 images per SKU');
            return;
        }
        const remainingSlots = 4 - form.images.length;
        const filesToUpload = Array.from(files).slice(0, remainingSlots);
        if (files.length > remainingSlots) {
            showToast(toast, 'warn', 'Limit reached', 'You can upload up to 4 images per SKU');
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
        setEditingSkuCode(DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING);
        setForm(emptyForm);
        setActiveImageIndex(DEFAULT_DATA_TYPE_VALUE.ZERO);
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
        originalCurrentStockRef.current = sku.currentStock;
        setForm({
            images: sku.images,
            skuName: sku.skuName,
            categoryId: sku.categoryId,
            productTypeId: sku.productTypeId,
            locationId: sku.locationId,
            unit: sku.unit,
            material: sku.material ?? DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING,
            minStock: sku.minStock,
            maxStock: sku.maxStock,
            reorderLevel: sku.reorderLevel,
            openingStock: sku.openingStock,
            currentStock: sku.currentStock,
            description: sku.description ?? DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING,
            status: sku.status,
        });
        setActiveImageIndex(DEFAULT_DATA_TYPE_VALUE.ZERO);
        setPanelVisible(DEFAULT_DATA_TYPE_VALUE.TRUE);
    };

    const handleSave = async () => {
        if (!form.skuName.trim()) {
            showToast(toast, 'error', 'Error', 'SKU Name is required');
            return;
        }
        if (editingId && !editingSkuCode.trim()) {
            showToast(toast, 'error', 'Error', 'SKU Code is required');
            return;
        }

        const payload: RawSkuPayload = {
            skuCode: editingId ? editingSkuCode : previewSkuCode,
            images: form.images,
            skuName: form.skuName,
            categoryId: form.categoryId,
            productTypeId: form.productTypeId,
            locationId: form.locationId,
            unit: form.unit,
            material: form.material || DEFAULT_DATA_TYPE_VALUE.NULL,
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
                // Omit `currentStock` entirely when the user never touched it this session,
                // rather than resending the dialog-open-time snapshot as if it were a real
                // edit - see originalCurrentStockRef's declaration comment for why.
                const updatePayload: Partial<RawSkuPayload> = { ...payload };
                if (form.currentStock === originalCurrentStockRef.current) {
                    delete updatePayload.currentStock;
                }
                await updateRawSku(editingId, updatePayload);
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

    const openStockDialog = (sku: RawSkuType) => {
        setStockDialogSku(sku);
        setStockAdjustmentQty(DEFAULT_DATA_TYPE_VALUE.ZERO);
        setStockDialogVisible(DEFAULT_DATA_TYPE_VALUE.TRUE);
    };

    // Add-only now - the Remove Stock button was removed, so there's no direction left to
    // choose; always passed straight through as 'Add'.
    const handleStockSave = async () => {
        if (!stockDialogSku) return;
        if (!(stockAdjustmentQty > 0)) {
            showToast(toast, 'error', 'Error', 'Quantity must be greater than 0');
            return;
        }

        setStockSaving(DEFAULT_DATA_TYPE_VALUE.TRUE);
        try {
            await adjustRawSkuStock(stockDialogSku.id, 'Add', stockAdjustmentQty);
            showToast(toast, 'success', 'Updated', 'Stock updated successfully');
            fetchRawSkus();
            setStockDialogVisible(DEFAULT_DATA_TYPE_VALUE.FALSE);
            setStockDialogSku(DEFAULT_DATA_TYPE_VALUE.NULL);
        } catch (err) {
            showToast(toast, 'error', 'Error', err instanceof Error ? err.message : 'Something went wrong');
        } finally {
            setStockSaving(DEFAULT_DATA_TYPE_VALUE.FALSE);
        }
    };

    // toast.current is only read inside handleToggleStatus's own async callback, never during render
    // eslint-disable-next-line react-hooks/refs
    const columns = getRawSkuColumns(dateFormat, handleToggleStatus, openEditDialog);

    const actionTemplate = getActionBodyTemplate<RawSkuWithStockLevel>({
        icons: [{
            icon: TbCubePlus,
            title: 'Update Stock',
            onClick: openStockDialog,
        }],
    });

    const { selectedRows, setSelectedRows, handleBulkDelete, bulkDeleting } = useBulkDelete<RawSkuWithStockLevel>({
        getId: (row) => row.id,
        deleteOne: deleteRawSku,
        onDeleted: fetchRawSkus,
        toast,
        entityNamePlural: 'raw SKUs',
    });

    return (
        <div className="raw-sku-page">
            <Toast ref={toast} />

            <FilterBar
                fields={filterFields}
                values={filters}
                onChange={(key, value) => setFilters((prev) => ({ ...prev, [key]: value }))}
                onReset={() => {
                    setFilters({ search: DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING });
                    dataTableRef.current?.clearFilters();
                }}
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
                        <Button className="filter-bar-add-btn" label="Add SKU" icon={<HiOutlinePlus className="mr-2" />} onClick={openAddDialog} outlined />
                    </>
                }
                trailingActions={
                    <Button className="filter-bar-refresh-btn" icon={<HiOutlineArrowPath />} outlined size="small" onClick={fetchRawSkus} loading={rawSkusLoading} aria-label="Refresh" title="Refresh" />
                }
            />

            <DataTable
                ref={dataTableRef}
                value={filteredSkus}
                columns={columns}
                loading={rawSkusLoading}
                actionBodyTemplate={actionTemplate}
                selectable
                selection={selectedRows}
                onSelectionChange={setSelectedRows}
            />

            <Dialog
                visible={panelVisible}
                onHide={() => setPanelVisible(DEFAULT_DATA_TYPE_VALUE.FALSE)}
                header={<DialogHeader icon={HiOutlineCube} title={editingId ? 'Edit SKU' : 'Add New SKU'} />}
                style={{ width: '900px', maxWidth: '95vw' }}
                footer={
                    <>
                        <Button label="Cancel" outlined onClick={() => setPanelVisible(DEFAULT_DATA_TYPE_VALUE.FALSE)} />
                        <Button label="Save" icon={<HiOutlineCheckCircle className="mr-2" />} onClick={handleSave} />
                    </>
                }
            >
                <div className="raw-sku-dialog-body">
                <div className="raw-sku-form-columns">
                <div className="raw-sku-form-main">
                    <div className="raw-sku-form-section">
                        <h3 className="raw-sku-form-section-title">Basic Information</h3>
                        <div className="raw-sku-dialog-grid">
                            <div className="form-field">
                                <label>SKU Code</label>
                                <InputText
                                    value={editingId ? editingSkuCode : previewSkuCode}
                                    onChange={(e) => (editingId ? setEditingSkuCode(e.target.value) : setPreviewSkuCode(e.target.value))}
                                    placeholder="Generating..."
                                />
                            </div>
                            <div className="form-field">
                                <label>SKU Name *</label>
                                <InputText value={form.skuName} onChange={(e) => setForm({ ...form, skuName: e.target.value })} placeholder="Enter SKU name" />
                            </div>
                            <div className="form-field">
                                <label>Category</label>
                                <QuickAddDropdown
                                    quickAddType="category"
                                    value={form.categoryId}
                                    onChange={(e) => setForm({ ...form, categoryId: e.value })}
                                    options={(categories as Category[]).map((c) => ({ label: c.category, value: c.id }))}
                                    placeholder="Select category"
                                    showClear
                                />
                            </div>
                            <div className="form-field">
                                <label>Product Type</label>
                                <QuickAddDropdown
                                    quickAddType="productType"
                                    value={form.productTypeId}
                                    onChange={(e) => setForm({ ...form, productTypeId: e.value })}
                                    options={(productTypes as ProductType[]).map((t) => ({ label: t.productType, value: t.id }))}
                                    placeholder="Select product type"
                                    showClear
                                />
                            </div>
                            <div className="form-field">
                                <label>Unit</label>
                                <QuickAddDropdown quickAddType="unit" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.value })} options={(units as Unit[]).map((u) => u.unit)} placeholder="Select unit" />
                            </div>
                            <div className="form-field">
                                <label>Material</label>
                                <InputText value={form.material} onChange={(e) => setForm({ ...form, material: e.target.value })} placeholder="e.g. Cotton, Steel, Plastic" />
                            </div>
                            <div className="form-field">
                                <label>Location</label>
                                <QuickAddDropdown
                                    quickAddType="location"
                                    value={form.locationId}
                                    onChange={(e) => setForm({ ...form, locationId: e.value })}
                                    options={(locations as LocationRecord[]).map((l) => ({ label: l.location, value: l.id }))}
                                    placeholder="Select location"
                                    showClear
                                />
                            </div>
                        </div>
                    </div>

                    <div className="raw-sku-form-section">
                        <h3 className="raw-sku-form-section-title">Stock Levels</h3>
                        {/* Locked once editing an existing SKU - Current Stock in particular now has its
                            own dedicated "Update Stock" action (Action column), so this form no longer
                            needs to be the way to change it (or the other stock-level figures) after
                            creation. */}
                        <div className="raw-sku-dialog-grid">
                            <div className="form-field">
                                <label>Opening Stock <span className="raw-sku-required">*</span></label>
                                <InputNumber
                                    value={form.openingStock}
                                    min={0}
                                    disabled={!!editingId}
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
                                <label>Current Stock <span className="raw-sku-required">*</span></label>
                                <InputNumber value={form.currentStock} min={0} disabled={!!editingId} onValueChange={(e) => setForm({ ...form, currentStock: e.value ?? DEFAULT_DATA_TYPE_VALUE.ZERO })} />
                            </div>
                            <div className="form-field">
                                <label>Min Stock <span className="raw-sku-required">*</span></label>
                                <InputNumber value={form.minStock} min={0} disabled={!!editingId} onValueChange={(e) => setForm({ ...form, minStock: e.value ?? DEFAULT_DATA_TYPE_VALUE.ZERO })} />
                            </div>
                            <div className="form-field">
                                <label>Max Stock <span className="raw-sku-required">*</span></label>
                                <InputNumber value={form.maxStock} min={0} disabled={!!editingId} onValueChange={(e) => setForm({ ...form, maxStock: e.value ?? DEFAULT_DATA_TYPE_VALUE.ZERO })} />
                            </div>
                            <div className="form-field">
                                <label>Reorder Level</label>
                                <InputNumber value={form.reorderLevel} min={0} disabled={!!editingId} onValueChange={(e) => setForm({ ...form, reorderLevel: e.value ?? DEFAULT_DATA_TYPE_VALUE.ZERO })} />
                            </div>
                        </div>
                    </div>

                    <div className="raw-sku-form-section">
                        <h3 className="raw-sku-form-section-title">Additional Details</h3>
                        <div className="form-field">
                            <label>Description (Optional)</label>
                            <InputTextarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} placeholder="Enter description" />
                        </div>
                        <div className="form-field">
                            <label>Status</label>
                            <div className="raw-sku-status-row">
                                <InputSwitch checked={form.status === 'Active'} onChange={(e) => setForm({ ...form, status: e.value ? 'Active' : 'Inactive' })} />
                                <div className="raw-sku-status-text">
                                    <span className="raw-sku-status-title">{form.status === 'Active' ? 'Active' : 'Inactive'}</span>
                                    <span className="raw-sku-status-desc">
                                        {form.status === 'Active' ? 'SKU will be active and available for use.' : 'SKU will be inactive and hidden.'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="raw-sku-form-side">
                    <div className="raw-sku-form-section">
                        <h3 className="raw-sku-form-section-title">SKU Image</h3>
                        <span className="raw-sku-form-section-subtitle">Upload clear images of this SKU</span>

                        <label className="raw-sku-image-dropzone" onDragOver={(e) => e.preventDefault()} onDrop={handleImageDrop}>
                            {uploadingImages ? (
                                <span>Uploading…</span>
                            ) : form.images.length > 0 ? (
                                <>
                                    <img src={resolveImageUrl(form.images[Math.min(activeImageIndex, form.images.length - 1)])} alt="Selected SKU" className="raw-sku-image-dropzone-preview" />
                                    <span className="raw-sku-image-dropzone-overlay">Drag &amp; drop or click to add more</span>
                                </>
                            ) : (
                                <>
                                    <span className="raw-sku-image-dropzone-icon"><HiOutlinePhoto size={22} /></span>
                                    <span className="raw-sku-image-dropzone-text">
                                        Drag &amp; drop an image here<br />
                                        or <span className="raw-sku-image-dropzone-link">click to browse</span>
                                    </span>
                                </>
                            )}
                            <input type="file" accept="image/*" multiple hidden onChange={handleImagesSelect} disabled={uploadingImages || form.images.length >= 4} />
                        </label>
                        <span className="raw-sku-image-hint">JPG, PNG or WEBP. Max size 2MB.</span>

                        <div className="raw-sku-image-strip">
                            {form.images.map((src, index) => (
                                <div
                                    key={src}
                                    className={`raw-sku-image-preview${index === activeImageIndex ? ' raw-sku-image-preview--active' : ''}`}
                                    onClick={() => setActiveImageIndex(index)}
                                >
                                    <img src={resolveImageUrl(src)} alt={`SKU ${index + 1}`} />
                                    <button type="button" className="raw-sku-image-remove" onClick={(e) => { e.stopPropagation(); removeImage(index); }}>
                                        <HiOutlineXMark size={12} />
                                    </button>
                                </div>
                            ))}
                            {form.images.length < 4 && (
                                <label className="raw-sku-image-add">
                                    <HiOutlinePlus size={18} />
                                    <span>Add more</span>
                                    <input type="file" accept="image/*" multiple hidden onChange={handleImagesSelect} />
                                </label>
                            )}
                        </div>
                        <span className="raw-sku-image-hint">You can upload up to 4 images</span>
                    </div>
                </div>
                </div>
                </div>
            </Dialog>

            <Dialog
                visible={stockDialogVisible}
                onHide={() => setStockDialogVisible(DEFAULT_DATA_TYPE_VALUE.FALSE)}
                header={<DialogHeader icon={HiOutlineArrowPath} title="Update stock" badgeColor="green" />}
                style={{ width: '420px', maxWidth: '95vw' }}
                footer={
                    <>
                        <Button label="Cancel" outlined onClick={() => setStockDialogVisible(DEFAULT_DATA_TYPE_VALUE.FALSE)} />
                        <Button label="Add stock" icon={<HiOutlinePlus className="mr-2" />} onClick={handleStockSave} loading={stockSaving} disabled={!(stockAdjustmentQty > 0)} />
                    </>
                }
            >
                {stockDialogSku && (
                    <div className="raw-sku-stock-dialog-body">
                        <div className="raw-sku-stock-card">
                            <div className="raw-sku-stock-summary">
                                <div className="raw-sku-stock-summary-image">
                                    {stockDialogSku.images.length > 0 ? (
                                        <img src={resolveImageUrl(stockDialogSku.images[0])} alt={stockDialogSku.skuName} />
                                    ) : (
                                        <HiOutlineCube size={26} />
                                    )}
                                </div>
                                <div className="raw-sku-stock-summary-details">
                                    <div className="raw-sku-stock-summary-name">{stockDialogSku.skuName}</div>
                                    <span className="raw-sku-stock-summary-code">{stockDialogSku.skuCode}</span>
                                    <div className="raw-sku-stock-summary-meta">
                                        {stockDialogSku.productTypeName && <span>{stockDialogSku.productTypeName}</span>}
                                        {stockDialogSku.locationName && <span className="raw-sku-stock-summary-location">{stockDialogSku.locationName}</span>}
                                    </div>
                                </div>
                            </div>
                            <div className="raw-sku-stock-summary-divider" />
                            <div className="raw-sku-stock-summary-footer">
                                <span className="raw-sku-stock-summary-label">Current stock</span>
                                <span className="raw-sku-stock-summary-value">
                                    {stockDialogSku.currentStock} <span className="raw-sku-stock-summary-unit">{stockDialogSku.unit}</span>
                                </span>
                            </div>
                        </div>

                        <div className="form-field">
                            <label className="raw-sku-qty-label">Quantity to add</label>
                            <div className="raw-sku-qty-stepper-row">
                                <button
                                    type="button"
                                    className="raw-sku-qty-step-btn"
                                    onClick={() => setStockAdjustmentQty((prev) => Math.max(0, prev - 1))}
                                    disabled={stockAdjustmentQty <= 0}
                                    aria-label="Decrease quantity"
                                >
                                    <HiOutlineMinus size={16} />
                                </button>
                                <div className="raw-sku-qty-display">
                                    <InputNumber
                                        value={stockAdjustmentQty}
                                        min={0}
                                        // PrimeReact only fires onValueChange on Enter/Tab/blur/the +-buttons -
                                        // typing a digit directly fires onChange instead, so both are wired to
                                        // the same setter (otherwise the Add stock button's disabled state -
                                        // and any other UI reacting to this value - stayed stale until the
                                        // field lost focus).
                                        onValueChange={(e) => setStockAdjustmentQty(e.value ?? DEFAULT_DATA_TYPE_VALUE.ZERO)}
                                        onChange={(e) => setStockAdjustmentQty(e.value ?? DEFAULT_DATA_TYPE_VALUE.ZERO)}
                                    />
                                </div>
                                <button
                                    type="button"
                                    className="raw-sku-qty-step-btn"
                                    onClick={() => setStockAdjustmentQty((prev) => prev + 1)}
                                    aria-label="Increase quantity"
                                >
                                    <HiOutlinePlus size={16} />
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </Dialog>
        </div>
    );
};
export default RawSku;