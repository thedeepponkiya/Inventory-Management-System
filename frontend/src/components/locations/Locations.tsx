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
import { createLocation, updateLocation, deleteLocation, type Location as LocationType, type LocationPayload } from '../../services/locationService';
import { DEFAULT_DATA_TYPE_VALUE } from '../../common/constants/commonConstant';
import { getLocationsColumns } from '../../common/commonFunctions/CommonUtilities';
import { showToast } from '../../common/commonFunctions/commonFunction';
import { useBulkDelete } from '../../common/commonFunctions/useBulkDelete';
import './Locations.css';

const DESCRIPTION_MAX_LENGTH = 200;

const emptyForm: LocationPayload = {
    location: DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING,
    description: DEFAULT_DATA_TYPE_VALUE.NULL,
    status: 'Active',
};

const Locations = () => {
    const { locations, locationsLoading, fetchLocations } = useContext(AppContext);
    const { dateFormat } = useDateFormatContext();
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
            description: location.description,
            status: location.status,
        });
        setPanelVisible(DEFAULT_DATA_TYPE_VALUE.TRUE);
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

    const columns = getLocationsColumns(dateFormat, openEditDialog);

    const { selectedRows, setSelectedRows, handleBulkDelete, bulkDeleting } = useBulkDelete<LocationType>({
        getId: (row) => row.id,
        deleteOne: deleteLocation,
        onDeleted: fetchLocations,
        toast,
        entityNamePlural: 'locations',
    });

    return (
        <div className="locations-page">
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
                        <Button className="filter-bar-add-btn" label="Add Location" icon={<HiOutlinePlus className="mr-2" />} onClick={openAddDialog} outlined />
                    </>
                }
                trailingActions={
                    <Button className="filter-bar-refresh-btn" icon={<HiOutlineArrowPath />} outlined size="small" onClick={fetchLocations} loading={locationsLoading} aria-label="Refresh" title="Refresh" />
                }
            />

            <DataTable
                value={filteredLocations}
                columns={columns}
                loading={locationsLoading}
                selectable
                selection={selectedRows}
                onSelectionChange={setSelectedRows}
            />

            <Dialog
                visible={panelVisible}
                onHide={() => setPanelVisible(DEFAULT_DATA_TYPE_VALUE.FALSE)}
                header={editingId ? 'Edit Location' : 'Add New Location'}
                style={{ width: '520px', maxWidth: '95vw' }}
                footer={
                    <>
                        <Button label="Cancel" outlined onClick={() => setPanelVisible(DEFAULT_DATA_TYPE_VALUE.FALSE)} />
                        <Button label="Save Location" icon={<HiOutlineCheckCircle className="mr-2" />} onClick={handleSave} />
                    </>
                }
            >
                <div className="location-dialog-body">
                    <div className="form-field">
                        <label>Location Name <span className="location-required">*</span></label>
                        <InputText
                            value={form.location}
                            onChange={(e) => setForm({ ...form, location: e.target.value })}
                            placeholder="Enter location name"
                        />
                    </div>

                    <div className="form-field location-field--tight">
                        <label>Description <span className="location-optional">(Optional)</span></label>
                        <InputTextarea
                            value={form.description ?? DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING}
                            onChange={(e) => setForm({ ...form, description: e.target.value.slice(0, DESCRIPTION_MAX_LENGTH) })}
                            rows={3}
                            maxLength={DESCRIPTION_MAX_LENGTH}
                            placeholder="Enter location description (optional)"
                        />
                        <span className="location-char-count">{(form.description ?? DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING).length} / {DESCRIPTION_MAX_LENGTH}</span>
                    </div>

                    <div className="form-field">
                        <label>Status <span className="location-required">*</span></label>
                        <div className="location-status-row">
                            <InputSwitch checked={form.status === 'Active'} onChange={(e) => setForm({ ...form, status: e.value ? 'Active' : 'Inactive' })} />
                            <div className="location-status-text">
                                <span className="location-status-title">{form.status === 'Active' ? 'Active' : 'Inactive'}</span>
                                <span className="location-status-desc">
                                    {form.status === 'Active' ? 'Location will be active and available for use.' : 'Location will be inactive and hidden.'}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </Dialog>
        </div>
    );
};
export default Locations;
