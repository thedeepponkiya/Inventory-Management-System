import { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { InputTextarea } from 'primereact/inputtextarea';
import { InputNumber } from 'primereact/inputnumber';
import { Dropdown } from 'primereact/dropdown';
import { Calendar } from 'primereact/calendar';
import { TabView, TabPanel } from 'primereact/tabview';
import { Dialog } from 'primereact/dialog';
import { Toast } from 'primereact/toast';
import { HiOutlinePlus, HiOutlineArrowLeft } from 'react-icons/hi2';
import DataTable from '../../common/commonComponents/dataTable/DataTable';
import { AppContext } from '../../context/AppContext';
import {
    createPurchaseOrder,
    updatePurchaseOrder,
    type PurchaseOrder as PurchaseOrderType,
    type PurchaseOrderItem,
    type PurchaseOrderPayload,
    type PurchaseOrderStatus,
} from '../../services/purchaseOrderService';
import type { Vendor } from '../../services/vendorService';
import { DEFAULT_DATA_TYPE_VALUE } from '../../common/constants/commonConstant';
import { getPurchaseOrderItemColumns, getActionBodyTemplate, type PurchaseOrderItemRow } from '../../common/commonFunctions/CommonUtilities';
import { showToast } from '../../common/commonFunctions/commonFunction';
import './PurchaseOrderForm.css';

const statusOptions: PurchaseOrderStatus[] = ['Draft', 'Sent', 'Approved', 'Received', 'Cancelled'];
const paymentTermsOptions = ['Net 15', 'Net 30', 'Net 45', 'Net 60', 'Advance', 'COD'];

let nextItemRowId = 1;

interface ItemForm {
    itemName: string;
    orderedQty: number;
    receivedQty: number;
    unitPrice: number;
    discountPercent: number;
    gstPercent: number;
    remarks: string;
}

const emptyItemForm = (): ItemForm => ({
    itemName: DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING,
    orderedQty: DEFAULT_DATA_TYPE_VALUE.ZERO,
    receivedQty: DEFAULT_DATA_TYPE_VALUE.ZERO,
    unitPrice: DEFAULT_DATA_TYPE_VALUE.ZERO,
    discountPercent: DEFAULT_DATA_TYPE_VALUE.ZERO,
    gstPercent: DEFAULT_DATA_TYPE_VALUE.ZERO,
    remarks: DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING,
});

const toIso = (date: Date | null): string | null => (date ? date.toISOString() : DEFAULT_DATA_TYPE_VALUE.NULL);

const PurchaseOrderForm = () => {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const isEditRoute = Boolean(id);
    const { vendors, purchaseOrders, purchaseOrdersLoading, fetchPurchaseOrders } = useContext(AppContext);
    const toast = useRef<Toast>(DEFAULT_DATA_TYPE_VALUE.NULL);

    const existingPo = useMemo(
        () => (isEditRoute ? (purchaseOrders as PurchaseOrderType[]).find((po) => po.id === Number(id)) : DEFAULT_DATA_TYPE_VALUE.UNDEFINED),
        [isEditRoute, purchaseOrders, id],
    );

    const [activeTab, setActiveTab] = useState(DEFAULT_DATA_TYPE_VALUE.ZERO);
    const [loadedForId, setLoadedForId] = useState<number | null>(DEFAULT_DATA_TYPE_VALUE.NULL);
    const [currentPoNo, setCurrentPoNo] = useState(DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING);
    const [vendorId, setVendorId] = useState<number | null>(DEFAULT_DATA_TYPE_VALUE.NULL);
    const [poDate, setPoDate] = useState<Date | null>(new Date());
    const [expectedDeliveryDate, setExpectedDeliveryDate] = useState<Date | null>(DEFAULT_DATA_TYPE_VALUE.NULL);
    const [deliveryAddress, setDeliveryAddress] = useState(DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING);
    const [paymentTerms, setPaymentTerms] = useState<string | null>(DEFAULT_DATA_TYPE_VALUE.NULL);
    const [status, setStatus] = useState<PurchaseOrderStatus>('Draft');
    const [remarks, setRemarks] = useState(DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING);
    const [approvedBy, setApprovedBy] = useState(DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING);
    const [approvedAt, setApprovedAt] = useState<Date | null>(DEFAULT_DATA_TYPE_VALUE.NULL);
    const [freightCharge, setFreightCharge] = useState(DEFAULT_DATA_TYPE_VALUE.ZERO);
    const [otherCharges, setOtherCharges] = useState(DEFAULT_DATA_TYPE_VALUE.ZERO);
    const [items, setItems] = useState<PurchaseOrderItemRow[]>([]);

    const [itemDialogVisible, setItemDialogVisible] = useState(DEFAULT_DATA_TYPE_VALUE.FALSE);
    const [editingItemRowId, setEditingItemRowId] = useState<number | null>(DEFAULT_DATA_TYPE_VALUE.NULL);
    const [itemForm, setItemForm] = useState<ItemForm>(emptyItemForm());

    useEffect(() => {
        if (existingPo && loadedForId !== existingPo.id) {
            // One-time sync of local form state once the async-loaded PO record arrives from
            // AppContext; guarded by loadedForId so it never re-runs for the same record.
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setCurrentPoNo(existingPo.poNo);
            setVendorId(existingPo.vendorId);
            setPoDate(new Date(existingPo.poDate));
            setExpectedDeliveryDate(existingPo.expectedDeliveryDate ? new Date(existingPo.expectedDeliveryDate) : DEFAULT_DATA_TYPE_VALUE.NULL);
            setDeliveryAddress(existingPo.deliveryAddress ?? DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING);
            setPaymentTerms(existingPo.paymentTerms);
            setStatus(existingPo.status);
            setRemarks(existingPo.remarks ?? DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING);
            setApprovedBy(existingPo.approvedBy ?? DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING);
            setApprovedAt(existingPo.approvedAt ? new Date(existingPo.approvedAt) : DEFAULT_DATA_TYPE_VALUE.NULL);
            setFreightCharge(existingPo.freightCharge);
            setOtherCharges(existingPo.otherCharges);
            setItems(existingPo.items.map((item) => ({ ...item, rowId: nextItemRowId++ })));
            setLoadedForId(existingPo.id);
        }
    }, [existingPo, loadedForId]);

    const updateItem = (rowId: number, patch: Partial<PurchaseOrderItemRow>) => {
        setItems((prev) => prev.map((item) => (item.rowId === rowId ? { ...item, ...patch } : item)));
    };

    const removeItem = (rowId: number) => {
        setItems((prev) => prev.filter((item) => item.rowId !== rowId));
    };

    const openAddItemDialog = () => {
        setEditingItemRowId(DEFAULT_DATA_TYPE_VALUE.NULL);
        setItemForm(emptyItemForm());
        setItemDialogVisible(DEFAULT_DATA_TYPE_VALUE.TRUE);
    };

    const openEditItemDialog = (row: PurchaseOrderItemRow) => {
        setEditingItemRowId(row.rowId);
        setItemForm({
            itemName: row.itemName,
            orderedQty: row.orderedQty,
            receivedQty: row.receivedQty,
            unitPrice: row.unitPrice,
            discountPercent: row.discountPercent,
            gstPercent: row.gstPercent,
            remarks: row.remarks,
        });
        setItemDialogVisible(DEFAULT_DATA_TYPE_VALUE.TRUE);
    };

    const handleItemDialogSave = () => {
        if (!itemForm.itemName.trim()) {
            showToast(toast, 'error', 'Error', 'Item name is required');
            return;
        }
        if (itemForm.orderedQty <= 0) {
            showToast(toast, 'error', 'Error', 'Ordered quantity must be greater than 0');
            return;
        }

        const lineGross = itemForm.orderedQty * itemForm.unitPrice;
        const discountAmount = (lineGross * itemForm.discountPercent) / 100;
        const taxable = lineGross - discountAmount;
        const gstAmount = (taxable * itemForm.gstPercent) / 100;
        const computed = {
            itemName: itemForm.itemName,
            skuId: itemForm.itemName,
            skuCode: itemForm.itemName,
            orderedQty: itemForm.orderedQty,
            receivedQty: itemForm.receivedQty,
            pendingQty: itemForm.orderedQty - itemForm.receivedQty,
            unitPrice: itemForm.unitPrice,
            discountPercent: itemForm.discountPercent,
            discountAmount,
            gstPercent: itemForm.gstPercent,
            gstAmount,
            lineTotal: taxable + gstAmount,
            remarks: itemForm.remarks,
        };

        if (editingItemRowId) {
            updateItem(editingItemRowId, computed);
        } else {
            setItems((prev) => [...prev, { rowId: nextItemRowId++, category: DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING, unit: DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING, ...computed }]);
        }
        setItemDialogVisible(DEFAULT_DATA_TYPE_VALUE.FALSE);
    };

    const totals = useMemo(() => {
        let totalQty = DEFAULT_DATA_TYPE_VALUE.ZERO;
        let subTotal = DEFAULT_DATA_TYPE_VALUE.ZERO;
        let discountAmount = DEFAULT_DATA_TYPE_VALUE.ZERO;
        let gstAmount = DEFAULT_DATA_TYPE_VALUE.ZERO;

        items.forEach((item) => {
            const lineGross = item.orderedQty * item.unitPrice;
            const lineDiscount = (lineGross * item.discountPercent) / 100;
            const taxable = lineGross - lineDiscount;
            const lineGst = (taxable * item.gstPercent) / 100;

            totalQty += item.orderedQty;
            subTotal += lineGross;
            discountAmount += lineDiscount;
            gstAmount += lineGst;
        });

        const grandTotal = subTotal - discountAmount + gstAmount + freightCharge + otherCharges;
        return { totalItems: items.length, totalQty, subTotal, discountAmount, gstAmount, grandTotal };
    }, [items, freightCharge, otherCharges]);

    const selectedVendor = useMemo(
        () => (vendors as Vendor[]).find((v) => v.id === vendorId),
        [vendors, vendorId],
    );

    const handleCancel = () => {
        navigate('/purchase-order');
    };

    const handleSave = async () => {
        if (!vendorId || !poDate) {
            showToast(toast, 'error', 'Error', 'Vendor and PO Date are required');
            return;
        }
        if (!items.some((item) => item.itemName)) {
            showToast(toast, 'error', 'Error', 'Add at least one item');
            return;
        }

        const computedItems: PurchaseOrderItem[] = items
            .filter((item) => item.itemName)
            .map((item) => {
                const lineGross = item.orderedQty * item.unitPrice;
                const discountAmount = (lineGross * item.discountPercent) / 100;
                const taxable = lineGross - discountAmount;
                const gstAmount = (taxable * item.gstPercent) / 100;
                return {
                    skuId: item.skuId,
                    skuCode: item.skuCode,
                    itemName: item.itemName,
                    category: item.category,
                    unit: item.unit,
                    orderedQty: item.orderedQty,
                    receivedQty: item.receivedQty,
                    pendingQty: item.orderedQty - item.receivedQty,
                    unitPrice: item.unitPrice,
                    discountPercent: item.discountPercent,
                    discountAmount,
                    gstPercent: item.gstPercent,
                    gstAmount,
                    lineTotal: taxable + gstAmount,
                    remarks: item.remarks,
                };
            });

        const payload: PurchaseOrderPayload = {
            vendorId,
            poDate: toIso(poDate) ?? DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING,
            expectedDeliveryDate: toIso(expectedDeliveryDate),
            deliveryAddress: deliveryAddress || DEFAULT_DATA_TYPE_VALUE.NULL,
            paymentTerms,
            status,
            items: computedItems,
            totalItems: computedItems.length,
            totalQty: totals.totalQty,
            subTotal: totals.subTotal,
            discountAmount: totals.discountAmount,
            gstAmount: totals.gstAmount,
            freightCharge,
            otherCharges,
            grandTotal: totals.grandTotal,
            remarks,
            createdBy: 'Admin User',
            approvedBy: approvedBy || DEFAULT_DATA_TYPE_VALUE.NULL,
            approvedAt: toIso(approvedAt),
        };

        try {
            if (isEditRoute && existingPo) {
                await updatePurchaseOrder(existingPo.id, payload);
                showToast(toast, 'success', 'Updated', 'Purchase order updated successfully');
            } else {
                await createPurchaseOrder(payload);
                showToast(toast, 'success', 'Created', 'Purchase order created successfully');
            }
            fetchPurchaseOrders();
            navigate('/purchase-order');
        } catch (err) {
            showToast(toast, 'error', 'Error', err instanceof Error ? err.message : 'Something went wrong');
        }
    };

    const isApproved = status === 'Approved';

    const itemColumns = getPurchaseOrderItemColumns(items);
    const itemActionTemplate = isApproved
        ? DEFAULT_DATA_TYPE_VALUE.UNDEFINED
        : getActionBodyTemplate<PurchaseOrderItemRow>({ onEdit: openEditItemDialog, onDelete: (row) => removeItem(row.rowId) });

    if (isEditRoute && purchaseOrdersLoading) {
        return <div className="purchase-order-form-page">Loading purchase order…</div>;
    }
    if (isEditRoute && !existingPo) {
        return <div className="purchase-order-form-page">Purchase order not found.</div>;
    }

    return (
        <div className="purchase-order-form-page">
            <Toast ref={toast} />

            <div className="po-form-toolbar">
                <div className="po-form-toolbar-title">
                    <button type="button" className="po-form-back-btn" onClick={handleCancel} aria-label="Back to purchase orders">
                        <HiOutlineArrowLeft size={18} />
                    </button>
                    <h2>{isEditRoute ? `Edit ${currentPoNo}` : 'New Purchase Order'}</h2>
                </div>
                <div className="po-form-toolbar-actions">
                    <Button label="Cancel" outlined onClick={handleCancel} />
                    <Button label={isEditRoute ? 'Save Changes' : 'Save Purchase Order'} onClick={handleSave} />
                </div>
            </div>

            <div className="po-form-layout">
                <div className="po-form-main">
                    <TabView activeIndex={activeTab} onTabChange={(e) => setActiveTab(e.index)}>
                        <TabPanel header="PO Details">
                            <div className="purchase-order-form-grid">
                                <div className="form-field">
                                    <label>PO No.</label>
                                    <InputText value={isEditRoute ? currentPoNo : 'Auto-generated on save'} disabled />
                                </div>
                                <div className="form-field">
                                    <label>Vendor *</label>
                                    <Dropdown
                                        value={vendorId}
                                        onChange={(e) => setVendorId(e.value)}
                                        options={(vendors as Vendor[]).map((v) => ({ label: v.vendorName, value: v.id }))}
                                        placeholder="Select vendor"
                                        disabled={isApproved}
                                    />
                                </div>
                                <div className="form-field">
                                    <label>PO Date *</label>
                                    <Calendar value={poDate} onChange={(e) => setPoDate(e.value as Date)} dateFormat="dd/mm/yy" showIcon disabled={isApproved} />
                                </div>
                                <div className="form-field">
                                    <label>Expected Delivery Date</label>
                                    <Calendar value={expectedDeliveryDate} onChange={(e) => setExpectedDeliveryDate(e.value as Date)} dateFormat="dd/mm/yy" showIcon disabled={isApproved} />
                                </div>
                                <div className="form-field">
                                    <label>Payment Terms</label>
                                    <Dropdown value={paymentTerms} onChange={(e) => setPaymentTerms(e.value)} options={paymentTermsOptions} placeholder="Select payment terms" disabled={isApproved} />
                                </div>
                                <div className="form-field">
                                    <label>Status</label>
                                    <Dropdown
                                        value={status}
                                        onChange={(e) => setStatus(e.value)}
                                        options={statusOptions}
                                        optionDisabled={(option) => status === 'Approved' && (option === 'Draft' || option === 'Sent')}
                                        placeholder="Select status"
                                    />
                                </div>
                                <div className="form-field purchase-order-form-full">
                                    <label>Delivery Address</label>
                                    <InputTextarea value={deliveryAddress} onChange={(e) => setDeliveryAddress(e.target.value)} rows={2} placeholder="Enter delivery address (optional)" disabled={isApproved} />
                                </div>
                                <div className="form-field purchase-order-form-full">
                                    <label>Remarks</label>
                                    <InputTextarea value={remarks} onChange={(e) => setRemarks(e.target.value)} rows={2} placeholder="Enter remarks (optional)" disabled={isApproved} />
                                </div>
                                <div className="form-field">
                                    <label>Approved By</label>
                                    <InputText value={approvedBy} onChange={(e) => setApprovedBy(e.target.value)} placeholder="Enter approver name (optional)" disabled={isApproved} />
                                </div>
                                <div className="form-field">
                                    <label>Approved At</label>
                                    <Calendar value={approvedAt} onChange={(e) => setApprovedAt(e.value as Date)} dateFormat="dd/mm/yy" showIcon showTime disabled={isApproved} />
                                </div>
                            </div>
                        </TabPanel>

                        <TabPanel header="Items & Charges">
                            <div className="purchase-order-items-header">
                                <h3>Order Items</h3>
                                <Button label="Add Item" icon={<HiOutlinePlus className="mr-2" />} size="small" onClick={openAddItemDialog} outlined disabled={isApproved} />
                            </div>
                            <DataTable
                                value={items}
                                columns={itemColumns}
                                actionBodyTemplate={itemActionTemplate}
                                paginator={false}
                                sortable={false}
                                filterable={false}
                                dataKey="rowId"
                                emptyMessage="No items added yet."
                            />

                            <div className="purchase-order-form-grid purchase-order-charges-grid">
                                <div className="form-field">
                                    <label>Freight Charge (Rs.)</label>
                                    <InputNumber value={freightCharge} onValueChange={(e) => setFreightCharge(e.value ?? DEFAULT_DATA_TYPE_VALUE.ZERO)} mode="decimal" minFractionDigits={2} disabled={isApproved} />
                                </div>
                                <div className="form-field">
                                    <label>Other Charges (Rs.)</label>
                                    <InputNumber value={otherCharges} onValueChange={(e) => setOtherCharges(e.value ?? DEFAULT_DATA_TYPE_VALUE.ZERO)} mode="decimal" minFractionDigits={2} disabled={isApproved} />
                                </div>
                            </div>
                        </TabPanel>
                    </TabView>
                </div>

                <div className="po-preview-panel">
                    <div className="po-preview-card">
                        <div className="po-preview-header">
                            <div>
                                <div className="po-preview-title">Purchase Order</div>
                                <div className="po-preview-subtitle">#{isEditRoute ? currentPoNo : 'Auto-generated'}</div>
                            </div>
                            <span className="po-preview-status">{status}</span>
                        </div>

                        <div className="po-preview-section">
                            <div className="po-preview-label">Vendor</div>
                            {selectedVendor ? (
                                <div className="po-preview-vendor">
                                    <div className="po-preview-vendor-name">{selectedVendor.vendorName}</div>
                                    {selectedVendor.email && <div>{selectedVendor.email}</div>}
                                    {selectedVendor.phoneNumber && <div>{selectedVendor.phoneNumber}</div>}
                                    {selectedVendor.address && <div>{selectedVendor.address}{selectedVendor.city ? `, ${selectedVendor.city}` : DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING}</div>}
                                </div>
                            ) : (
                                <div className="po-preview-empty">No vendor selected</div>
                            )}
                        </div>

                        {deliveryAddress && (
                            <div className="po-preview-section">
                                <div className="po-preview-label">Delivery Address</div>
                                <div>{deliveryAddress}</div>
                            </div>
                        )}

                        <div className="po-preview-dates">
                            <div>
                                <div className="po-preview-label">PO Date</div>
                                <div>{poDate ? poDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}</div>
                            </div>
                            <div>
                                <div className="po-preview-label">Expected Delivery</div>
                                <div>{expectedDeliveryDate ? expectedDeliveryDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}</div>
                            </div>
                        </div>

                        <table className="po-preview-items-table">
                            <thead>
                                <tr>
                                    <th>Item</th>
                                    <th>Qty</th>
                                    <th>Rate</th>
                                    <th>Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                {items.filter((item) => item.itemName).length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="po-preview-empty">No items added yet</td>
                                    </tr>
                                ) : (
                                    items.filter((item) => item.itemName).map((item) => (
                                        <tr key={item.rowId}>
                                            <td>{item.itemName}</td>
                                            <td>{item.orderedQty}</td>
                                            <td>Rs. {item.unitPrice.toLocaleString('en-IN')}</td>
                                            <td>Rs. {(item.orderedQty * item.unitPrice).toLocaleString('en-IN')}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>

                        <div className="po-preview-totals">
                            <div><span>Sub Total</span><span>Rs. {totals.subTotal.toLocaleString('en-IN')}</span></div>
                            <div><span>Discount</span><span>- Rs. {totals.discountAmount.toLocaleString('en-IN')}</span></div>
                            <div><span>GST</span><span>+ Rs. {totals.gstAmount.toLocaleString('en-IN')}</span></div>
                            <div><span>Freight</span><span>+ Rs. {freightCharge.toLocaleString('en-IN')}</span></div>
                            <div><span>Other Charges</span><span>+ Rs. {otherCharges.toLocaleString('en-IN')}</span></div>
                            <div className="po-preview-grand-total"><span>Grand Total</span><span>Rs. {totals.grandTotal.toLocaleString('en-IN')}</span></div>
                        </div>

                        {remarks && (
                            <div className="po-preview-remarks">
                                <div className="po-preview-label">Remarks</div>
                                <div>{remarks}</div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <Dialog
                visible={itemDialogVisible}
                onHide={() => setItemDialogVisible(DEFAULT_DATA_TYPE_VALUE.FALSE)}
                header={editingItemRowId ? 'Edit Item' : 'Add Item'}
                style={{ width: '480px' }}
                footer={
                    <>
                        <Button label="Cancel" outlined onClick={() => setItemDialogVisible(DEFAULT_DATA_TYPE_VALUE.FALSE)} />
                        <Button label={editingItemRowId ? 'Save Changes' : 'Add Item'} onClick={handleItemDialogSave} />
                    </>
                }
            >
                <div className="dialog-form-body">
                    <div className="form-field">
                        <label>Item Name *</label>
                        <InputText value={itemForm.itemName} onChange={(e) => setItemForm({ ...itemForm, itemName: e.target.value })} placeholder="Enter item name" />
                    </div>
                    <div className="form-field form-field--row">
                        <label>Ordered Qty *</label>
                        <InputNumber value={itemForm.orderedQty} onValueChange={(e) => setItemForm({ ...itemForm, orderedQty: e.value ?? DEFAULT_DATA_TYPE_VALUE.ZERO })} />
                    </div>
                    <div className="form-field form-field--row">
                        <label>Received Qty</label>
                        <InputNumber value={itemForm.receivedQty} onValueChange={(e) => setItemForm({ ...itemForm, receivedQty: e.value ?? DEFAULT_DATA_TYPE_VALUE.ZERO })} />
                    </div>
                    <div className="form-field form-field--row">
                        <label>Unit Price (Rs.)</label>
                        <InputNumber value={itemForm.unitPrice} onValueChange={(e) => setItemForm({ ...itemForm, unitPrice: e.value ?? DEFAULT_DATA_TYPE_VALUE.ZERO })} mode="decimal" minFractionDigits={2} />
                    </div>
                    <div className="form-field form-field--row">
                        <label>Discount %</label>
                        <InputNumber value={itemForm.discountPercent} onValueChange={(e) => setItemForm({ ...itemForm, discountPercent: e.value ?? DEFAULT_DATA_TYPE_VALUE.ZERO })} suffix="%" />
                    </div>
                    <div className="form-field form-field--row">
                        <label>GST %</label>
                        <InputNumber value={itemForm.gstPercent} onValueChange={(e) => setItemForm({ ...itemForm, gstPercent: e.value ?? DEFAULT_DATA_TYPE_VALUE.ZERO })} suffix="%" />
                    </div>
                    <div className="form-field">
                        <label>Remarks</label>
                        <InputText value={itemForm.remarks} onChange={(e) => setItemForm({ ...itemForm, remarks: e.target.value })} placeholder="Enter remarks (optional)" />
                    </div>
                </div>
            </Dialog>
        </div>
    );
};
export default PurchaseOrderForm;
