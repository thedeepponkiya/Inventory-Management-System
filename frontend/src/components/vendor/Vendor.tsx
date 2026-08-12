import { useContext, useMemo, useRef, useState } from 'react';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { Dialog } from 'primereact/dialog';
import { Toast } from 'primereact/toast';
import { HiOutlinePlus, HiOutlineCheckCircle, HiOutlineTrash, HiOutlineArrowPath } from 'react-icons/hi2';
import FilterBar, { type FilterField } from '../../common/commonComponents/filterBar/FilterBar';
import DataTable from '../../common/commonComponents/dataTable/DataTable';
import { AppContext } from '../../context/AppContextDefinition';
import { useDateFormatContext } from '../../context/DateFormatContextDefinition';
import { createVendor, updateVendor, deleteVendor, type Vendor as VendorType, type VendorPayload } from '../../services/vendorService';
import { DEFAULT_DATA_TYPE_VALUE } from '../../common/constants/commonConstant';
import { getVendorColumns } from '../../common/commonFunctions/CommonUtilities';
import { showToast } from '../../common/commonFunctions/commonFunction';
import { useBulkDelete } from '../../common/commonFunctions/useBulkDelete';
import './Vendor.css';

const emptyForm: VendorPayload = {
    vendorName: DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING,
    email: DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING,
    phoneNumber: DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING,
    address: DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING,
    city: DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING,
    zipCode: DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING,
};

const Vendor = () => {
    const { vendors, vendorsLoading, fetchVendors } = useContext(AppContext);
    const { dateFormat } = useDateFormatContext();
    const toast = useRef<Toast>(DEFAULT_DATA_TYPE_VALUE.NULL);
    const [filters, setFilters] = useState<Record<string, unknown>>({ search: DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING });
    const [panelVisible, setPanelVisible] = useState(DEFAULT_DATA_TYPE_VALUE.FALSE);
    const [form, setForm] = useState(emptyForm);
    const [editingId, setEditingId] = useState<number | null>(DEFAULT_DATA_TYPE_VALUE.NULL);

    const filterFields: FilterField[] = [
        { key: 'search', type: 'search', label: 'Search', placeholder: 'Search by vendor name' },
    ];

    const filteredVendors = useMemo(() => {
        const search = (filters.search as string)?.toLowerCase() ?? DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING;
        return (vendors as VendorType[]).filter((vendor) => {
            return !search || vendor.vendorName.toLowerCase().includes(search);
        });
    }, [vendors, filters]);

    const openAddDialog = () => {
        setEditingId(DEFAULT_DATA_TYPE_VALUE.NULL);
        setForm(emptyForm);
        setPanelVisible(DEFAULT_DATA_TYPE_VALUE.TRUE);
    };

    const openEditDialog = (vendor: VendorType) => {
        setEditingId(vendor.id);
        setForm({
            vendorName: vendor.vendorName,
            email: vendor.email,
            phoneNumber: vendor.phoneNumber,
            address: vendor.address,
            city: vendor.city,
            zipCode: vendor.zipCode,
        });
        setPanelVisible(DEFAULT_DATA_TYPE_VALUE.TRUE);
    };

    const handleSave = async () => {
        try {
            if (editingId) {
                await updateVendor(editingId, form);
                showToast(toast, 'success', 'Updated', 'Vendor updated successfully');
            } else {
                await createVendor(form);
                showToast(toast, 'success', 'Created', 'Vendor created successfully');
            }
            fetchVendors();
            setForm(emptyForm);
            setEditingId(DEFAULT_DATA_TYPE_VALUE.NULL);
            setPanelVisible(DEFAULT_DATA_TYPE_VALUE.FALSE);
        } catch (err) {
            showToast(toast, 'error', 'Error', err instanceof Error ? err.message : 'Something went wrong');
        }
    };

    const columns = getVendorColumns(dateFormat, openEditDialog);

    const { selectedRows, setSelectedRows, handleBulkDelete, bulkDeleting } = useBulkDelete<VendorType>({
        getId: (row) => row.id,
        deleteOne: deleteVendor,
        onDeleted: fetchVendors,
        toast,
        entityNamePlural: 'vendors',
    });

    return (
        <div className="vendor-page">
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
                        <Button label="Add Vendor" icon={<HiOutlinePlus className="mr-2" />} onClick={openAddDialog} outlined />
                    </>
                }
                trailingActions={
                    <Button icon={<HiOutlineArrowPath />} outlined size="small" onClick={fetchVendors} loading={vendorsLoading} aria-label="Refresh" title="Refresh" />
                }
            />

            <DataTable
                value={filteredVendors}
                columns={columns}
                loading={vendorsLoading}
                selectable
                selection={selectedRows}
                onSelectionChange={setSelectedRows}
            />

            <Dialog
                visible={panelVisible}
                onHide={() => setPanelVisible(DEFAULT_DATA_TYPE_VALUE.FALSE)}
                header={editingId ? 'Edit Vendor' : 'Add New Vendor'}
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
                        <label>Vendor Name</label>
                        <InputText value={form.vendorName} onChange={(e) => setForm({ ...form, vendorName: e.target.value })} placeholder="Enter vendor name" />
                    </div>
                    <div className="form-field">
                        <label>Email</label>
                        <InputText value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="Enter email address" />
                    </div>
                    <div className="form-field">
                        <label>Phone Number</label>
                        <InputText value={form.phoneNumber} onChange={(e) => setForm({ ...form, phoneNumber: e.target.value })} placeholder="Enter phone number" />
                    </div>
                    <div className="form-field">
                        <label>Address</label>
                        <InputText value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Enter address" />
                    </div>
                    <div className="form-field">
                        <label>City</label>
                        <InputText value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} placeholder="Enter city" />
                    </div>
                    <div className="form-field">
                        <label>Zip Code</label>
                        <InputText value={form.zipCode} onChange={(e) => setForm({ ...form, zipCode: e.target.value })} placeholder="Enter zip code" />
                    </div>
                </div>
            </Dialog>
        </div>
    );
};
export default Vendor;
