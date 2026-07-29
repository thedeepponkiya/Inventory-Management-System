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
import { AppContext } from '../../context/AppContext';
import { createLocation, updateLocation, deleteLocation, type Location as LocationType, type LocationPayload } from '../../services/locationService';
import { DEFAULT_DATA_TYPE_VALUE } from '../../common/constants/commonConstant';
import { getLocationsColumns } from '../../common/commonFunctions/CommonUtilities';
import { showToast } from '../../common/commonFunctions/commonFunction';
import './Locations.css';

const emptyForm: LocationPayload = {
    location: DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING,
    status: 'Active',
};

const Locations = () => {
    const { locations, locationsLoading, fetchLocations } = useContext(AppContext);
    const toast = useRef<Toast>(DEFAULT_DATA_TYPE_VALUE.NULL);
    const [filters, setFilters] = useState<Record<string, unknown>>({ search: DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING });
    const [panelVisible, setPanelVisible] = useState(DEFAULT_DATA_TYPE_VALUE.FALSE);
    const [form, setForm] = useState(emptyForm);
    const [editingId, setEditingId] = useState<number | null>(DEFAULT_DATA_TYPE_VALUE.NULL);

    const filterFields: FilterField[] = [
        { key: 'search', type: 'search', label: 'Search', placeholder: 'Search by location name' },
    ];

    const filteredLocations = useMemo(() => {
        const search = (filters.search as string)?.toLowerCase() ?? DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING;
        return (locations as LocationType[]).filter((loc) => {
            return !search || loc.location.toLowerCase().includes(search);
        });
    }, [locations, filters]);

    const openAddDialog = () => {
        setEditingId(DEFAULT_DATA_TYPE_VALUE.NULL);
        setForm(emptyForm);
        setPanelVisible(DEFAULT_DATA_TYPE_VALUE.TRUE);
    };

    const openEditDialog = (location: LocationType) => {
        setEditingId(location.id);
        setForm({
            location: location.location,
            status: location.status,
        });
        setPanelVisible(DEFAULT_DATA_TYPE_VALUE.TRUE);
    };

    const handleDelete = (location: LocationType) => {
        confirmDialog({
            message: `Delete location "${location.location}"? This cannot be undone.`,
            header: 'Delete Location',
            icon: 'pi pi-exclamation-triangle',
            acceptClassName: 'p-button-danger',
            accept: async () => {
                try {
                    await deleteLocation(location.id);
                    fetchLocations();
                    showToast(toast, 'success', 'Deleted', 'Location deleted successfully');
                } catch (err) {
                    showToast(toast, 'error', 'Error', err instanceof Error ? err.message : 'Something went wrong');
                }
            },
        });
    };

    const handleSave = async () => {
        try {
            if (editingId) {
                await updateLocation(editingId, form);
                showToast(toast, 'success', 'Updated', 'Location updated successfully');
            } else {
                await createLocation(form);
                showToast(toast, 'success', 'Created', 'Location created successfully');
            }
            fetchLocations();
            setForm(emptyForm);
            setEditingId(DEFAULT_DATA_TYPE_VALUE.NULL);
            setPanelVisible(DEFAULT_DATA_TYPE_VALUE.FALSE);
        } catch (err) {
            showToast(toast, 'error', 'Error', err instanceof Error ? err.message : 'Something went wrong');
        }
    };

    // toast.current is only read inside handleDelete's own click callback, never during render
    // eslint-disable-next-line react-hooks/refs
    const columns = getLocationsColumns(openEditDialog, handleDelete);

    return (
        <div className="locations-page">
            <Toast ref={toast} />

            <FilterBar
                fields={filterFields}
                values={filters}
                onChange={(key, value) => setFilters((prev) => ({ ...prev, [key]: value }))}
                onReset={() => setFilters({ search: DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING })}
                actions={<Button label="Add Location" icon={<HiOutlinePlus className="mr-2" />} onClick={openAddDialog} outlined />}
            />

            <DataTable value={filteredLocations} columns={columns} loading={locationsLoading} />

            <Dialog
                visible={panelVisible}
                onHide={() => setPanelVisible(DEFAULT_DATA_TYPE_VALUE.FALSE)}
                header={editingId ? 'Edit Location' : 'Add New Location'}
                style={{ width: '480px' }}
                footer={
                    <>
                        <Button label="Cancel" outlined onClick={() => setPanelVisible(DEFAULT_DATA_TYPE_VALUE.FALSE)} />
                        <Button label={editingId ? 'Save Changes' : 'Save Location'} onClick={handleSave} />
                    </>
                }
            >
                <div className="dialog-form-body">
                    <div className="form-field">
                        <label>Location Name</label>
                        <InputText value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Enter location name" />
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
export default Locations;
