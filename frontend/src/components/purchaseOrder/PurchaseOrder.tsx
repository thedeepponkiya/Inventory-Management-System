import { useMemo, useState } from 'react';
import { Button } from 'primereact/button';
import { Calendar } from 'primereact/calendar';
import { Dropdown } from 'primereact/dropdown';
import { InputNumber } from 'primereact/inputnumber';
import { Dialog } from 'primereact/dialog';
import { confirmDialog } from 'primereact/confirmdialog';
import { HiOutlinePlus } from 'react-icons/hi2';
import FilterBar, { type FilterField } from '../../common/commonComponents/filterBar/FilterBar';
import DataTable from '../../common/commonComponents/dataTable/DataTable';
import { useDataContext } from '../../context/DataContext';
import type { PurchaseOrder as PurchaseOrderType, PurchaseOrderStatus } from '../../mockData/purchaseOrderData';
import { DEFAULT_DATA_TYPE_VALUE } from '../../common/constants/commonConstant';
import { getPurchaseOrderColumns } from '../../common/commonFunctions/CommonUtilities';
import './PurchaseOrder.css';

const statusOptions: PurchaseOrderStatus[] = ['Draft', 'Sent', 'Approved', 'Received', 'Cancelled'];

const formatDate = (date: Date) => date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

const emptyForm: Omit<PurchaseOrderType, 'id' | 'poNumber' | 'createdBy'> = {
    date: DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING,
    supplierName: DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING,
    locationName: DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING,
    totalAmount: DEFAULT_DATA_TYPE_VALUE.ZERO,
    status: 'Draft',
};

const PurchaseOrder = () => {
    const { purchaseOrders, locations, materialInwardOptions, createPurchaseOrder, updatePurchaseOrder, deletePurchaseOrder } = useDataContext();
    const [filters, setFilters] = useState<Record<string, unknown>>({ search: DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING, status: DEFAULT_DATA_TYPE_VALUE.NULL });
    const [panelVisible, setPanelVisible] = useState(DEFAULT_DATA_TYPE_VALUE.FALSE);
    const [form, setForm] = useState(emptyForm);
    const [orderDate, setOrderDate] = useState<Date | null>(new Date());
    const [editingId, setEditingId] = useState<string | null>(DEFAULT_DATA_TYPE_VALUE.NULL);

    const filterFields: FilterField[] = [
        { key: 'search', type: 'search', label: 'Search', placeholder: 'Search by PO number / supplier' },
    ];

    const filteredPurchaseOrders = useMemo(() => {
        const search = (filters.search as string)?.toLowerCase() ?? DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING;
        const status = filters.status as string | null;
        return purchaseOrders.data.filter((po) => {
            const matchesSearch = !search || po.poNumber.toLowerCase().includes(search) || po.supplierName.toLowerCase().includes(search);
            const matchesStatus = !status || po.status === status;
            return matchesSearch && matchesStatus;
        });
    }, [purchaseOrders.data, filters]);

    const openAddDialog = () => {
        setEditingId(DEFAULT_DATA_TYPE_VALUE.NULL);
        setForm(emptyForm);
        setOrderDate(new Date());
        setPanelVisible(DEFAULT_DATA_TYPE_VALUE.TRUE);
    };

    const openEditDialog = (po: PurchaseOrderType) => {
        setEditingId(po.id);
        setForm({
            date: po.date,
            supplierName: po.supplierName,
            locationName: po.locationName,
            totalAmount: po.totalAmount,
            status: po.status,
        });
        const parsedDate = new Date(po.date);
        setOrderDate(Number.isNaN(parsedDate.getTime()) ? new Date() : parsedDate);
        setPanelVisible(DEFAULT_DATA_TYPE_VALUE.TRUE);
    };

    const handleDelete = (po: PurchaseOrderType) => {
        confirmDialog({
            message: `Delete purchase order "${po.poNumber}"? This cannot be undone.`,
            header: 'Delete Purchase Order',
            icon: 'pi pi-exclamation-triangle',
            acceptClassName: 'p-button-danger',
            accept: () => deletePurchaseOrder(po.id),
        });
    };

    const handleSave = async () => {
        const payload = { ...form, date: formatDate(orderDate ?? new Date()) };
        if (editingId) {
            await updatePurchaseOrder(editingId, payload);
        } else {
            await createPurchaseOrder({ ...payload, createdBy: 'Admin User' });
        }
        setForm(emptyForm);
        setEditingId(DEFAULT_DATA_TYPE_VALUE.NULL);
        setPanelVisible(DEFAULT_DATA_TYPE_VALUE.FALSE);
    };

    const columns = getPurchaseOrderColumns(openEditDialog, handleDelete);

    return (
        <div className="purchase-order-page">
            <FilterBar
                fields={filterFields}
                values={filters}
                onChange={(key, value) => setFilters((prev) => ({ ...prev, [key]: value }))}
                onReset={() => setFilters({ search: DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING, status: DEFAULT_DATA_TYPE_VALUE.NULL })}
                actions={<Button label="Add Purchase Order" icon={<HiOutlinePlus className="mr-2" />} onClick={openAddDialog} outlined />}
            />

            <DataTable value={filteredPurchaseOrders} columns={columns} loading={purchaseOrders.loading} />

            <Dialog
                visible={panelVisible}
                onHide={() => setPanelVisible(DEFAULT_DATA_TYPE_VALUE.FALSE)}
                header={editingId ? 'Edit Purchase Order' : 'Add New Purchase Order'}
                style={{ width: '480px' }}
                footer={
                    <>
                        <Button label="Cancel" outlined onClick={() => setPanelVisible(DEFAULT_DATA_TYPE_VALUE.FALSE)} />
                        <Button label={editingId ? 'Save Changes' : 'Save Purchase Order'} onClick={handleSave} />
                    </>
                }
            >
                <div className="dialog-form-body">
                    <div className="form-field">
                        <label>Order Date</label>
                        <Calendar value={orderDate} onChange={(e) => setOrderDate(e.value as Date)} dateFormat="dd/mm/yy" showIcon />
                    </div>
                    <div className="form-field">
                        <label>Supplier</label>
                        <Dropdown
                            value={form.supplierName}
                            onChange={(e) => setForm({ ...form, supplierName: e.value })}
                            options={materialInwardOptions.data.suppliers}
                            placeholder="Select supplier"
                        />
                    </div>
                    <div className="form-field">
                        <label>Location</label>
                        <Dropdown
                            value={form.locationName}
                            onChange={(e) => setForm({ ...form, locationName: e.value })}
                            options={locations.data.map((l) => ({ label: l.name, value: l.name }))}
                            placeholder="Select location"
                        />
                    </div>
                    <div className="form-field">
                        <label>Total Amount (Rs.)</label>
                        <InputNumber value={form.totalAmount} onValueChange={(e) => setForm({ ...form, totalAmount: e.value ?? DEFAULT_DATA_TYPE_VALUE.ZERO })} mode="decimal" minFractionDigits={2} />
                    </div>
                    <div className="form-field">
                        <label>Status</label>
                        <Dropdown value={form.status} onChange={(e) => setForm({ ...form, status: e.value })} options={statusOptions} placeholder="Select status" />
                    </div>
                </div>
            </Dialog>
        </div>
    );
};
export default PurchaseOrder;
