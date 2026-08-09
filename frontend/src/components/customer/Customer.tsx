import { useContext, useMemo, useRef, useState } from 'react';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { Dialog } from 'primereact/dialog';
import { Toast } from 'primereact/toast';
import { confirmDialog } from 'primereact/confirmdialog';
import { HiOutlinePlus, HiOutlineCheckCircle } from 'react-icons/hi2';
import FilterBar, { type FilterField } from '../../common/commonComponents/filterBar/FilterBar';
import DataTable from '../../common/commonComponents/dataTable/DataTable';
import { AppContext } from '../../context/AppContextDefinition';
import { useDateFormatContext } from '../../context/DateFormatContextDefinition';
import { createCustomer, updateCustomer, deleteCustomer, type Customer as CustomerType, type CustomerPayload } from '../../services/customerService';
import { DEFAULT_DATA_TYPE_VALUE } from '../../common/constants/commonConstant';
import { getCustomerColumns, getActionBodyTemplate } from '../../common/commonFunctions/CommonUtilities';
import { showToast } from '../../common/commonFunctions/commonFunction';
import './Customer.css';

const emptyForm: CustomerPayload = {
    customerName: DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING,
    email: DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING,
    phoneNumber: DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING,
    address: DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING,
    city: DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING,
    zipCode: DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING,
};

const Customer = () => {
    const { customers, customersLoading, fetchCustomers } = useContext(AppContext);
    const { dateFormat } = useDateFormatContext();
    const toast = useRef<Toast>(DEFAULT_DATA_TYPE_VALUE.NULL);
    const [filters, setFilters] = useState<Record<string, unknown>>({ search: DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING });
    const [panelVisible, setPanelVisible] = useState(DEFAULT_DATA_TYPE_VALUE.FALSE);
    const [form, setForm] = useState(emptyForm);
    const [editingId, setEditingId] = useState<number | null>(DEFAULT_DATA_TYPE_VALUE.NULL);

    const filterFields: FilterField[] = [
        { key: 'search', type: 'search', label: 'Search', placeholder: 'Search by customer name' },
    ];

    const filteredCustomers = useMemo(() => {
        const search = (filters.search as string)?.toLowerCase() ?? DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING;
        return (customers as CustomerType[]).filter((customer) => {
            return !search || customer.customerName.toLowerCase().includes(search);
        });
    }, [customers, filters]);

    const openAddDialog = () => {
        setEditingId(DEFAULT_DATA_TYPE_VALUE.NULL);
        setForm(emptyForm);
        setPanelVisible(DEFAULT_DATA_TYPE_VALUE.TRUE);
    };

    const openEditDialog = (customer: CustomerType) => {
        setEditingId(customer.id);
        setForm({
            customerName: customer.customerName,
            email: customer.email,
            phoneNumber: customer.phoneNumber,
            address: customer.address,
            city: customer.city,
            zipCode: customer.zipCode,
        });
        setPanelVisible(DEFAULT_DATA_TYPE_VALUE.TRUE);
    };

    const handleDelete = (customer: CustomerType) => {
        confirmDialog({
            message: `Delete customer "${customer.customerName}"? This cannot be undone.`,
            header: 'Delete Customer',
            icon: 'pi pi-exclamation-triangle',
            acceptClassName: 'p-button-danger',
            accept: async () => {
                try {
                    await deleteCustomer(customer.id);
                    fetchCustomers();
                    showToast(toast, 'success', 'Deleted', 'Customer deleted successfully');
                } catch (err) {
                    showToast(toast, 'error', 'Error', err instanceof Error ? err.message : 'Something went wrong');
                }
            },
        });
    };

    const handleSave = async () => {
        try {
            if (editingId) {
                await updateCustomer(editingId, form);
                showToast(toast, 'success', 'Updated', 'Customer updated successfully');
            } else {
                await createCustomer(form);
                showToast(toast, 'success', 'Created', 'Customer created successfully');
            }
            fetchCustomers();
            setForm(emptyForm);
            setEditingId(DEFAULT_DATA_TYPE_VALUE.NULL);
            setPanelVisible(DEFAULT_DATA_TYPE_VALUE.FALSE);
        } catch (err) {
            showToast(toast, 'error', 'Error', err instanceof Error ? err.message : 'Something went wrong');
        }
    };

    const columns = getCustomerColumns(dateFormat, openEditDialog);

    // toast.current is only read inside handleDelete's own click callback, never during render
    // eslint-disable-next-line react-hooks/refs
    const actionTemplate = getActionBodyTemplate<CustomerType>({ onDelete: handleDelete });

    return (
        <div className="customer-page">
            <Toast ref={toast} />

            <FilterBar
                fields={filterFields}
                values={filters}
                onChange={(key, value) => setFilters((prev) => ({ ...prev, [key]: value }))}
                onReset={() => setFilters({ search: DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING })}
                actions={<Button label="Add Customer" icon={<HiOutlinePlus className="mr-2" />} onClick={openAddDialog} outlined />}
            />

            <DataTable value={filteredCustomers} columns={columns} loading={customersLoading} actionBodyTemplate={actionTemplate} />

            <Dialog
                visible={panelVisible}
                onHide={() => setPanelVisible(DEFAULT_DATA_TYPE_VALUE.FALSE)}
                header={editingId ? 'Edit Customer' : 'Add New Customer'}
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
                        <label>Customer Name</label>
                        <InputText value={form.customerName} onChange={(e) => setForm({ ...form, customerName: e.target.value })} placeholder="Enter customer name" />
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
export default Customer;
