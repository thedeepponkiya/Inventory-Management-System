import { useContext, useMemo, useRef, useState } from 'react';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { InputSwitch } from 'primereact/inputswitch';
import { Dialog } from 'primereact/dialog';
import { Toast } from 'primereact/toast';
import { confirmDialog } from 'primereact/confirmdialog';
import { HiOutlinePlus, HiOutlineCheckCircle } from 'react-icons/hi2';
import FilterBar, { type FilterField } from '../../common/commonComponents/filterBar/FilterBar';
import DataTable from '../../common/commonComponents/dataTable/DataTable';
import { AppContext } from '../../context/AppContextDefinition';
import { useDateFormatContext } from '../../context/DateFormatContextDefinition';
import { createUnit, updateUnit, deleteUnit, type Unit as UnitModel, type UnitPayload } from '../../services/unitService';
import { DEFAULT_DATA_TYPE_VALUE } from '../../common/constants/commonConstant';
import { getUnitColumns, getActionBodyTemplate } from '../../common/commonFunctions/CommonUtilities';
import { showToast } from '../../common/commonFunctions/commonFunction';
import './Unit.css';

const emptyForm: UnitPayload = {
    unit: DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING,
    status: 'Active',
};

const Unit = () => {
    const { units, unitsLoading, fetchUnits } = useContext(AppContext);
    const { dateFormat } = useDateFormatContext();
    const toast = useRef<Toast>(DEFAULT_DATA_TYPE_VALUE.NULL);
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
            status: item.status,
        });
        setPanelVisible(DEFAULT_DATA_TYPE_VALUE.TRUE);
    };

    const handleDelete = (item: UnitModel) => {
        confirmDialog({
            message: `Delete unit "${item.unit}"? This cannot be undone.`,
            header: 'Delete Unit',
            icon: 'pi pi-exclamation-triangle',
            acceptClassName: 'p-button-danger',
            accept: async () => {
                try {
                    await deleteUnit(item.id);
                    fetchUnits();
                    showToast(toast, 'success', 'Deleted', 'Unit deleted successfully');
                } catch (err) {
                    showToast(toast, 'error', 'Error', err instanceof Error ? err.message : 'Something went wrong');
                }
            },
        });
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

    // toast.current is only read inside handleDelete's own click callback, never during render
    // eslint-disable-next-line react-hooks/refs
    const actionTemplate = getActionBodyTemplate<UnitModel>({ onDelete: handleDelete });

    return (
        <div className="unit-page">
            <Toast ref={toast} />

            <FilterBar
                fields={filterFields}
                values={filters}
                onChange={(key, value) => setFilters((prev) => ({ ...prev, [key]: value }))}
                onReset={() => setFilters({ search: DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING })}
                actions={<Button label="Add Unit" icon={<HiOutlinePlus className="mr-2" />} onClick={openAddDialog} outlined />}
            />

            <DataTable value={filteredUnits} columns={columns} loading={unitsLoading} actionBodyTemplate={actionTemplate} />

            <Dialog
                visible={panelVisible}
                onHide={() => setPanelVisible(DEFAULT_DATA_TYPE_VALUE.FALSE)}
                header={editingId ? 'Edit Unit' : 'Add New Unit'}
                style={{ width: '480px' }}
                footer={
                    <>
                        <Button label="Cancel" outlined onClick={() => setPanelVisible(DEFAULT_DATA_TYPE_VALUE.FALSE)} />
                        <Button label="Save" icon={<HiOutlineCheckCircle className="mr-2" />} onClick={handleSave} />
                    </>
                }
            >
                <div className="dialog-form-body">
                    <div className="form-field">
                        <label>Unit Name</label>
                        <InputText value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} placeholder="Enter unit name" />
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
export default Unit;
