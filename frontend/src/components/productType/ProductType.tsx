import { useMemo, useState } from 'react';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { InputTextarea } from 'primereact/inputtextarea';
import { InputSwitch } from 'primereact/inputswitch';
import { Dialog } from 'primereact/dialog';
import { confirmDialog } from 'primereact/confirmdialog';
import { HiOutlinePlus } from 'react-icons/hi2';
import FilterBar, { type FilterField } from '../../common/commonComponents/filterBar/FilterBar';
import DataTable from '../../common/commonComponents/dataTable/DataTable';
import { productTypeMockData, type ProductType as ProductTypeModel } from '../../mockData/productTypeData';
import { DEFAULT_DATA_TYPE_VALUE } from '../../common/constants/commonConstant';
import { getProductTypeColumns } from '../../common/commonFunctions/CommonUtilities';
import './ProductType.css';

const emptyForm: Omit<ProductTypeModel, 'id' | 'code'> = {
    name: DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING, description: DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING, status: 'Active',
};

const ProductType = () => {
    const [productTypes, setProductTypes] = useState<ProductTypeModel[]>(productTypeMockData);
    const [filters, setFilters] = useState<Record<string, unknown>>({ search: DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING });
    const [panelVisible, setPanelVisible] = useState(DEFAULT_DATA_TYPE_VALUE.FALSE);
    const [form, setForm] = useState(emptyForm);
    const [editingId, setEditingId] = useState<string | null>(DEFAULT_DATA_TYPE_VALUE.NULL);

    const filterFields: FilterField[] = [
        { key: 'search', type: 'search', label: 'Search', placeholder: 'Search by type code / name' },
    ];

    const filteredProductTypes = useMemo(() => {
        const search = (filters.search as string)?.toLowerCase() ?? DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING;
        return productTypes.filter((type) => {
            return !search || type.code.toLowerCase().includes(search) || type.name.toLowerCase().includes(search);
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
            name: type.name,
            description: type.description,
            status: type.status,
        });
        setPanelVisible(DEFAULT_DATA_TYPE_VALUE.TRUE);
    };

    const handleDelete = (type: ProductTypeModel) => {
        confirmDialog({
            message: `Delete product type "${type.name}"? This cannot be undone.`,
            header: 'Delete Product Type',
            icon: 'pi pi-exclamation-triangle',
            acceptClassName: 'p-button-danger',
            accept: () => setProductTypes((prev) => prev.filter((item) => item.id !== type.id)),
        });
    };

    const handleSave = () => {
        if (editingId) {
            setProductTypes((prev) => prev.map((type) => (type.id === editingId ? { ...type, ...form } : type)));
        } else {
            const nextCode = `PT-${String(productTypes.length + 1).padStart(3, '0')}`;
            setProductTypes((prev) => [...prev, { id: nextCode, code: nextCode, ...form }]);
        }
        setForm(emptyForm);
        setEditingId(DEFAULT_DATA_TYPE_VALUE.NULL);
        setPanelVisible(DEFAULT_DATA_TYPE_VALUE.FALSE);
    };

    const columns = getProductTypeColumns(openEditDialog, handleDelete);

    return (
        <div className="product-type-page">
            <FilterBar
                fields={filterFields}
                values={filters}
                onChange={(key, value) => setFilters((prev) => ({ ...prev, [key]: value }))}
                onReset={() => setFilters({ search: DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING })}
                actions={<Button label="Add Product Type" icon={<HiOutlinePlus className="mr-2" />} onClick={openAddDialog} outlined />}
            />

            <DataTable value={filteredProductTypes} columns={columns} />

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
                        <InputText value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Enter product type name" />
                    </div>
                    <div className="form-field">
                        <label>Description</label>
                        <InputTextarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} placeholder="Enter description (optional)" />
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
