import { useContext, useMemo, useRef, useState } from 'react';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { InputTextarea } from 'primereact/inputtextarea';
import { InputSwitch } from 'primereact/inputswitch';
import { Dialog } from 'primereact/dialog';
import { Toast } from 'primereact/toast';
import { HiOutlinePlus, HiOutlineCheckCircle, HiOutlineTrash, HiOutlineArrowPath } from 'react-icons/hi2';
import FilterBar, { type FilterField } from '../../common/commonComponents/filterBar/FilterBar';
import DataTable from '../../common/commonComponents/dataTable/DataTable';
import { AppContext } from '../../context/AppContextDefinition';
import { useDateFormatContext } from '../../context/DateFormatContextDefinition';
import { createCategory, updateCategory, deleteCategory, type Category as CategoryType, type CategoryPayload } from '../../services/categoryService';
import { DEFAULT_DATA_TYPE_VALUE } from '../../common/constants/commonConstant';
import { getCategoryColumns } from '../../common/commonFunctions/CommonUtilities';
import { showToast } from '../../common/commonFunctions/commonFunction';
import { useBulkDelete } from '../../common/commonFunctions/useBulkDelete';
import './Category.css';

const DESCRIPTION_MAX_LENGTH = 200;

const emptyForm: CategoryPayload = {
    category: DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING,
    description: DEFAULT_DATA_TYPE_VALUE.NULL,
    status: 'Active',
};

const Category = () => {
    const { categories, categoriesLoading, fetchCategories } = useContext(AppContext);
    const { dateFormat } = useDateFormatContext();
    const toast = useRef<Toast>(DEFAULT_DATA_TYPE_VALUE.NULL);
    const [filters, setFilters] = useState<Record<string, unknown>>({ search: DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING });
    const [panelVisible, setPanelVisible] = useState(DEFAULT_DATA_TYPE_VALUE.FALSE);
    const [form, setForm] = useState(emptyForm);
    const [editingId, setEditingId] = useState<number | null>(DEFAULT_DATA_TYPE_VALUE.NULL);

    const filterFields: FilterField[] = [
        { key: 'search', type: 'search', label: 'Search', placeholder: 'Search by category name' },
    ];

    const filteredCategories = useMemo(() => {
        const search = (filters.search as string)?.toLowerCase() ?? DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING;
        return (categories as CategoryType[]).filter((cat) => {
            return !search || cat.category.toLowerCase().includes(search);
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
            category: category.category,
            description: category.description,
            status: category.status,
        });
        setPanelVisible(DEFAULT_DATA_TYPE_VALUE.TRUE);
    };

    const handleSave = async () => {
        try {
            if (editingId) {
                await updateCategory(editingId, form);
                showToast(toast, 'success', 'Updated', 'Category updated successfully');
            } else {
                await createCategory(form);
                showToast(toast, 'success', 'Created', 'Category created successfully');
            }
            fetchCategories();
            setForm(emptyForm);
            setEditingId(DEFAULT_DATA_TYPE_VALUE.NULL);
            setPanelVisible(DEFAULT_DATA_TYPE_VALUE.FALSE);
        } catch (err) {
            showToast(toast, 'error', 'Error', err instanceof Error ? err.message : 'Something went wrong');
        }
    };

    const columns = getCategoryColumns(dateFormat, openEditDialog);

    const { selectedRows, setSelectedRows, handleBulkDelete, bulkDeleting } = useBulkDelete<CategoryType>({
        getId: (row) => row.id,
        deleteOne: deleteCategory,
        onDeleted: fetchCategories,
        toast,
        entityNamePlural: 'categories',
    });

    return (
        <div className="category-page">
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
                        <Button className="filter-bar-add-btn" label="Add Category" icon={<HiOutlinePlus className="mr-2" />} onClick={openAddDialog} outlined />
                    </>
                }
                trailingActions={
                    <Button className="filter-bar-refresh-btn" icon={<HiOutlineArrowPath />} outlined size="small" onClick={fetchCategories} loading={categoriesLoading} aria-label="Refresh" title="Refresh" />
                }
            />

            <DataTable
                value={filteredCategories}
                columns={columns}
                loading={categoriesLoading}
                selectable
                selection={selectedRows}
                onSelectionChange={setSelectedRows}
            />

            <Dialog
                visible={panelVisible}
                onHide={() => setPanelVisible(DEFAULT_DATA_TYPE_VALUE.FALSE)}
                header={editingId ? 'Edit Category' : 'Add New Category'}
                style={{ width: '520px', maxWidth: '95vw' }}
                footer={
                    <>
                        <Button label="Cancel" outlined onClick={() => setPanelVisible(DEFAULT_DATA_TYPE_VALUE.FALSE)} />
                        <Button label="Save Category" icon={<HiOutlineCheckCircle className="mr-2" />} onClick={handleSave} />
                    </>
                }
            >
                <div className="category-dialog-body">
                    <div className="form-field">
                        <label>Category Name <span className="category-required">*</span></label>
                        <InputText
                            value={form.category}
                            onChange={(e) => setForm({ ...form, category: e.target.value })}
                            placeholder="Enter category name"
                        />
                    </div>

                    <div className="form-field category-field--tight">
                        <label>Description <span className="category-optional">(Optional)</span></label>
                        <InputTextarea
                            value={form.description ?? DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING}
                            onChange={(e) => setForm({ ...form, description: e.target.value.slice(0, DESCRIPTION_MAX_LENGTH) })}
                            rows={3}
                            maxLength={DESCRIPTION_MAX_LENGTH}
                            placeholder="Enter category description (optional)"
                        />
                        <span className="category-char-count">{(form.description ?? DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING).length} / {DESCRIPTION_MAX_LENGTH}</span>
                    </div>

                    <div className="form-field">
                        <label>Status <span className="category-required">*</span></label>
                        <div className="category-status-row">
                            <InputSwitch checked={form.status === 'Active'} onChange={(e) => setForm({ ...form, status: e.value ? 'Active' : 'Inactive' })} />
                            <div className="category-status-text">
                                <span className="category-status-title">{form.status === 'Active' ? 'Active' : 'Inactive'}</span>
                                <span className="category-status-desc">
                                    {form.status === 'Active' ? 'Category will be active and available for use.' : 'Category will be inactive and hidden.'}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </Dialog>
        </div>
    );
};
export default Category;
