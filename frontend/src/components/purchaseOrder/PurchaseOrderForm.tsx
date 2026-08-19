import { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { InputTextarea } from 'primereact/inputtextarea';
import { InputNumber } from 'primereact/inputnumber';
import { AutoComplete, type AutoCompleteProps } from 'primereact/autocomplete';
import { Dropdown } from 'primereact/dropdown';
import { Calendar } from 'primereact/calendar';
import { TabView, TabPanel } from 'primereact/tabview';
import { Dialog } from 'primereact/dialog';
import { Toast } from 'primereact/toast';
import { confirmDialog } from 'primereact/confirmdialog';
import {
    HiOutlinePlus,
    HiOutlineArrowLeft,
    HiOutlineXCircle,
    HiOutlineCheckCircle,
    HiOutlineTag,
    HiOutlineShoppingBag,
    HiOutlineShoppingCart,
    HiOutlineCube,
    HiOutlineCalculator,
    HiOutlineClipboardDocumentList,
    HiOutlineLink,
    HiOutlineLockClosed,
    HiOutlineMapPin,
    HiOutlineDocumentText,
    HiOutlineExclamationTriangle,
    HiOutlineBanknotes,
    HiOutlineTrash,
} from 'react-icons/hi2';
import DataTable from '../../common/commonComponents/dataTable/DataTable';
import StatusBadge, { type StatusVariant } from '../../common/commonComponents/statusBadge/StatusBadge';
import DialogHeader from '../../common/commonComponents/dialogHeader/DialogHeader';
import QuickAddDropdown from '../../common/commonComponents/quickAddDropdown/QuickAddDropdown';
import { AppContext } from '../../context/AppContextDefinition';
import { useDateFormatContext } from '../../context/DateFormatContextDefinition';
import {
    createPurchaseOrder,
    updatePurchaseOrder,
    addPurchaseOrderPayment,
    deletePurchaseOrderPayment,
    type PurchaseOrder as PurchaseOrderType,
    type PurchaseOrderItem,
    type PurchaseOrderPayload,
    type PurchaseOrderStatus,
    type PurchaseOrderPaymentStatus,
    type PurchaseOrderPayment,
} from '../../services/purchaseOrderService';
import type { Vendor } from '../../services/vendorService';
import type { Unit } from '../../services/unitService';
import type { User } from '../../services/userService';
import { DEFAULT_DATA_TYPE_VALUE } from '../../common/constants/commonConstant';
import { getPurchaseOrderItemColumns, getPurchaseOrderPaymentColumns, getActionBodyTemplate, type PurchaseOrderItemRow } from '../../common/commonFunctions/CommonUtilities';
import { showToast } from '../../common/commonFunctions/commonFunction';
import './PurchaseOrderForm.css';

const statusOptions: PurchaseOrderStatus[] = ['Draft', 'Sent', 'Received', 'Cancelled'];
// Must match PAYMENT_METHODS in the backend's purchaseOrderPayment.controller.js exactly -
// that's what actually validates an Add Payment submission server-side.
const paymentMethodOptions = ['Cash', 'Bank Transfer', 'Cheque', 'UPI', 'Card', 'Other'];
const paymentTermsOptions = ['Net 15', 'Net 30', 'Net 45', 'Net 60', 'Advance', 'COD'];
const paymentStatusVariant: Record<PurchaseOrderPaymentStatus, StatusVariant> = {
    Unpaid: 'danger',
    Partial: 'warning',
    Paid: 'success',
};

let nextItemRowId = 1;

interface ItemForm {
    itemName: string;
    orderedQty: number;
    receivedQty: number;
    unit: string;
    unitPrice: number;
    discountPercent: number;
    gstPercent: number;
    remarks: string;
}

const emptyItemForm = (): ItemForm => ({
    itemName: DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING,
    orderedQty: DEFAULT_DATA_TYPE_VALUE.ZERO,
    receivedQty: DEFAULT_DATA_TYPE_VALUE.ZERO,
    unit: DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING,
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
    const { vendors, users, purchaseOrders, purchaseOrdersLoading, fetchPurchaseOrders, units } = useContext(AppContext);
    const { dateFormat } = useDateFormatContext();
    const toast = useRef<Toast>(DEFAULT_DATA_TYPE_VALUE.NULL);

    const existingPo = useMemo(
        () => (isEditRoute ? (purchaseOrders as PurchaseOrderType[]).find((po) => po.id === Number(id)) : DEFAULT_DATA_TYPE_VALUE.UNDEFINED),
        [isEditRoute, purchaseOrders, id],
    );

    // Not local state - paidAmount is entirely server-derived (sum of Transaction History
    // entries, see purchaseOrderPayment.controller.js) and never edited here, so it's read
    // straight off existingPo every render instead of being copied into a useState once. That
    // copy-once approach (via the "one-time sync" effect below) was the actual bug behind
    // Order Summary not updating after Add Payment: fetchPurchaseOrders() refreshes
    // existingPo just fine, but the effect's loadedForId guard (there so a background refetch
    // never clobbers an in-progress *edit*) meant the copied value never got re-synced. Reading
    // it live here instead means there's nothing to go stale.
    const paidAmount = existingPo?.paidAmount ?? DEFAULT_DATA_TYPE_VALUE.ZERO;

    const [activeTab, setActiveTab] = useState(DEFAULT_DATA_TYPE_VALUE.ZERO);
    const [loadedForId, setLoadedForId] = useState<number | null>(DEFAULT_DATA_TYPE_VALUE.NULL);
    const [currentPoNo, setCurrentPoNo] = useState(DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING);
    const [vendorId, setVendorId] = useState<number | null>(DEFAULT_DATA_TYPE_VALUE.NULL);
    const [poDate, setPoDate] = useState<Date | null>(new Date());
    const [expectedDeliveryDate, setExpectedDeliveryDate] = useState<Date | null>(DEFAULT_DATA_TYPE_VALUE.NULL);
    const [shippingDate, setShippingDate] = useState<Date | null>(DEFAULT_DATA_TYPE_VALUE.NULL);
    const [deliveryAddress, setDeliveryAddress] = useState(DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING);
    const [status, setStatus] = useState<PurchaseOrderStatus>('Draft');
    const [remarks, setRemarks] = useState(DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING);
    const [items, setItems] = useState<PurchaseOrderItemRow[]>([]);

    const [itemDialogVisible, setItemDialogVisible] = useState(DEFAULT_DATA_TYPE_VALUE.FALSE);
    const [editingItemRowId, setEditingItemRowId] = useState<number | null>(DEFAULT_DATA_TYPE_VALUE.NULL);
    const [itemForm, setItemForm] = useState<ItemForm>(emptyItemForm());

    // Add Payment dialog (Transaction History tab) - each submission becomes its own row in
    // ims_purchase_order_payments rather than editing a single "Paid Amount" number.
    const [paymentDialogVisible, setPaymentDialogVisible] = useState(DEFAULT_DATA_TYPE_VALUE.FALSE);
    const [paymentAmount, setPaymentAmount] = useState(DEFAULT_DATA_TYPE_VALUE.ZERO);
    const [paymentDate, setPaymentDate] = useState<Date | null>(new Date());
    const [paymentMethod, setPaymentMethod] = useState<string | null>(DEFAULT_DATA_TYPE_VALUE.NULL);
    const [paymentRemarks, setPaymentRemarks] = useState(DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING);
    const [paymentSaving, setPaymentSaving] = useState(DEFAULT_DATA_TYPE_VALUE.FALSE);
    // Per-transaction terms/approval - lives on the payment itself (not the PO, which has no
    // such fields of its own anymore) since a given payment can be approved separately.
    const [paymentPaymentTerms, setPaymentPaymentTerms] = useState<string | null>(DEFAULT_DATA_TYPE_VALUE.NULL);
    const [paymentApprovedBy, setPaymentApprovedBy] = useState(DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING);
    const [paymentApprovedBySuggestions, setPaymentApprovedBySuggestions] = useState<User[]>([]);
    const [paymentApprovedAt, setPaymentApprovedAt] = useState<Date | null>(DEFAULT_DATA_TYPE_VALUE.NULL);

    useEffect(() => {
        if (existingPo && loadedForId !== existingPo.id) {
            // One-time sync of local form state once the async-loaded PO record arrives from
            // AppContext; guarded by loadedForId so it never re-runs for the same record.
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setCurrentPoNo(existingPo.poNo);
            setVendorId(existingPo.vendorId);
            setPoDate(new Date(existingPo.poDate));
            setExpectedDeliveryDate(existingPo.expectedDeliveryDate ? new Date(existingPo.expectedDeliveryDate) : DEFAULT_DATA_TYPE_VALUE.NULL);
            setShippingDate(existingPo.shippingDate ? new Date(existingPo.shippingDate) : DEFAULT_DATA_TYPE_VALUE.NULL);
            setDeliveryAddress(existingPo.deliveryAddress ?? DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING);
            setStatus(existingPo.status);
            setRemarks(existingPo.remarks ?? DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING);
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
            unit: row.unit,
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
            unit: itemForm.unit,
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
            setItems((prev) => [...prev, { rowId: nextItemRowId++, category: DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING, ...computed }]);
        }
        setItemDialogVisible(DEFAULT_DATA_TYPE_VALUE.FALSE);
    };

    const itemFormTotals = useMemo(() => {
        const itemSubTotal = itemForm.orderedQty * itemForm.unitPrice;
        const itemDiscountAmount = (itemSubTotal * itemForm.discountPercent) / 100;
        const itemTaxable = itemSubTotal - itemDiscountAmount;
        const itemGstAmount = (itemTaxable * itemForm.gstPercent) / 100;
        return { subTotal: itemSubTotal, discountAmount: itemDiscountAmount, gstAmount: itemGstAmount, grandTotal: itemTaxable + itemGstAmount };
    }, [itemForm.orderedQty, itemForm.unitPrice, itemForm.discountPercent, itemForm.gstPercent]);

    const formatRupees = (value: number) => `Rs. ${value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

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

        const grandTotal = subTotal - discountAmount + gstAmount;
        return { totalItems: items.length, totalQty, subTotal, discountAmount, gstAmount, grandTotal };
    }, [items]);

    // Payment Status is derived from Paid Amount vs. Grand Total rather than picked by hand -
    // 0 paid is Unpaid, paid at/above the grand total is Paid, anything in between is Partial.
    // Mirrors derivePaymentStatus in the backend's orderTotals.js, which recomputes the same
    // thing authoritatively on save regardless of what this (or any direct API call) sends.
    const paymentStatus: PurchaseOrderPaymentStatus = useMemo(() => {
        if (paidAmount <= 0) return 'Unpaid';
        if (totals.grandTotal <= 0) return 'Paid';
        if (paidAmount >= totals.grandTotal) return 'Paid';
        return 'Partial';
    }, [paidAmount, totals.grandTotal]);

    // Same progress-bar math as SalesOrderForm.tsx's balanceDue/paidPercent.
    const balanceDue = Math.max(totals.grandTotal - paidAmount, DEFAULT_DATA_TYPE_VALUE.ZERO);
    const paidPercent = totals.grandTotal > 0 ? Math.min(100, Math.max(0, (paidAmount / totals.grandTotal) * 100)) : DEFAULT_DATA_TYPE_VALUE.ZERO;

    const selectedVendor = useMemo(
        () => (vendors as Vendor[]).find((v) => v.id === vendorId),
        [vendors, vendorId],
    );

    const openPaymentDialog = () => {
        setPaymentAmount(DEFAULT_DATA_TYPE_VALUE.ZERO);
        setPaymentDate(new Date());
        setPaymentMethod(DEFAULT_DATA_TYPE_VALUE.NULL);
        setPaymentRemarks(DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING);
        setPaymentPaymentTerms(DEFAULT_DATA_TYPE_VALUE.NULL);
        setPaymentApprovedBy(DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING);
        setPaymentApprovedBySuggestions([]);
        setPaymentApprovedAt(DEFAULT_DATA_TYPE_VALUE.NULL);
        setPaymentDialogVisible(DEFAULT_DATA_TYPE_VALUE.TRUE);
    };

    // Suggests names from User Management (Active users, matched by name/email) as you type,
    // or via the dropdown button - but still accepts free text, since Approved By has no FK to
    // Users in the schema (an approver may not be a system user at all).
    const searchPaymentApprovedByUsers = (e: Parameters<NonNullable<AutoCompleteProps<User>['completeMethod']>>[0]) => {
        const query = e.query.trim().toLowerCase();
        const activeUsers = (users as User[]).filter((u) => u.status === 'Active');
        setPaymentApprovedBySuggestions(
            query ? activeUsers.filter((u) => u.fullName.toLowerCase().includes(query) || u.email.toLowerCase().includes(query)) : activeUsers,
        );
    };

    // PrimeReact's typings say onChange's value is always the suggestion type (User) once a
    // generic is supplied, but at runtime it's the *typed string* whenever nothing was picked
    // from the dropdown (no forceSelection here, so free text stays allowed) - a real runtime
    // union the static types don't capture, hence the cast.
    const handlePaymentApprovedByChange = (e: Parameters<NonNullable<AutoCompleteProps<User>['onChange']>>[0]) => {
        const value = e.value as unknown as string | User;
        setPaymentApprovedBy(typeof value === 'string' ? value : value.fullName);
    };

    // Records one Transaction History entry against the already-saved PO - the backend
    // recomputes paidAmount/paymentStatus from the full payments table itself (see
    // purchaseOrderPayment.controller.js), so this just triggers a refetch afterwards rather
    // than locally patching paidAmount, keeping one source of truth.
    const handleAddPayment = async () => {
        if (!existingPo) return;
        if (paymentAmount <= 0) {
            showToast(toast, 'error', 'Error', 'Amount must be greater than 0');
            return;
        }
        if (!paymentDate) {
            showToast(toast, 'error', 'Error', 'Payment date is required');
            return;
        }
        setPaymentSaving(DEFAULT_DATA_TYPE_VALUE.TRUE);
        try {
            await addPurchaseOrderPayment(existingPo.id, {
                amount: paymentAmount,
                paymentDate: toIso(paymentDate) ?? DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING,
                paymentMethod,
                remarks: paymentRemarks || DEFAULT_DATA_TYPE_VALUE.NULL,
                paymentTerms: paymentPaymentTerms,
                approvedBy: paymentApprovedBy || DEFAULT_DATA_TYPE_VALUE.NULL,
                approvedAt: toIso(paymentApprovedAt),
            });
            showToast(toast, 'success', 'Payment Recorded', 'Payment recorded successfully');
            fetchPurchaseOrders();
            setPaymentDialogVisible(DEFAULT_DATA_TYPE_VALUE.FALSE);
        } catch (err) {
            showToast(toast, 'error', 'Error', err instanceof Error ? err.message : 'Something went wrong');
        } finally {
            setPaymentSaving(DEFAULT_DATA_TYPE_VALUE.FALSE);
        }
    };

    const handleDeletePayment = (payment: PurchaseOrderPayment) => {
        if (!existingPo) return;
        confirmDialog({
            message: 'Are you sure you want to delete this payment entry? This cannot be undone.',
            header: 'Delete Payment',
            icon: 'pi pi-exclamation-triangle',
            acceptClassName: 'p-button-danger',
            accept: async () => {
                try {
                    await deletePurchaseOrderPayment(existingPo.id, payment.id);
                    showToast(toast, 'success', 'Deleted', 'Payment entry deleted successfully');
                    fetchPurchaseOrders();
                } catch (err) {
                    showToast(toast, 'error', 'Error', err instanceof Error ? err.message : 'Something went wrong');
                }
            },
        });
    };

    const handleCancel = () => {
        navigate('/purchase-order');
    };

    const handleCancelOrder = () => {
        if (!existingPo) return;
        confirmDialog({
            message: 'Are you sure you want to cancel this order?',
            header: 'Cancel Purchase Order',
            icon: 'pi pi-exclamation-triangle',
            acceptClassName: 'p-button-danger',
            accept: async () => {
                try {
                    await updatePurchaseOrder(existingPo.id, { status: 'Cancelled' });
                    showToast(toast, 'success', 'Cancelled', 'Purchase order cancelled successfully');
                    fetchPurchaseOrders();
                    navigate('/purchase-order');
                } catch (err) {
                    showToast(toast, 'error', 'Error', err instanceof Error ? err.message : 'Something went wrong');
                }
            },
        });
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
            poNo: isEditRoute ? DEFAULT_DATA_TYPE_VALUE.UNDEFINED : (currentPoNo.trim() || DEFAULT_DATA_TYPE_VALUE.UNDEFINED),
            vendorId,
            poDate: toIso(poDate) ?? DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING,
            expectedDeliveryDate: toIso(expectedDeliveryDate),
            shippingDate: toIso(shippingDate),
            deliveryAddress: deliveryAddress || DEFAULT_DATA_TYPE_VALUE.NULL,
            status,
            paymentStatus,
            paidAmount,
            items: computedItems,
            totalItems: computedItems.length,
            totalQty: totals.totalQty,
            subTotal: totals.subTotal,
            discountAmount: totals.discountAmount,
            gstAmount: totals.gstAmount,
            grandTotal: totals.grandTotal,
            remarks,
            createdBy: 'Admin User',
        };

        try {
            if (isEditRoute && existingPo) {
                // Once locked, the Items table is already read-only in this form - explicitly
                // omitting items here (rather than resending the unchanged array) lets the
                // backend simply reject any update that DOES include items while non-Draft,
                // closing off a direct-API bypass of the read-only UI (mirrors SalesOrderForm's
                // identical isLocked handling).
                const updatePayload = isLocked ? { ...payload, items: DEFAULT_DATA_TYPE_VALUE.UNDEFINED } : payload;
                await updatePurchaseOrder(existingPo.id, updatePayload);
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

    // Locking reflects the PO's *persisted* status, not the live (possibly still-being-edited,
    // not-yet-saved) Status dropdown value - so picking "Sent" while still filling out a form
    // doesn't instantly freeze the rest of it before you've had a chance to save. A brand-new
    // PO is therefore never locked; an existing one locks only once it was already saved as
    // non-Draft (i.e. the next time you open it, after that save went through).
    const isLocked = isEditRoute && existingPo?.status !== 'Draft';

    // A brand-new PO can only start as Draft or Sent - Received/Cancelled only make sense
    // once a PO already exists and has been through its lifecycle, so they're hidden here
    // (the edit form still offers all four, since an existing PO may already be in either).
    const statusOptionsForForm = isEditRoute ? statusOptions : statusOptions.filter((option) => option !== 'Received' && option !== 'Cancelled');

    const itemColumns = getPurchaseOrderItemColumns(items, isLocked ? DEFAULT_DATA_TYPE_VALUE.UNDEFINED : openEditItemDialog);
    const itemActionTemplate = isLocked
        ? DEFAULT_DATA_TYPE_VALUE.UNDEFINED
        : getActionBodyTemplate<PurchaseOrderItemRow>({ onDelete: (row) => removeItem(row.rowId) });

    // Transaction History table - deleting a payment is always available regardless of
    // isLocked, since recording payment is a financial action independent of the
    // Draft-only Items lock (see the Add Payment button's own disabled condition below).
    // Written by hand (mirroring getActionBodyTemplate's own onDelete rendering) instead of
    // going through that helper - handleDeletePayment closes over the `toast` ref, and
    // react-hooks/refs flags a ref-closing function being passed as a plain argument into a
    // function call during render (even though getActionBodyTemplate only ever invokes it
    // later, from inside a real onClick). Assigning the render function directly here, so
    // the ref is only ever touched from within an actual onClick handler, sidesteps that.
    const paymentColumns = getPurchaseOrderPaymentColumns(dateFormat, users);
    const paymentActionTemplate = (payment: PurchaseOrderPayment) => (
        <div className="data-table-actions">
            <HiOutlineTrash size={16} color="#dc2626" onClick={() => handleDeletePayment(payment)} />
        </div>
    );

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
                    {isEditRoute && existingPo?.status === 'Sent' && (
                        <Button label="Cancel Order" icon={<HiOutlineXCircle className="mr-2" />} severity="danger" outlined onClick={handleCancelOrder} />
                    )}
                    <Button label="Cancel" outlined onClick={handleCancel} />
                    <Button label="Save" icon={<HiOutlineCheckCircle className="mr-2" />} onClick={handleSave} />
                </div>
            </div>

            <div className="po-form-layout">
                <div className="po-form-main">
                    <div className="po-card po-card--tabs">
                        <TabView activeIndex={activeTab} onTabChange={(e) => setActiveTab(e.index)}>
                            <TabPanel header={<span className="po-tab-label"><HiOutlineClipboardDocumentList size={15} />PO Details</span>}>
                                <div className="po-section">
                                    <div className="po-section-title">Order Details</div>
                                    <div className="purchase-order-form-grid">
                                        <div className="form-field">
                                            <label>PO No.</label>
                                            <div className="po-input-icon-wrapper">
                                                <InputText
                                                    className="po-input po-input--icon-right"
                                                    value={isEditRoute ? `#${currentPoNo}` : currentPoNo}
                                                    onChange={(e) => setCurrentPoNo(e.target.value)}
                                                    placeholder="#PO-XXXXXX (auto if left blank)"
                                                    disabled={isEditRoute}
                                                />
                                                {isEditRoute && <HiOutlineLockClosed size={14} className="po-input-icon-right" />}
                                            </div>
                                        </div>
                                        <div className="form-field">
                                            <label>Vendor <span className="po-item-required">*</span></label>
                                            <QuickAddDropdown
                                                quickAddType="vendor"
                                                value={vendorId}
                                                onChange={(e) => setVendorId(e.value)}
                                                options={(vendors as Vendor[]).map((v) => ({ label: v.vendorName, value: v.id }))}
                                                placeholder="Select vendor"
                                                disabled={isLocked}
                                            />
                                        </div>
                                        <div className="form-field">
                                            <label>PO Date <span className="po-item-required">*</span></label>
                                            <Calendar value={poDate} onChange={(e) => setPoDate(e.value as Date)} dateFormat="dd/mm/yy" showIcon disabled={isLocked} />
                                        </div>
                                        <div className="form-field">
                                            <label>Expected Delivery Date</label>
                                            <Calendar value={expectedDeliveryDate} onChange={(e) => setExpectedDeliveryDate(e.value as Date)} dateFormat="dd/mm/yy" showIcon disabled={isLocked} />
                                        </div>
                                        <div className="form-field">
                                            <label>Status</label>
                                            <Dropdown
                                                value={status}
                                                onChange={(e) => setStatus(e.value)}
                                                options={statusOptionsForForm}
                                                placeholder="Select status"
                                                disabled={isLocked}
                                            />
                                        </div>
                                    </div>
                                </div>


                                <div className="po-section po-section--last">
                                    <div className="po-section-title">Delivery And Notes</div>
                                    <div className="purchase-order-form-grid">
                                        <div className="form-field">
                                            <label>Shipping Date</label>
                                            <Calendar value={shippingDate} onChange={(e) => setShippingDate(e.value as Date)} dateFormat="dd/mm/yy" showIcon disabled={isLocked} />
                                        </div>
                                        <div className="purchase-order-form-half-row">
                                            <div className="form-field">
                                                <label>Delivery Address</label>
                                                <div className="po-input-icon-wrapper">
                                                    <InputTextarea className="po-input" value={deliveryAddress} onChange={(e) => setDeliveryAddress(e.target.value)} rows={3} placeholder="Enter delivery address (optional)" disabled={isLocked} />
                                                    <HiOutlineMapPin size={15} className="po-textarea-icon" />
                                                </div>
                                            </div>
                                            <div className="form-field">
                                                <label>Remarks</label>
                                                <div className="po-input-icon-wrapper">
                                                    <InputTextarea className="po-input" value={remarks} onChange={(e) => setRemarks(e.target.value)} rows={3} placeholder="Enter remarks (optional)" disabled={isLocked} />
                                                    <HiOutlineDocumentText size={15} className="po-textarea-icon" />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </TabPanel>

                            <TabPanel header={<span className="po-tab-label"><HiOutlineShoppingBag size={15} />Items & Charges</span>}>
                                <div className="purchase-order-items-header">
                                    <h3>Order Items</h3>
                                    <Button label="Add Item" icon={<HiOutlinePlus className="mr-2" />} size="small" onClick={openAddItemDialog} outlined disabled={isLocked} />
                                </div>
                                <DataTable
                                    value={items}
                                    columns={itemColumns}
                                    actionBodyTemplate={itemActionTemplate}
                                    rows={5}
                                    sortable={false}
                                    filterable={false}
                                    dataKey="rowId"
                                    emptyMessage="No items added yet."
                                />
                            </TabPanel>

                            <TabPanel header={<span className="po-tab-label"><HiOutlineBanknotes size={15} />Transaction History</span>}>
                                <div className="purchase-order-items-header">
                                    <h3>Payment Transactions</h3>
                                    {/* Available regardless of isLocked - collecting payment is independent of the
                                        Draft-only Items lock. Disabled once the balance is fully cleared instead. */}
                                    <Button
                                        label="Add Payment"
                                        icon={<HiOutlinePlus className="mr-2" />}
                                        size="small"
                                        onClick={openPaymentDialog}
                                        outlined
                                        disabled={!existingPo || balanceDue <= 0}
                                    />
                                </div>
                                {!existingPo ? (
                                    <div className="po-preview-items-empty">
                                        <div className="po-preview-items-empty-icon">
                                            <HiOutlineBanknotes size={22} />
                                        </div>
                                        <div className="po-preview-items-empty-title">Save the Purchase Order first</div>
                                        <div className="po-preview-items-empty-sub">Payments can only be recorded once the order has been saved.</div>
                                    </div>
                                ) : (
                                    <DataTable
                                        value={existingPo.payments}
                                        columns={paymentColumns}
                                        actionBodyTemplate={paymentActionTemplate}
                                        rows={5}
                                        sortable={false}
                                        filterable={false}
                                        dataKey="id"
                                        emptyMessage="No payments recorded yet."
                                    />
                                )}
                            </TabPanel>
                        </TabView>
                    </div>
                </div>

                <div className="po-preview-panel">
                    <div className="po-preview-card">
                        <div className="po-card-header po-preview-header">
                            <div className="po-card-header-icon">
                                <HiOutlineLink size={20} />
                            </div>
                            <div className="po-preview-header-text">
                                <h3>Order Summary</h3>
                            </div>
                            <span className={`po-preview-status po-preview-status--${status.toLowerCase()}`}>{status}</span>
                        </div>

                        <div className="po-preview-po-no">
                            <span className="po-preview-label">PO No.</span>
                            <span className="po-preview-badge">{isEditRoute ? `#${currentPoNo}` : '#PO-XXXXXX'}</span>
                        </div>

                        <div className="po-preview-mini-grid">
                            <div>
                                <div className="po-preview-label">Vendor</div>
                                <div>{selectedVendor?.vendorName || '—'}</div>
                            </div>
                        </div>

                        <div className="po-preview-divider" />

                        <div className="po-preview-label">Item Summary</div>
                        {items.filter((item) => item.itemName).length === 0 ? (
                            <div className="po-preview-items-empty">
                                <div className="po-preview-items-empty-icon">
                                    <HiOutlineShoppingCart size={22} />
                                </div>
                                <div className="po-preview-items-empty-title">No items added yet</div>
                                <div className="po-preview-items-empty-sub">Add items to see the summary</div>
                            </div>
                        ) : (
                            // Scrolls internally once past 5 rows, instead of pushing Totals/
                            // Payment Status further and further down the panel as items grow.
                            <div className="po-preview-items-scroll">
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
                                        {items.filter((item) => item.itemName).map((item) => (
                                            <tr key={item.rowId}>
                                                <td>{item.itemName}</td>
                                                <td>{item.orderedQty}</td>
                                                <td>Rs. {item.unitPrice.toLocaleString('en-IN')}</td>
                                                <td>Rs. {(item.orderedQty * item.unitPrice).toLocaleString('en-IN')}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        <div className="po-preview-divider" />

                        <div className="po-preview-totals">
                            <div><span>Sub Total</span><span>Rs. {totals.subTotal.toLocaleString('en-IN')}</span></div>
                            <div><span>Discount</span><span className="po-discount-value">- Rs. {totals.discountAmount.toLocaleString('en-IN')}</span></div>
                            <div><span>GST</span><span>Rs. {totals.gstAmount.toLocaleString('en-IN')}</span></div>
                        </div>

                        <div className="po-preview-grand-total"><span>Grand Total</span><span>Rs. {totals.grandTotal.toLocaleString('en-IN')}</span></div>

                        <div className="po-preview-divider" />
                        <div className="po-payment-progress">
                            <div className="po-payment-progress-row">
                                <span>Payment Status</span>
                                <StatusBadge label={paymentStatus} variant={paymentStatusVariant[paymentStatus]} />
                            </div>
                            <div className="po-payment-progress-row">
                                <span>Paid</span>
                                <span>{formatRupees(paidAmount)}</span>
                            </div>
                            <div className="po-payment-progress-track">
                                <div className="po-payment-progress-fill" style={{ width: `${paidPercent}%` }} />
                            </div>
                            <div className="po-payment-progress-row po-payment-progress-balance">
                                <span>Balance due</span>
                                <span className={balanceDue > 0 ? 'po-payment-balance-due' : 'po-payment-balance-clear'}>{formatRupees(balanceDue)}</span>
                            </div>
                        </div>
                        {balanceDue > 0 && (
                            <div className="po-preview-warning-banner">
                                <HiOutlineExclamationTriangle size={16} />
                                <span>Balance due of {formatRupees(balanceDue)} remains outstanding - collect payment before marking this order Received.</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <Dialog
                visible={itemDialogVisible}
                onHide={() => setItemDialogVisible(DEFAULT_DATA_TYPE_VALUE.FALSE)}
                header={<DialogHeader icon={HiOutlineShoppingBag} title={editingItemRowId ? 'Edit Item' : 'Add Item'} />}
                style={{ width: '540px', maxWidth: '95vw' }}
                className="po-item-dialog"
                footer={
                    <>
                        <Button label="Cancel" outlined onClick={() => setItemDialogVisible(DEFAULT_DATA_TYPE_VALUE.FALSE)} />
                        <Button
                            label={editingItemRowId ? 'Save' : 'Add Item'}
                            icon={editingItemRowId ? <HiOutlineCheckCircle className="mr-2" /> : <HiOutlinePlus className="mr-2" />}
                            onClick={handleItemDialogSave}
                        />
                    </>
                }
            >
                <div className="po-item-form-body">
                    <div className="po-item-field">
                        <label>Item Name <span className="po-item-required">*</span></label>
                        <div className="po-item-input-icon-wrapper">
                            <HiOutlineTag className="po-item-input-icon" />
                            <InputText
                                className="po-item-input po-item-input--icon"
                                value={itemForm.itemName}
                                onChange={(e) => setItemForm({ ...itemForm, itemName: e.target.value })}
                                placeholder="Enter item name"
                            />
                        </div>
                    </div>

                    <div className="po-item-form-grid">
                        <div className="po-item-field">
                            <label>Unit <span className="po-item-required">*</span></label>
                            <div className="po-item-input-icon-wrapper">
                                <HiOutlineCube className="po-item-input-icon" />
                                <QuickAddDropdown
                                    quickAddType="unit"
                                    className="po-item-input po-item-input--icon"
                                    value={itemForm.unit}
                                    onChange={(e) => setItemForm({ ...itemForm, unit: e.value })}
                                    options={(units as Unit[]).map((u) => u.unit)}
                                    placeholder="Select unit"
                                />
                            </div>
                        </div>
                        <div className="po-item-field">
                            <label>Unit Price (Rs.) <span className="po-item-required">*</span></label>
                            <div className="po-item-input-icon-wrapper">
                                <span className="po-item-input-icon po-item-input-icon--text">₹</span>
                                <InputNumber
                                    className="po-item-input po-item-input--icon"
                                    value={itemForm.unitPrice}
                                    onValueChange={(e) => setItemForm({ ...itemForm, unitPrice: e.value ?? DEFAULT_DATA_TYPE_VALUE.ZERO })}
                                    mode="decimal"
                                    minFractionDigits={2}
                                />
                            </div>
                        </div>
                        <div className="po-item-field">
                            <label>Ordered Quantity <span className="po-item-required">*</span></label>
                            <div className="po-item-input-icon-wrapper">
                                <HiOutlineShoppingBag className="po-item-input-icon" />
                                <InputNumber
                                    className="po-item-input po-item-input--icon"
                                    value={itemForm.orderedQty}
                                    onValueChange={(e) => setItemForm({ ...itemForm, orderedQty: e.value ?? DEFAULT_DATA_TYPE_VALUE.ZERO })}
                                />
                            </div>
                        </div>
                        <div className="po-item-field">
                            <label>Discount (%)</label>
                            <div className="po-item-input-icon-wrapper">
                                <span className="po-item-input-icon po-item-input-icon--text">%</span>
                                <InputNumber
                                    className="po-item-input po-item-input--icon"
                                    value={itemForm.discountPercent}
                                    onValueChange={(e) => setItemForm({ ...itemForm, discountPercent: e.value ?? DEFAULT_DATA_TYPE_VALUE.ZERO })}
                                    suffix="%"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="po-item-field">
                        <label>GST (%)</label>
                        <InputNumber
                            className="po-item-input"
                            value={itemForm.gstPercent}
                            onValueChange={(e) => setItemForm({ ...itemForm, gstPercent: e.value ?? DEFAULT_DATA_TYPE_VALUE.ZERO })}
                            suffix="%"
                        />
                    </div>

                    <div className="po-item-summary">
                        <div className="po-item-summary-icon">
                            <HiOutlineCalculator size={14} />
                        </div>
                        <div className="po-item-summary-body">
                            <span className="po-item-summary-title">Amount Summary</span>
                            <div className="po-item-summary-row">
                                <div className="po-item-summary-cell">
                                    <span className="po-item-summary-label">Sub Total</span>
                                    <span className="po-item-summary-value">{formatRupees(itemFormTotals.subTotal)}</span>
                                </div>
                                <span className="po-item-summary-operator">-</span>
                                <div className="po-item-summary-cell">
                                    <span className="po-item-summary-label">Discount</span>
                                    <span className="po-item-summary-value">{formatRupees(itemFormTotals.discountAmount)}</span>
                                </div>
                                <span className="po-item-summary-operator">+</span>
                                <div className="po-item-summary-cell">
                                    <span className="po-item-summary-label">GST</span>
                                    <span className="po-item-summary-value">{formatRupees(itemFormTotals.gstAmount)}</span>
                                </div>
                                <span className="po-item-summary-operator">=</span>
                                <div className="po-item-summary-cell">
                                    <span className="po-item-summary-label">Total Amount</span>
                                    <span className="po-item-summary-value po-item-summary-total">{formatRupees(itemFormTotals.grandTotal)}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="po-item-field">
                        <label>Remarks (Optional)</label>
                        <InputTextarea
                            className="po-item-input"
                            value={itemForm.remarks}
                            onChange={(e) => setItemForm({ ...itemForm, remarks: e.target.value })}
                            placeholder="Enter remarks (optional)"
                            rows={3}
                        />
                    </div>
                </div>
            </Dialog>

            <Dialog
                visible={paymentDialogVisible}
                onHide={() => setPaymentDialogVisible(DEFAULT_DATA_TYPE_VALUE.FALSE)}
                header={<DialogHeader icon={HiOutlineBanknotes} title="Add Payment" />}
                style={{ width: '480px', maxWidth: '95vw' }}
                className="po-item-dialog"
                footer={
                    <>
                        <Button label="Cancel" outlined onClick={() => setPaymentDialogVisible(DEFAULT_DATA_TYPE_VALUE.FALSE)} disabled={paymentSaving} />
                        <Button label="Add Payment" icon={<HiOutlinePlus className="mr-2" />} onClick={handleAddPayment} loading={paymentSaving} />
                    </>
                }
            >
                <div className="po-item-form-body">
                    <div className="po-item-form-grid">
                        <div className="po-item-field">
                            <label>Amount (Rs.) <span className="po-item-required">*</span></label>
                            <div className="po-item-input-icon-wrapper">
                                <span className="po-item-input-icon po-item-input-icon--text">₹</span>
                                <InputNumber
                                    className="po-item-input po-item-input--icon"
                                    value={paymentAmount}
                                    onValueChange={(e) => setPaymentAmount(e.value ?? DEFAULT_DATA_TYPE_VALUE.ZERO)}
                                    mode="decimal"
                                    minFractionDigits={2}
                                    max={balanceDue}
                                />
                            </div>
                            <span className="po-payment-balance-hint">Balance due: {formatRupees(balanceDue)}</span>
                        </div>
                        <div className="po-item-field">
                            <label>Payment Date <span className="po-item-required">*</span></label>
                            <Calendar value={paymentDate} onChange={(e) => setPaymentDate(e.value as Date)} dateFormat="dd/mm/yy" showIcon />
                        </div>
                    </div>

                    <div className="po-item-form-grid">
                        <div className="po-item-field">
                            <label>Payment Method</label>
                            <Dropdown value={paymentMethod} onChange={(e) => setPaymentMethod(e.value)} options={paymentMethodOptions} placeholder="Select method (optional)" />
                        </div>
                        <div className="po-item-field">
                            <label>Payment Terms</label>
                            <Dropdown value={paymentPaymentTerms} onChange={(e) => setPaymentPaymentTerms(e.value)} options={paymentTermsOptions} placeholder="Select terms (optional)" />
                        </div>
                    </div>

                    <div className="po-item-form-grid">
                        <div className="po-item-field">
                            <label>Approved By</label>
                            <AutoComplete
                                value={paymentApprovedBy}
                                suggestions={paymentApprovedBySuggestions}
                                completeMethod={searchPaymentApprovedByUsers}
                                field="fullName"
                                onChange={handlePaymentApprovedByChange}
                                placeholder="Enter approver name (optional)"
                                dropdown
                                panelClassName="po-approved-by-panel"
                            />
                        </div>
                        <div className="po-item-field">
                            <label>Approved At</label>
                            <Calendar value={paymentApprovedAt} onChange={(e) => setPaymentApprovedAt(e.value as Date)} dateFormat="dd/mm/yy" showIcon showTime />
                        </div>
                    </div>

                    <div className="po-item-field">
                        <label>Remarks (Optional)</label>
                        <InputTextarea
                            className="po-item-input"
                            value={paymentRemarks}
                            onChange={(e) => setPaymentRemarks(e.target.value)}
                            placeholder="Enter remarks (optional)"
                            rows={3}
                        />
                    </div>
                </div>
            </Dialog>
        </div>
    );
};
export default PurchaseOrderForm;
