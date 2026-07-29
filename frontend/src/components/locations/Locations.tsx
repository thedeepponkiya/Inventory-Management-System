import { useMemo, useState } from 'react';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { InputTextarea } from 'primereact/inputtextarea';
import { Dropdown } from 'primereact/dropdown';
import { InputSwitch } from 'primereact/inputswitch';
import { Dialog } from 'primereact/dialog';
import { confirmDialog } from 'primereact/confirmdialog';
import { HiOutlinePlus } from 'react-icons/hi2';
import FilterBar, { type FilterField } from '../../common/commonComponents/filterBar/FilterBar';
import DataTable from '../../common/commonComponents/dataTable/DataTable';
import { locationMockData, type Location as LocationType } from '../../mockData/locationData';
import { DEFAULT_DATA_TYPE_VALUE } from '../../common/constants/commonConstant';
import { getLocationsColumns } from '../../common/commonFunctions/CommonUtilities';
import './Locations.css';

const emptyForm: Omit<LocationType, 'id' | 'code' | 'totalSkus'> = {
    name: DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING, description: DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING, warehouseArea: DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING, aisleRow: DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING, rackShelf: DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING, binPosition: DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING, status: 'Active',
};

const Locations = () => {
    const [locations, setLocations] = useState<LocationType[]>(locationMockData);
    const [filters, setFilters] = useState<Record<string, unknown>>({ search: DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING });
    const [panelVisible, setPanelVisible] = useState(DEFAULT_DATA_TYPE_VALUE.FALSE);
    const [form, setForm] = useState(emptyForm);
    const [editingId, setEditingId] = useState<string | null>(DEFAULT_DATA_TYPE_VALUE.NULL);

    const filterFields: FilterField[] = [
        { key: 'search', type: 'search', label: 'Search', placeholder: 'Search by location code / name' },
    ];

    const filteredLocations = useMemo(() => {
        const search = (filters.search as string)?.toLowerCase() ?? DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING;
        return locations.filter((loc) => {
            return !search || loc.code.toLowerCase().includes(search) || loc.name.toLowerCase().includes(search);
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
            name: location.name,
            description: location.description,
            warehouseArea: location.warehouseArea,
            aisleRow: location.aisleRow,
            rackShelf: location.rackShelf,
            binPosition: location.binPosition,
            status: location.status,
        });
        setPanelVisible(DEFAULT_DATA_TYPE_VALUE.TRUE);
    };

    const handleDelete = (location: LocationType) => {
        confirmDialog({
            message: `Delete location "${location.name}"? This cannot be undone.`,
            header: 'Delete Location',
            icon: 'pi pi-exclamation-triangle',
            acceptClassName: 'p-button-danger',
            accept: () => setLocations((prev) => prev.filter((item) => item.id !== location.id)),
        });
    };

    const handleSave = () => {
        if (editingId) {
            setLocations((prev) => prev.map((location) => (location.id === editingId ? { ...location, ...form } : location)));
        } else {
            const nextCode = `LOC-${String(locations.length + 1).padStart(3, '0')}`;
            setLocations((prev) => [...prev, { id: nextCode, code: nextCode, totalSkus: 0, ...form }]);
        }
        setForm(emptyForm);
        setEditingId(DEFAULT_DATA_TYPE_VALUE.NULL);
        setPanelVisible(DEFAULT_DATA_TYPE_VALUE.FALSE);
    };

    const columns = getLocationsColumns(openEditDialog, handleDelete);

    return (
        <div className="locations-page">
            <FilterBar
                fields={filterFields}
                values={filters}
                onChange={(key, value) => setFilters((prev) => ({ ...prev, [key]: value }))}
                onReset={() => setFilters({ search: DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING })}
                actions={<Button label="Add Location" icon={<HiOutlinePlus className="mr-2" />} onClick={openAddDialog} outlined />}
            />

            <DataTable value={filteredLocations} columns={columns} />

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
                        <InputText value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Enter location name" />
                    </div>
                    <div className="form-field">
                        <label>Description</label>
                        <InputTextarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} placeholder="Enter description (optional)" />
                    </div>
                    <div className="form-field">
                        <label>Warehouse / Area</label>
                        <Dropdown
                            value={form.warehouseArea}
                            onChange={(e) => setForm({ ...form, warehouseArea: e.value })}
                            options={['Main Warehouse', 'Spare Parts', 'Finished Goods', 'Quarantine', 'Raw Material', 'Returns', 'Old Stock', 'Tools']}
                            placeholder="Select warehouse / area"
                        />
                    </div>
                    <div className="form-field">
                        <label>Aisle / Row</label>
                        <InputText value={form.aisleRow} onChange={(e) => setForm({ ...form, aisleRow: e.target.value })} placeholder="Enter aisle / row" />
                    </div>
                    <div className="form-field">
                        <label>Rack / Shelf</label>
                        <InputText value={form.rackShelf} onChange={(e) => setForm({ ...form, rackShelf: e.target.value })} placeholder="Enter rack / shelf" />
                    </div>
                    <div className="form-field">
                        <label>Bin / Position</label>
                        <InputText value={form.binPosition} onChange={(e) => setForm({ ...form, binPosition: e.target.value })} placeholder="Enter bin / position" />
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
