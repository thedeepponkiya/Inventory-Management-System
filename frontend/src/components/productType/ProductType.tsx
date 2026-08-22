import { useContext, useMemo, useRef, useState } from 'react';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { InputTextarea } from 'primereact/inputtextarea';
import { InputSwitch } from 'primereact/inputswitch';
import { Dialog } from 'primereact/dialog';
import { Toast } from 'primereact/toast';
import { HiOutlinePlus, HiOutlineCheckCircle, HiOutlineTrash, HiOutlineArrowPath, HiOutlineTag } from 'react-icons/hi2';
import FilterBar, { type FilterField } from '../../common/commonComponents/filterBar/FilterBar';
import DataTable, { type DataTableHandle } from '../../common/commonComponents/dataTable/DataTable';
import DialogHeader from '../../common/commonComponents/dialogHeader/DialogHeader';
import { AppContext } from '../../context/AppContextDefinition';
import { useDateFormatContext } from '../../context/DateFormatContextDefinition';
import { createProductType, updateProductType, deleteProductType, type ProductType as ProductTypeModel, type ProductTypePayload } from '../../services/productTypeService';
import { DEFAULT_DATA_TYPE_VALUE } from '../../common/constants/commonConstant';
import { getProductTypeColumns } from '../../common/commonFunctions/CommonUtilities';
import { showToast } from '../../common/commonFunctions/commonFunction';
import { useBulkDelete } from '../../common/commonFunctions/useBulkDelete';
import './ProductType.css';

const DESCRIPTION_MAX_LENGTH = 200;

const emptyForm: ProductTypePayload = {
    productType: DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING,
    description: DEFAULT_DATA_TYPE_VALUE.NULL,
    status: 'Active',
};

const ProductType = () => {
    const { productTypes, productTypesLoading, fetchProductTypes } = useContext(AppContext);
    const { dateFormat } = useDateFormatContext();
    const toast = useRef<Toast>(DEFAULT_DATA_TYPE_VALUE.NULL);
    const dataTableRef = useRef<DataTableHandle>(null);
    const [filters, setFilters] = useState<Record<string, unknown>>({ search: DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING });
    const [panelVisible, setPanelVisible] = useState(DEFAULT_DATA_TYPE_VALUE.FALSE);
    const [form, setForm] = useState(emptyForm);
    const [editingId, setEditingId] = useState<number | null>(DEFAULT_DATA_TYPE_VALUE.NULL);

    const filterFields: FilterField[] = [
        { key: 'search', type: 'search', label: 'Search', placeholder: 'Search by product type name' },
    ];

    const filteredProductTypes = useMemo(() => {
        const search = (filters.search as string)?.toLowerCase() ?? DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING;
        return (productTypes as ProductTypeModel[]).filter((type) => {
            return !search || type.productType.toLowerCase().includes(search);
        });
    }, [productTypes, filters]);

    const openAddDialog = () => {
        setEditingId(DEFAULT_DATA_TYPE_VALUE.NULL);
        setForm(emptyForm);
        setPanelVisible(DEFAULT_DATA_TYPE_VALUE.TRUE);
    };

    const openEditDialog = (type: ProductTypeModel) => {
        setEditingId(type.id);
        setForm({
            productType: type.productType,
            description: type.description,
            status: type.status,
        });
        setPanelVisible(DEFAULT_DATA_TYPE_VALUE.TRUE);
    };

    const handleSave = async () => {
        try {
            if (editingId) {
                await updateProductType(editingId, form);
                showToast(toast, 'success', 'Updated', 'Product Type updated successfully');
            } else {
                await createProductType(form);
                showToast(toast, 'success', 'Created', 'Product Type created successfully');
            }
            fetchProductTypes();
            setForm(emptyForm);
            setEditingId(DEFAULT_DATA_TYPE_VALUE.NULL);
            setPanelVisible(DEFAULT_DATA_TYPE_VALUE.FALSE);
        } catch (err) {
            showToast(toast, 'error', 'Error', err instanceof Error ? err.message : 'Something went wrong');
        }
    };

    const columns = getProductTypeColumns(dateFormat, openEditDialog);

    const { selectedRows, setSelectedRows, handleBulkDelete, bulkDeleting } = useBulkDelete<ProductTypeModel>({
        getId: (row) => row.id,
        deleteOne: deleteProductType,
        onDeleted: fetchProductTypes,
        toast,
        entityNamePlural: 'product types',
    });

    return (
        <div className="product-type-page">
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
                        <Button className="filter-bar-add-btn" label="Add Product Type" icon={<HiOutlinePlus className="mr-2" />} onClick={openAddDialog} outlined />
                    </>
                }
                trailingActions={
                    <Button className="filter-bar-refresh-btn" icon={<HiOutlineArrowPath />} outlined size="small" onClick={fetchProductTypes} loading={productTypesLoading} aria-label="Refresh" title="Refresh" />
                }
            />

            <DataTable
                ref={dataTableRef}
                value={filteredProductTypes}
                columns={columns}
                loading={productTypesLoading}
                selectable
                selection={selectedRows}
                onSelectionChange={setSelectedRows}
            />

            <Dialog
                visible={panelVisible}
                onHide={() => setPanelVisible(DEFAULT_DATA_TYPE_VALUE.FALSE)}
                header={<DialogHeader icon={HiOutlineTag} title={editingId ? 'Edit Product Type' : 'Add New Product Type'} />}
                style={{ width: '520px', maxWidth: '95vw' }}
                footer={
                    <>
                        <Button label="Cancel" outlined onClick={() => setPanelVisible(DEFAULT_DATA_TYPE_VALUE.FALSE)} />
                        <Button label="Save Product Type" icon={<HiOutlineCheckCircle className="mr-2" />} onClick={handleSave} />
                    </>
                }
            >
                <div className="product-type-dialog-body">
                    <div className="form-field">
                        <label>Type Name <span className="product-type-required">*</span></label>
                        <InputText
                            value={form.productType}
                            onChange={(e) => setForm({ ...form, productType: e.target.value })}
                            placeholder="Enter product type name"
                        />
                    </div>

                    <div className="form-field product-type-field--tight">
                        <label>Description <span className="product-type-optional">(Optional)</span></label>
                        <InputTextarea
                            value={form.description ?? DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING}
                            onChange={(e) => setForm({ ...form, description: e.target.value.slice(0, DESCRIPTION_MAX_LENGTH) })}
                            rows={3}
                            maxLength={DESCRIPTION_MAX_LENGTH}
                            placeholder="Enter product type description (optional)"
                        />
                        <span className="product-type-char-count">{(form.description ?? DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING).length} / {DESCRIPTION_MAX_LENGTH}</span>
                    </div>

                    <div className="form-field">
                        <label>Status <span className="product-type-required">*</span></label>
                        <div className="product-type-status-row">
                            <InputSwitch checked={form.status === 'Active'} onChange={(e) => setForm({ ...form, status: e.value ? 'Active' : 'Inactive' })} />
                            <div className="product-type-status-text">
                                <span className="product-type-status-title">{form.status === 'Active' ? 'Active' : 'Inactive'}</span>
                                <span className="product-type-status-desc">
                                    {form.status === 'Active' ? 'Product type will be active and available for use.' : 'Product type will be inactive and hidden.'}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </Dialog>
        </div>
    );
};
export default ProductType;
