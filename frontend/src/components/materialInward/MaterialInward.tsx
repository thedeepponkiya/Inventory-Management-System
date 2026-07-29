import { Button } from 'primereact/button';
import { Calendar } from 'primereact/calendar';
import { Dialog } from 'primereact/dialog';
import { Dropdown } from 'primereact/dropdown';
import { InputText } from 'primereact/inputtext';
import { InputTextarea } from 'primereact/inputtextarea';
import { Toast } from 'primereact/toast';
import { useMemo, useRef, useState } from 'react';
import { HiOutlinePlus } from 'react-icons/hi2';
import DataTable from '../../common/commonComponents/dataTable/DataTable';
import FilterBar from '../../common/commonComponents/filterBar/FilterBar';
import type { FilterField } from '../../common/commonComponents/filterBar/FilterBar';
import { categoryMockData } from '../../mockData/categoryData';
import { skuMockData } from '../../mockData/skuData';
import { supplierMockData, transporterMockData, recentInwardsMockData, type RecentInward } from '../../mockData/materialInwardData';
import { DEFAULT_DATA_TYPE_VALUE } from '../../common/constants/commonConstant';
import { getMaterialInwardItemColumns, getMaterialInwardInwardColumns, type InwardItem } from '../../common/commonFunctions/CommonUtilities';
import { showToast } from '../../common/commonFunctions/commonFunction';
import './MaterialInward.css';

const emptyItem = (id: number): InwardItem => ({ id, categoryName: DEFAULT_DATA_TYPE_VALUE.NULL, skuCode: DEFAULT_DATA_TYPE_VALUE.NULL, batchNo: DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING, qty: DEFAULT_DATA_TYPE_VALUE.ZERO, unitPrice: DEFAULT_DATA_TYPE_VALUE.ZERO });

let nextItemId = 1;

const MaterialInward = () => {
    const toast = useRef<Toast>(DEFAULT_DATA_TYPE_VALUE.NULL);
    const [recentInwards, setRecentInwards] = useState<RecentInward[]>(recentInwardsMockData);
    const [dialogVisible, setDialogVisible] = useState(DEFAULT_DATA_TYPE_VALUE.FALSE);
    const [filters, setFilters] = useState<Record<string, unknown>>({ search: DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING });

    const [invoiceNo, setInvoiceNo] = useState(DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING);
    const [supplier, setSupplier] = useState<string | null>(DEFAULT_DATA_TYPE_VALUE.NULL);
    const [invoiceDate, setInvoiceDate] = useState<Date | null>(new Date());
    const [referenceNo, setReferenceNo] = useState(DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING);
    const [transporter, setTransporter] = useState<string | null>(DEFAULT_DATA_TYPE_VALUE.NULL);
    const [receivedBy] = useState('Admin User');
    const [notes, setNotes] = useState(DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING);
    const [paymentStatus, setPaymentStatus] = useState('Paid');
    const [paymentMode, setPaymentMode] = useState('Bank Transfer');
    const [remarks, setRemarks] = useState(DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING);

    const [items, setItems] = useState<InwardItem[]>([emptyItem(nextItemId++)]);

    const addItem = () => {
        setItems((prev) => [...prev, emptyItem(nextItemId++)]);
    };

    const updateItem = (id: number, patch: Partial<InwardItem>) => {
        setItems((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)));
    };

    const removeItem = (id: number) => {
        setItems((prev) => prev.filter((item) => item.id !== id));
    };

    const totals = useMemo(() => {
        const totalQty = items.reduce((sum, item) => sum + item.qty, DEFAULT_DATA_TYPE_VALUE.ZERO);
        const totalAmount = items.reduce((sum, item) => sum + item.qty * item.unitPrice, DEFAULT_DATA_TYPE_VALUE.ZERO);
        return { totalItems: items.length, totalQty, totalAmount };
    }, [items]);

    const filterFields: FilterField[] = [
        { key: 'search', type: 'search', label: 'Search', placeholder: 'Search by invoice no.' },
    ];

    const filteredInwards = useMemo(() => {
        const term = (filters.search as string)?.toLowerCase() ?? DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING;
        return recentInwards.filter((inward) => {
            return !term || inward.invoiceNo.toLowerCase().includes(term);
        });
    }, [recentInwards, filters]);

    const resetForm = () => {
        setInvoiceNo(DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING);
        setSupplier(DEFAULT_DATA_TYPE_VALUE.NULL);
        setInvoiceDate(new Date());
        setReferenceNo(DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING);
        setTransporter(DEFAULT_DATA_TYPE_VALUE.NULL);
        setNotes(DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING);
        setPaymentStatus('Paid');
        setPaymentMode('Bank Transfer');
        setRemarks(DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING);
        setItems([emptyItem(nextItemId++)]);
    };

    const handleSave = () => {
        const created: RecentInward = {
            id: `MI-${recentInwards.length + 1}`,
            invoiceNo,
            date: (invoiceDate ?? new Date()).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
            amount: totals.totalAmount,
            paymentStatus: paymentStatus === 'Paid' ? 'Paid' : 'Unpaid',
        };
        setRecentInwards((prev) => [created, ...prev]);
        resetForm();
        setDialogVisible(DEFAULT_DATA_TYPE_VALUE.FALSE);
        showToast(toast, 'success', 'Created', 'Material inward created successfully');
    };

    const itemColumns = getMaterialInwardItemColumns(items, categoryMockData, skuMockData, updateItem, removeItem);

    const inwardColumns = getMaterialInwardInwardColumns();

    return (
        <div className="material-inward-page">
            <Toast ref={toast} />

            <FilterBar
                fields={filterFields}
                values={filters}
                onChange={(key, value) => setFilters((prev) => ({ ...prev, [key]: value }))}
                onReset={() => setFilters({ search: DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING })}
                actions={<Button label="Create" icon={<HiOutlinePlus className="mr-2" />} onClick={() => setDialogVisible(DEFAULT_DATA_TYPE_VALUE.TRUE)} size="small" outlined />}
            />

            <DataTable
                value={filteredInwards}
                columns={inwardColumns} />

            <Dialog
                visible={dialogVisible}
                onHide={() => setDialogVisible(DEFAULT_DATA_TYPE_VALUE.FALSE)}
                header="Add Material Inward"
                style={{ width: '960px', maxWidth: '95vw' }}
                footer={
                    <>
                        <Button label="Cancel" outlined onClick={() => setDialogVisible(DEFAULT_DATA_TYPE_VALUE.FALSE)} />
                        <Button label="Save Inward" onClick={handleSave} />
                    </>
                }
            >
                <div className="dialog-form-body">
                    <div className="material-inward-form-grid">
                        <div className="form-field">
                            <label>Invoice / GRN No. *</label>
                            <InputText value={invoiceNo} onChange={(e) => setInvoiceNo(e.target.value)} placeholder="INV-XXXXXX-XXX" />
                        </div>
                        <div className="form-field">
                            <label>Supplier Name *</label>
                            <Dropdown value={supplier} onChange={(e) => setSupplier(e.value)} options={supplierMockData} placeholder="Select supplier" />
                        </div>
                        <div className="form-field">
                            <label>Invoice Date *</label>
                            <Calendar value={invoiceDate} onChange={(e) => setInvoiceDate(e.value as Date)} dateFormat="dd/mm/yy" showIcon />
                        </div>
                        <div className="form-field">
                            <label>Reference No.</label>
                            <InputText value={referenceNo} onChange={(e) => setReferenceNo(e.target.value)} placeholder="PO-XXXXXX-XX" />
                        </div>
                        <div className="form-field">
                            <label>Transporter</label>
                            <Dropdown value={transporter} onChange={(e) => setTransporter(e.value)} options={transporterMockData} placeholder="Select transporter" />
                        </div>
                        <div className="form-field">
                            <label>Received By *</label>
                            <Dropdown value={receivedBy} options={['Admin User', 'Priya Sharma', 'Ravi Kumar']} disabled />
                        </div>
                        <div className="form-field material-inward-form-full">
                            <label>Notes</label>
                            <InputTextarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Enter notes (optional)" />
                        </div>
                    </div>

                    <div className="material-inward-items-header">
                        <h3>Inward Items</h3>
                        <Button label="Add Item" icon={<HiOutlinePlus className="mr-2" />} size="small" onClick={addItem} outlined />
                    </div>
                    <DataTable value={items} columns={itemColumns} paginator={false} sortable={false} filterable={false} dataKey="id" emptyMessage="No items added yet." />

                    <div className="material-inward-summary-grid">
                        <div>
                            <div className="material-inward-summary-label">Total Items</div>
                            <div className="material-inward-summary-value">{totals.totalItems}</div>
                        </div>
                        <div>
                            <div className="material-inward-summary-label">Total Qty</div>
                            <div className="material-inward-summary-value">{totals.totalQty}</div>
                        </div>
                        <div>
                            <div className="material-inward-summary-label">Total Amount</div>
                            <div className="material-inward-summary-value">Rs. {totals.totalAmount.toLocaleString('en-IN')}</div>
                        </div>
                    </div>

                    <div className="material-inward-form-grid material-inward-payment-grid">
                        <div className="form-field">
                            <label>Payment Status</label>
                            <Dropdown value={paymentStatus} onChange={(e) => setPaymentStatus(e.value)} options={['Paid', 'Unpaid', 'Partial']} />
                        </div>
                        <div className="form-field">
                            <label>Payment Mode</label>
                            <Dropdown value={paymentMode} onChange={(e) => setPaymentMode(e.value)} options={['Bank Transfer', 'Cash', 'Cheque', 'UPI']} />
                        </div>
                        <div className="form-field material-inward-form-full">
                            <label>Remarks</label>
                            <InputTextarea value={remarks} onChange={(e) => setRemarks(e.target.value)} rows={2} placeholder="Stock received in good condition." />
                        </div>
                    </div>
                </div>
            </Dialog>
        </div>
    );
};
export default MaterialInward;
