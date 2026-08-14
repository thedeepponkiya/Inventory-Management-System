import { useContext, useMemo, useRef, useState } from 'react';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { InputTextarea } from 'primereact/inputtextarea';
import { InputSwitch } from 'primereact/inputswitch';
import { Dialog } from 'primereact/dialog';
import { Toast } from 'primereact/toast';
import { HiOutlinePlus, HiOutlineCheckCircle, HiOutlineTrash, HiOutlineArrowPath } from 'react-icons/hi2';
import FilterBar, { type FilterField } from '../../common/commonComponents/filterBar/FilterBar';
import DataTable, { type DataTableHandle } from '../../common/commonComponents/dataTable/DataTable';
import { AppContext } from '../../context/AppContextDefinition';
import { useDateFormatContext } from '../../context/DateFormatContextDefinition';
import { createUnit, updateUnit, deleteUnit, type Unit as UnitModel, type UnitPayload } from '../../services/unitService';
import { DEFAULT_DATA_TYPE_VALUE } from '../../common/constants/commonConstant';
import { getUnitColumns } from '../../common/commonFunctions/CommonUtilities';
import { showToast } from '../../common/commonFunctions/commonFunction';
import { useBulkDelete } from '../../common/commonFunctions/useBulkDelete';
import './Unit.css';

const DESCRIPTION_MAX_LENGTH = 200;

const emptyForm: UnitPayload = {
    unit: DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING,
    description: DEFAULT_DATA_TYPE_VALUE.NULL,
    status: 'Active',
};

const Unit = () => {
    const { units, unitsLoading, fetchUnits } = useContext(AppContext);
    const { dateFormat } = useDateFormatContext();
    const toast = useRef<Toast>(DEFAULT_DATA_TYPE_VALUE.NULL);
    const dataTableRef = useRef<DataTableHandle>(null);
    const [filters, setFilters] = useState<Record<string, unknown>>({ search: DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING });
    const [panelVisible, setPanelVisible] = useState(DEFAULT_DATA_TYPE_VALUE.FALSE);
    const [form, setForm] = useState(emptyForm);
    const [editingId, setEditingId] = useState<number | null>(DEFAULT_DATA_TYPE_VALUE.NULL);

    const filterFields: FilterField[] = [
        { key: 'search', type: 'search', label: 'Search', placeholder: 'Search by unit name' },
    ];

    const filteredUnits = useMemo(() => {
        const search = (filters.search as string)?.toLowerCase() ?? DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING;
        return (units as UnitModel[]).filter((item) => {
            return !search || item.unit.toLowerCase().includes(search);
        });
    }, [units, filters]);

    const openAddDialog = () => {
        setEditingId(DEFAULT_DATA_TYPE_VALUE.NULL);
        setForm(emptyForm);
        setPanelVisible(DEFAULT_DATA_TYPE_VALUE.TRUE);
    };

    const openEditDialog = (item: UnitModel) => {
        setEditingId(item.id);
        setForm({
            unit: item.unit,
            description: item.description,
            status: item.status,
        });
        setPanelVisible(DEFAULT_DATA_TYPE_VALUE.TRUE);
    };

    const handleSave = async () => {
        try {
            if (editingId) {
                await updateUnit(editingId, form);
                showToast(toast, 'success', 'Updated', 'Unit updated successfully');
            } else {
                await createUnit(form);
                showToast(toast, 'success', 'Created', 'Unit created successfully');
            }
            fetchUnits();
            setForm(emptyForm);
            setEditingId(DEFAULT_DATA_TYPE_VALUE.NULL);
            setPanelVisible(DEFAULT_DATA_TYPE_VALUE.FALSE);
        } catch (err) {
            showToast(toast, 'error', 'Error', err instanceof Error ? err.message : 'Something went wrong');
        }
    };

    const columns = getUnitColumns(dateFormat, openEditDialog);

    const { selectedRows, setSelectedRows, handleBulkDelete, bulkDeleting } = useBulkDelete<UnitModel>({
        getId: (row) => row.id,
        deleteOne: deleteUnit,
        onDeleted: fetchUnits,
        toast,
        entityNamePlural: 'units',
    });

    return (
        <div className="unit-page">
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
                        <Button className="filter-bar-add-btn" label="Add Unit" icon={<HiOutlinePlus className="mr-2" />} onClick={openAddDialog} outlined />
                    </>
                }
                trailingActions={
                    <Button className="filter-bar-refresh-btn" icon={<HiOutlineArrowPath />} outlined size="small" onClick={fetchUnits} loading={unitsLoading} aria-label="Refresh" title="Refresh" />
                }
            />

            <DataTable
                ref={dataTableRef}
                value={filteredUnits}
                columns={columns}
                loading={unitsLoading}
                selectable
                selection={selectedRows}
                onSelectionChange={setSelectedRows}
            />

            <Dialog
                visible={panelVisible}
                onHide={() => setPanelVisible(DEFAULT_DATA_TYPE_VALUE.FALSE)}
                header={editingId ? 'Edit Unit' : 'Add New Unit'}
                style={{ width: '520px', maxWidth: '95vw' }}
                footer={
                    <>
                        <Button label="Cancel" outlined onClick={() => setPanelVisible(DEFAULT_DATA_TYPE_VALUE.FALSE)} />
                        <Button label="Save Unit" icon={<HiOutlineCheckCircle className="mr-2" />} onClick={handleSave} />
                    </>
                }
            >
                <div className="unit-dialog-body">
                    <div className="form-field">
                        <label>Unit Name <span className="unit-required">*</span></label>
                        <InputText
                            value={form.unit}
                            onChange={(e) => setForm({ ...form, unit: e.target.value })}
                            placeholder="Enter unit name"
                        />
                    </div>

                    <div className="form-field unit-field--tight">
                        <label>Description <span className="unit-optional">(Optional)</span></label>
                        <InputTextarea
                            value={form.description ?? DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING}
                            onChange={(e) => setForm({ ...form, description: e.target.value.slice(0, DESCRIPTION_MAX_LENGTH) })}
                            rows={3}
                            maxLength={DESCRIPTION_MAX_LENGTH}
                            placeholder="Enter unit description (optional)"
                        />
                        <span className="unit-char-count">{(form.description ?? DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING).length} / {DESCRIPTION_MAX_LENGTH}</span>
                    </div>

                    <div className="form-field">
                        <label>Status <span className="unit-required">*</span></label>
                        <div className="unit-status-row">
                            <InputSwitch checked={form.status === 'Active'} onChange={(e) => setForm({ ...form, status: e.value ? 'Active' : 'Inactive' })} />
                            <div className="unit-status-text">
                                <span className="unit-status-title">{form.status === 'Active' ? 'Active' : 'Inactive'}</span>
                                <span className="unit-status-desc">
                                    {form.status === 'Active' ? 'Unit will be active and available for use.' : 'Unit will be inactive and hidden.'}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </Dialog>
        </div>
    );
};
export default Unit;
