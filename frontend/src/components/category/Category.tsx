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
import { categoryMockData, type Category as CategoryType } from '../../mockData/categoryData';
import { DEFAULT_DATA_TYPE_VALUE } from '../../common/constants/commonConstant';
import { getCategoryColumns } from '../../common/commonFunctions/CommonUtilities';
import './Category.css';

const emptyForm: Omit<CategoryType, 'id' | 'code' | 'skuCount'> = {
    name: DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING, description: DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING, status: 'Active',
};

const Category = () => {
    const [categories, setCategories] = useState<CategoryType[]>(categoryMockData);
    const [filters, setFilters] = useState<Record<string, unknown>>({ search: DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING });
    const [panelVisible, setPanelVisible] = useState(DEFAULT_DATA_TYPE_VALUE.FALSE);
    const [form, setForm] = useState(emptyForm);
    const [editingId, setEditingId] = useState<string | null>(DEFAULT_DATA_TYPE_VALUE.NULL);

    const filterFields: FilterField[] = [
        { key: 'search', type: 'search', label: 'Search', placeholder: 'Search by category code / name' },
    ];

    const filteredCategories = useMemo(() => {
        const search = (filters.search as string)?.toLowerCase() ?? DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING;
        return categories.filter((cat) => {
            return !search || cat.code.toLowerCase().includes(search) || cat.name.toLowerCase().includes(search);
        });
    }, [categories, filters]);

    const openAddDialog = () => {
        setEditingId(DEFAULT_DATA_TYPE_VALUE.NULL);
        setForm(emptyForm);
        setPanelVisible(DEFAULT_DATA_TYPE_VALUE.TRUE);
    };

    const openEditDialog = (category: CategoryType) => {
        setEditingId(category.id);
        setForm({
            name: category.name,
            description: category.description,
            status: category.status,
        });
        setPanelVisible(DEFAULT_DATA_TYPE_VALUE.TRUE);
    };

    const handleDelete = (category: CategoryType) => {
        confirmDialog({
            message: `Delete category "${category.name}"? This cannot be undone.`,
            header: 'Delete Category',
            icon: 'pi pi-exclamation-triangle',
            acceptClassName: 'p-button-danger',
            accept: () => setCategories((prev) => prev.filter((item) => item.id !== category.id)),
        });
    };

    const handleSave = () => {
        if (editingId) {
            setCategories((prev) => prev.map((category) => (category.id === editingId ? { ...category, ...form } : category)));
        } else {
            const nextCode = `CAT-${String(categories.length + 1).padStart(3, '0')}`;
            setCategories((prev) => [...prev, { id: nextCode, code: nextCode, skuCount: 0, ...form }]);
        }
        setForm(emptyForm);
        setEditingId(DEFAULT_DATA_TYPE_VALUE.NULL);
        setPanelVisible(DEFAULT_DATA_TYPE_VALUE.FALSE);
    };

    const columns = getCategoryColumns(openEditDialog, handleDelete);

    return (
        <div className="category-page">
            <FilterBar
                fields={filterFields}
                values={filters}
                onChange={(key, value) => setFilters((prev) => ({ ...prev, [key]: value }))}
                onReset={() => setFilters({ search: DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING })}
                actions={<Button label="Add Category" icon={<HiOutlinePlus className="mr-2" />} onClick={openAddDialog} outlined />}
            />

            <DataTable value={filteredCategories} columns={columns} />

            <Dialog
                visible={panelVisible}
                onHide={() => setPanelVisible(DEFAULT_DATA_TYPE_VALUE.FALSE)}
                header={editingId ? 'Edit Category' : 'Add New Category'}
                style={{ width: '480px' }}
                footer={
                    <>
                        <Button label="Cancel" outlined onClick={() => setPanelVisible(DEFAULT_DATA_TYPE_VALUE.FALSE)} />
                        <Button label={editingId ? 'Save Changes' : 'Save Category'} onClick={handleSave} />
                    </>
                }
            >
                <div className="dialog-form-body">
                    <div className="form-field">
                        <label>Category Name</label>
                        <InputText value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Enter category name" />
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
export default Category;
