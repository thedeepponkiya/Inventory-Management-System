import { useContext, useMemo, useRef, useState } from 'react';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { InputSwitch } from 'primereact/inputswitch';
import { Dialog } from 'primereact/dialog';
import { Toast } from 'primereact/toast';
import { confirmDialog } from 'primereact/confirmdialog';
import { HiOutlinePlus } from 'react-icons/hi2';
import FilterBar, { type FilterField } from '../../common/commonComponents/filterBar/FilterBar';
import DataTable from '../../common/commonComponents/dataTable/DataTable';
import { AppContext } from '../../context/AppContextDefinition';
import { createProductType, updateProductType, deleteProductType, type ProductType as ProductTypeModel, type ProductTypePayload } from '../../services/productTypeService';
import { DEFAULT_DATA_TYPE_VALUE } from '../../common/constants/commonConstant';
import { getProductTypeColumns, getActionBodyTemplate } from '../../common/commonFunctions/CommonUtilities';
import { showToast } from '../../common/commonFunctions/commonFunction';
import './ProductType.css';

const emptyForm: ProductTypePayload = {
    productType: DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING,
    status: 'Active',
};

const ProductType = () => {
    const { productTypes, productTypesLoading, fetchProductTypes } = useContext(AppContext);
    const toast = useRef<Toast>(DEFAULT_DATA_TYPE_VALUE.NULL);
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
            status: type.status,
        });
        setPanelVisible(DEFAULT_DATA_TYPE_VALUE.TRUE);
    };

    const handleDelete = (type: ProductTypeModel) => {
        confirmDialog({
            message: `Delete product type "${type.productType}"? This cannot be undone.`,
            header: 'Delete Product Type',
            icon: 'pi pi-exclamation-triangle',
            acceptClassName: 'p-button-danger',
            accept: async () => {
                try {
                    await deleteProductType(type.id);
                    fetchProductTypes();
                    showToast(toast, 'success', 'Deleted', 'Product Type deleted successfully');
                } catch (err) {
                    showToast(toast, 'error', 'Error', err instanceof Error ? err.message : 'Something went wrong');
                }
            },
        });
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

    const columns = getProductTypeColumns();

    // toast.current is only read inside handleDelete's own click callback, never during render
    // eslint-disable-next-line react-hooks/refs
    const actionTemplate = getActionBodyTemplate<ProductTypeModel>({ onEdit: openEditDialog, onDelete: handleDelete });

    return (
        <div className="product-type-page">
            <Toast ref={toast} />

            <FilterBar
                fields={filterFields}
                values={filters}
                onChange={(key, value) => setFilters((prev) => ({ ...prev, [key]: value }))}
                onReset={() => setFilters({ search: DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING })}
                actions={<Button label="Add Product Type" icon={<HiOutlinePlus className="mr-2" />} onClick={openAddDialog} outlined />}
            />

            <DataTable value={filteredProductTypes} columns={columns} loading={productTypesLoading} actionBodyTemplate={actionTemplate} />

            <Dialog
                visible={panelVisible}
                onHide={() => setPanelVisible(DEFAULT_DATA_TYPE_VALUE.FALSE)}
                header={editingId ? 'Edit Product Type' : 'Add New Product Type'}
                style={{ width: '480px' }}
                footer={
                    <>
                        <Button label="Cancel" outlined onClick={() => setPanelVisible(DEFAULT_DATA_TYPE_VALUE.FALSE)} />
                        <Button label={editingId ? 'Save Changes' : 'Save Product Type'} onClick={handleSave} />
                    </>
                }
            >
                <div className="dialog-form-body">
                    <div className="form-field">
                        <label>Type Name</label>
                        <InputText value={form.productType} onChange={(e) => setForm({ ...form, productType: e.target.value })} placeholder="Enter product type name" />
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
export default ProductType;
