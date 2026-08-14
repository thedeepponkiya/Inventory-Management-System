import { useContext, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
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
    HiOutlineArrowUturnLeft,
    HiOutlineTruck,
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
import DataTable, { type ColumnConfig } from '../../common/commonComponents/dataTable/DataTable';
import StatusBadge, { type StatusVariant } from '../../common/commonComponents/statusBadge/StatusBadge';
import { AppContext } from '../../context/AppContextDefinition';
import { useDateFormatContext } from '../../context/DateFormatContextDefinition';
import {
    createSalesOrder,
    updateSalesOrder,
    confirmSalesOrder,
    startProcessingSalesOrder,
    dispatchSalesOrder,
    revertDispatchSalesOrder,
    cancelSalesOrder,
    addSalesOrderPayment,
    deleteSalesOrderPayment,
    type SalesOrder as SalesOrderType,
    type SalesOrderItem,
    type SalesOrderPayload,
    type SalesOrderPaymentStatus,
    type SalesOrderPayment,
} from '../../services/salesOrderService';
import type { InventoryItem } from '../../services/inventoryService';
import type { Customer } from '../../services/customerService';
import type { User } from '../../services/userService';
import { DEFAULT_DATA_TYPE_VALUE } from '../../common/constants/commonConstant';
import { getSalesOrderItemColumns, getSalesOrderPaymentColumns, getActionBodyTemplate, type SalesOrderItemRow } from '../../common/commonFunctions/CommonUtilities';
import { showToast, resolveImageUrl } from '../../common/commonFunctions/commonFunction';
import './SalesOrderForm.css';

const paymentTermsOptions = ['Net 15', 'Net 30', 'Net 45', 'Net 60', 'Advance', 'COD'];
// Must match PAYMENT_METHODS in the backend's salesOrderPayment.controller.js exactly - that's
// what actually validates an Add Payment submission server-side.
const paymentMethodOptions = ['Cash', 'Bank Transfer', 'Cheque', 'UPI', 'Card', 'Other'];
const paymentStatusVariant: Record<SalesOrderPaymentStatus, StatusVariant> = {
    Unpaid: 'danger',
    Partial: 'warning',
    Paid: 'success',
};

let nextItemRowId = 1;

interface ItemForm {
    skuId: string;
    itemName: string;
    unit: string;
    orderedQty: number;
    unitPrice: number;
    discountPercent: number;
    gstPercent: number;
}

const emptyItemForm = (): ItemForm => ({
    skuId: DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING,
    itemName: DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING,
    unit: DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING,
    orderedQty: DEFAULT_DATA_TYPE_VALUE.ZERO,
    unitPrice: DEFAULT_DATA_TYPE_VALUE.ZERO,
    discountPercent: DEFAULT_DATA_TYPE_VALUE.ZERO,
    gstPercent: DEFAULT_DATA_TYPE_VALUE.ZERO,
});

const toIso = (date: Date | null): string | null => (date ? date.toISOString() : DEFAULT_DATA_TYPE_VALUE.NULL);

// The Dispatch dialog's "Available Qty" and "Dispatch Quantity" cells for a given SKU live
// in two separate PrimeReact Column cells, but Available Qty needs to live-reflect
// (Inventory Qty - Dispatch Qty) as the user adjusts the stepper. PrimeReact's Column caches
// a cell's rendered output and doesn't re-invoke its `body` callback just because the
// callback's closure changed (see DataTable.tsx's resolveColumnKey comment), so neither cell
// can rely on the parent SalesOrderForm re-rendering to pick up a fresh value. Instead both
// cells subscribe directly to this tiny per-SKU store via useSyncExternalStore, so a change
// in one cell forces the other to re-render itself, independent of whether the parent table
// ever re-invokes body() for either column. Declared at module scope (not nested in
// SalesOrderForm) so the store factory and cell components aren't redefined - and therefore
// remounted/reset - on every parent render.
interface DispatchQtyStore {
    get: (skuId: string) => number;
    set: (skuId: string, qty: number) => void;
    reset: (entries: Record<string, number>) => void;
    entries: () => [string, number][];
    subscribe: (skuId: string, listener: () => void) => () => void;
}

function createDispatchQtyStore(): DispatchQtyStore {
    const values = new Map<string, number>();
    const listeners = new Map<string, Set<() => void>>();
    return {
        get: (skuId) => values.get(skuId) ?? DEFAULT_DATA_TYPE_VALUE.ZERO,
        set: (skuId, qty) => {
            values.set(skuId, qty);
            listeners.get(skuId)?.forEach((listener) => listener());
        },
        reset: (entries) => {
            values.clear();
            Object.entries(entries).forEach(([skuId, qty]) => values.set(skuId, qty));
        },
        entries: () => Array.from(values.entries()),
        subscribe: (skuId, listener) => {
            if (!listeners.has(skuId)) listeners.set(skuId, new Set());
            listeners.get(skuId)?.add(listener);
            return () => listeners.get(skuId)?.delete(listener);
        },
    };
}

interface DispatchQtyStepperProps {
    skuId: string;
    max: number;
    store: DispatchQtyStore;
}

const DispatchQtyStepper = ({ skuId, max, store }: DispatchQtyStepperProps) => {
    const qty = useSyncExternalStore(
        (listener) => store.subscribe(skuId, listener),
        () => store.get(skuId),
    );

    const update = (next: number) => {
        store.set(skuId, Math.min(max, Math.max(DEFAULT_DATA_TYPE_VALUE.ZERO, next)));
    };

    return (
        <div className="so-dispatch-stepper">
            <button type="button" className="so-dispatch-stepper-btn" onClick={() => update(qty - 1)} disabled={qty <= 0}>−</button>
            <InputNumber
                value={qty}
                onValueChange={(e) => update(e.value ?? DEFAULT_DATA_TYPE_VALUE.ZERO)}
                min={0}
                max={max}
                className="so-dispatch-stepper-input"
                inputClassName="so-dispatch-stepper-input-field"
            />
            <button type="button" className="so-dispatch-stepper-btn" onClick={() => update(qty + 1)} disabled={qty >= max}>+</button>
        </div>
    );
};

interface DispatchAvailableQtyCellProps {
    skuId: string;
    inventoryQty: number;
    unit: string;
    store: DispatchQtyStore;
}

const DispatchAvailableQtyCell = ({ skuId, inventoryQty, unit, store }: DispatchAvailableQtyCellProps) => {
    const dispatchQty = useSyncExternalStore(
        (listener) => store.subscribe(skuId, listener),
        () => store.get(skuId),
    );
    const remaining = Math.max(inventoryQty - dispatchQty, DEFAULT_DATA_TYPE_VALUE.ZERO);

    return <span className="so-dispatch-available-badge">{remaining} {unit}</span>;
};

const SalesOrderForm = () => {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const isEditRoute = Boolean(id);
    const { inventories, customers, users, salesOrders, salesOrdersLoading, fetchSalesOrders, fetchInventories, fetchInvoices } = useContext(AppContext);
    const toast = useRef<Toast>(DEFAULT_DATA_TYPE_VALUE.NULL);
    const { dateFormat } = useDateFormatContext();

    const existingSo = useMemo(
        () => (isEditRoute ? (salesOrders as SalesOrderType[]).find((so) => so.id === Number(id)) : DEFAULT_DATA_TYPE_VALUE.UNDEFINED),
        [isEditRoute, salesOrders, id],
    );

    // Not local state - paidAmount is entirely server-derived (sum of Transaction History
    // entries, see salesOrderPayment.controller.js) and never edited here, so it's read
    // straight off existingSo every render instead of being copied into a useState once. That
    // copy-once approach (via the "one-time sync" effect below) was the actual bug behind
    // Order Summary not updating after Add Payment on Purchase Order (same fix applied here) -
    // fetchSalesOrders() refreshes existingSo just fine, but the effect's loadedForId guard
    // (there so a background refetch never clobbers an in-progress *edit*) meant the copied
    // value never got re-synced. Reading it live here instead means there's nothing to go stale.
    const paidAmount = existingSo?.paidAmount ?? DEFAULT_DATA_TYPE_VALUE.ZERO;

    // Locking reflects the SO's *persisted* status, not any live/unsaved value - a
    // brand-new SO is never locked; an existing one locks once it's already been Confirmed
    // (customer/dates/address/items become read-only - only Payment Status and Remarks
    // stay editable through Save, since those can change at any point in the lifecycle).
    const isLocked = isEditRoute && existingSo?.status !== 'Draft';

    const [activeTab, setActiveTab] = useState(DEFAULT_DATA_TYPE_VALUE.ZERO);
    const [loadedForId, setLoadedForId] = useState<number | null>(DEFAULT_DATA_TYPE_VALUE.NULL);
    const [currentSoNo, setCurrentSoNo] = useState(DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING);
    const [currentStatus, setCurrentStatus] = useState<SalesOrderType['status']>('Draft');
    const [customerName, setCustomerName] = useState(DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING);
    const [customerCode, setCustomerCode] = useState(DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING);
    const [orderDate, setOrderDate] = useState<Date | null>(new Date());
    const [deliveryDate, setDeliveryDate] = useState<Date | null>(DEFAULT_DATA_TYPE_VALUE.NULL);
    const [deliveryAddress, setDeliveryAddress] = useState(DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING);
    const [purchaseOrderRef, setPurchaseOrderRef] = useState(DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING);
    const [remarks, setRemarks] = useState(DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING);
    const [items, setItems] = useState<SalesOrderItemRow[]>([]);

    const [itemDialogVisible, setItemDialogVisible] = useState(DEFAULT_DATA_TYPE_VALUE.FALSE);
    const [editingItemRowId, setEditingItemRowId] = useState<number | null>(DEFAULT_DATA_TYPE_VALUE.NULL);
    const [itemForm, setItemForm] = useState<ItemForm>(emptyItemForm());

    const [dispatchDialogVisible, setDispatchDialogVisible] = useState(DEFAULT_DATA_TYPE_VALUE.FALSE);
    const [dispatchQtyStore] = useState(() => createDispatchQtyStore());

    // Add Payment dialog (Transaction History tab) - each submission becomes its own row in
    // ims_sales_order_payments rather than editing a single "Paid Amount" number. Mirrors
    // PurchaseOrderForm.tsx's identical block.
    const [paymentDialogVisible, setPaymentDialogVisible] = useState(DEFAULT_DATA_TYPE_VALUE.FALSE);
    const [paymentAmount, setPaymentAmount] = useState(DEFAULT_DATA_TYPE_VALUE.ZERO);
    const [paymentDate, setPaymentDate] = useState<Date | null>(new Date());
    const [paymentMethod, setPaymentMethod] = useState<string | null>(DEFAULT_DATA_TYPE_VALUE.NULL);
    const [paymentRemarks, setPaymentRemarks] = useState(DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING);
    const [paymentSaving, setPaymentSaving] = useState(DEFAULT_DATA_TYPE_VALUE.FALSE);
    // Per-transaction terms/approval - lives on the payment itself (not the SO's own Payment
    // Terms field), since a given payment can be approved separately under its own terms.
    const [paymentPaymentTerms, setPaymentPaymentTerms] = useState<string | null>(DEFAULT_DATA_TYPE_VALUE.NULL);
    const [paymentApprovedBy, setPaymentApprovedBy] = useState(DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING);
    const [paymentApprovedBySuggestions, setPaymentApprovedBySuggestions] = useState<User[]>([]);
    const [paymentApprovedAt, setPaymentApprovedAt] = useState<Date | null>(DEFAULT_DATA_TYPE_VALUE.NULL);

    useEffect(() => {
        if (existingSo && loadedForId !== existingSo.id) {
            // One-time sync of local form state once the async-loaded SO record arrives from
            // AppContext; guarded by loadedForId so it never re-runs for the same record.
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setCurrentSoNo(existingSo.soNo);
            setCurrentStatus(existingSo.status);

            setCustomerName(existingSo.customerName);
            setCustomerCode(existingSo.customerCode ?? DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING);
            setOrderDate(new Date(existingSo.orderDate));
            setDeliveryDate(existingSo.deliveryDate ? new Date(existingSo.deliveryDate) : DEFAULT_DATA_TYPE_VALUE.NULL);
            setDeliveryAddress(existingSo.deliveryAddress ?? DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING);
            setPurchaseOrderRef(existingSo.purchaseOrderRef ?? DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING);
            setRemarks(existingSo.remarks ?? DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING);
            setItems(existingSo.items.map((item) => ({ ...item, rowId: nextItemRowId++ })));
            setLoadedForId(existingSo.id);
        }
    }, [existingSo, loadedForId]);

    const updateItem = (rowId: number, patch: Partial<SalesOrderItemRow>) => {
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

    const openEditItemDialog = (row: SalesOrderItemRow) => {
        setEditingItemRowId(row.rowId);
        setItemForm({
            skuId: row.skuId,
            itemName: row.itemName,
            unit: row.unit,
            orderedQty: row.orderedQty,
            unitPrice: row.unitPrice,
            discountPercent: row.discountPercent,
            gstPercent: row.gstPercent,
        });
        setItemDialogVisible(DEFAULT_DATA_TYPE_VALUE.TRUE);
    };

    const handleCustomerSelect = (name: string) => {
        const customer = (customers as Customer[]).find((c) => c.customerName === name);
        setCustomerName(name);
        // Only prefills Delivery Address from the master record - never overwrites it once
        // the user has already typed/edited one (e.g. while reloading an existing order).
        if (customer?.address && !deliveryAddress) {
            setDeliveryAddress(customer.address);
        }
    };

    const handleSkuSelect = (skuId: string) => {
        const inventoryItem = (inventories as InventoryItem[]).find((i) => i.skuId === skuId);
        setItemForm((prev) => ({
            ...prev,
            skuId,
            itemName: inventoryItem?.productName ?? prev.itemName,
            unit: inventoryItem?.unit ?? prev.unit,
            unitPrice: inventoryItem?.sellingCost ?? prev.unitPrice,
        }));
    };

    const handleItemDialogSave = () => {
        if (!itemForm.skuId) {
            showToast(toast, 'error', 'Error', 'Select an item');
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
            skuId: itemForm.skuId,
            skuCode: itemForm.skuId,
            itemName: itemForm.itemName,
            unit: itemForm.unit,
            orderedQty: itemForm.orderedQty,
            dispatchedQty: DEFAULT_DATA_TYPE_VALUE.ZERO,
            pendingQty: itemForm.orderedQty,
            unitPrice: itemForm.unitPrice,
            discountPercent: itemForm.discountPercent,
            discountAmount,
            gstPercent: itemForm.gstPercent,
            gstAmount,
            lineTotal: taxable + gstAmount,
        };

        if (editingItemRowId) {
            updateItem(editingItemRowId, computed);
        } else {
            setItems((prev) => [...prev, { rowId: nextItemRowId++, ...computed }]);
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

    const balanceDue = Math.max(totals.grandTotal - paidAmount, DEFAULT_DATA_TYPE_VALUE.ZERO);
    const paidPercent = totals.grandTotal > 0 ? Math.min(100, Math.max(0, (paidAmount / totals.grandTotal) * 100)) : DEFAULT_DATA_TYPE_VALUE.ZERO;

    // Payment Status is derived from Paid Amount vs. Grand Total rather than picked by hand -
    // same rule (and same reasoning) as PurchaseOrderForm.tsx: 0 paid is Unpaid, paid at/above
    // the grand total is Paid, anything in between is Partial. Mirrors derivePaymentStatus in
    // the backend's orderTotals.js, which recomputes the same thing authoritatively on save.
    const paymentStatus: SalesOrderPaymentStatus = useMemo(() => {
        if (paidAmount <= 0) return 'Unpaid';
        if (totals.grandTotal <= 0) return 'Paid';
        if (paidAmount >= totals.grandTotal) return 'Paid';
        return 'Partial';
    }, [paidAmount, totals.grandTotal]);

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
    // Users in the schema (an approver may not be a system user at all). Mirrors
    // PurchaseOrderForm.tsx's identical searchPaymentApprovedByUsers.
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

    // Records one Transaction History entry against the already-saved SO - the backend
    // recomputes paidAmount/paymentStatus from the full payments table itself (see
    // salesOrderPayment.controller.js), so this just triggers a refetch afterwards rather than
    // locally patching paidAmount, keeping one source of truth.
    const handleAddPayment = async () => {
        if (!existingSo) return;
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
            await addSalesOrderPayment(existingSo.id, {
                amount: paymentAmount,
                paymentDate: toIso(paymentDate) ?? DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING,
                paymentMethod,
                remarks: paymentRemarks || DEFAULT_DATA_TYPE_VALUE.NULL,
                paymentTerms: paymentPaymentTerms,
                approvedBy: paymentApprovedBy || DEFAULT_DATA_TYPE_VALUE.NULL,
                approvedAt: toIso(paymentApprovedAt),
            });
            showToast(toast, 'success', 'Payment Recorded', 'Payment recorded successfully');
            fetchSalesOrders();
            setPaymentDialogVisible(DEFAULT_DATA_TYPE_VALUE.FALSE);
        } catch (err) {
            showToast(toast, 'error', 'Error', err instanceof Error ? err.message : 'Something went wrong');
        } finally {
            setPaymentSaving(DEFAULT_DATA_TYPE_VALUE.FALSE);
        }
    };

    const handleDeletePayment = (payment: SalesOrderPayment) => {
        if (!existingSo) return;
        confirmDialog({
            message: 'Are you sure you want to delete this payment entry? This cannot be undone.',
            header: 'Delete Payment',
            icon: 'pi pi-exclamation-triangle',
            acceptClassName: 'p-button-danger',
            accept: async () => {
                try {
                    await deleteSalesOrderPayment(existingSo.id, payment.id);
                    showToast(toast, 'success', 'Deleted', 'Payment entry deleted successfully');
                    fetchSalesOrders();
                } catch (err) {
                    showToast(toast, 'error', 'Error', err instanceof Error ? err.message : 'Something went wrong');
                }
            },
        });
    };

    const handleCancel = () => {
        navigate('/sales-order');
    };

    const handleSave = async () => {
        if (!customerName.trim() || !orderDate) {
            showToast(toast, 'error', 'Error', 'Customer and SO Date are required');
            return;
        }
        if (!isLocked && items.length === 0) {
            showToast(toast, 'error', 'Error', 'Add at least one item');
            return;
        }

        const computedItems: SalesOrderItem[] = items.map((item) => {
            const lineGross = item.orderedQty * item.unitPrice;
            const discountAmount = (lineGross * item.discountPercent) / 100;
            const taxable = lineGross - discountAmount;
            const gstAmount = (taxable * item.gstPercent) / 100;
            return {
                skuId: item.skuId,
                skuCode: item.skuCode,
                itemName: item.itemName,
                unit: item.unit,
                orderedQty: item.orderedQty,
                dispatchedQty: item.dispatchedQty,
                pendingQty: item.orderedQty - item.dispatchedQty,
                unitPrice: item.unitPrice,
                discountPercent: item.discountPercent,
                discountAmount,
                gstPercent: item.gstPercent,
                gstAmount,
                lineTotal: taxable + gstAmount,
            };
        });

        const payload: SalesOrderPayload = {
            customerName,
            customerCode: customerCode || DEFAULT_DATA_TYPE_VALUE.NULL,
            orderDate: toIso(orderDate) ?? DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING,
            deliveryDate: toIso(deliveryDate),
            deliveryAddress: deliveryAddress || DEFAULT_DATA_TYPE_VALUE.NULL,
            paymentStatus,
            paidAmount,
            purchaseOrderRef: purchaseOrderRef || DEFAULT_DATA_TYPE_VALUE.NULL,
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
            if (isEditRoute && existingSo) {
                // Once locked (not Draft), items can no longer be edited server-side - omit
                // them from the payload so a locked order's Save (e.g. just marking Paid)
                // doesn't trip the backend's Draft-only items guard.
                const updatePayload = isLocked ? { ...payload, items: DEFAULT_DATA_TYPE_VALUE.UNDEFINED } : payload;
                await updateSalesOrder(existingSo.id, updatePayload);
                showToast(toast, 'success', 'Updated', 'Sales order updated successfully');
            } else {
                await createSalesOrder(payload);
                showToast(toast, 'success', 'Created', 'Sales order created successfully');
            }
            fetchSalesOrders();
            navigate('/sales-order');
        } catch (err) {
            showToast(toast, 'error', 'Error', err instanceof Error ? err.message : 'Something went wrong');
        }
    };

    const handleConfirmOrder = () => {
        if (!existingSo) return;
        confirmDialog({
            message: 'Confirm this sales order? Items can no longer be edited once confirmed.',
            header: 'Confirm Sales Order',
            icon: 'pi pi-question-circle',
            accept: async () => {
                try {
                    await confirmSalesOrder(existingSo.id);
                    showToast(toast, 'success', 'Confirmed', 'Sales order confirmed successfully');
                    fetchSalesOrders();
                } catch (err) {
                    showToast(toast, 'error', 'Error', err instanceof Error ? err.message : 'Something went wrong');
                }
            },
        });
    };

    const handleStartProcessing = () => {
        if (!existingSo) return;
        confirmDialog({
            message: 'Move this order to Processing?',
            header: 'Start Processing',
            icon: 'pi pi-question-circle',
            accept: async () => {
                try {
                    await startProcessingSalesOrder(existingSo.id);
                    showToast(toast, 'success', 'Processing', 'Sales order moved to Processing');
                    fetchSalesOrders();
                } catch (err) {
                    showToast(toast, 'error', 'Error', err instanceof Error ? err.message : 'Something went wrong');
                }
            },
        });
    };

    const openDispatchDialog = () => {
        if (!existingSo) return;
        const initial: Record<string, number> = {};
        existingSo.items.forEach((item) => {
            if (item.pendingQty > 0) initial[item.skuId] = item.pendingQty;
        });
        dispatchQtyStore.reset(initial);
        setDispatchDialogVisible(DEFAULT_DATA_TYPE_VALUE.TRUE);
    };

    const handleDispatchSave = async () => {
        if (!existingSo) return;
        const shipments = dispatchQtyStore.entries()
            .filter(([, qty]) => qty > 0)
            .map(([skuId, shipQty]) => ({ skuId, shipQty }));
        if (shipments.length === 0) {
            showToast(toast, 'error', 'Error', 'Enter a ship quantity for at least one item');
            return;
        }
        try {
            const { warning } = await dispatchSalesOrder(existingSo.id, shipments);
            showToast(toast, 'success', 'Dispatched', 'Items dispatched successfully');
            if (warning) showToast(toast, 'warn', 'Invoice not generated', warning, 6000);
            fetchSalesOrders();
            fetchInventories();
            // Dispatching also auto-generates a Sales Invoice server-side (see
            // salesOrder.controller.js) - refetch so it shows up on /invoices immediately.
            fetchInvoices();
            setDispatchDialogVisible(DEFAULT_DATA_TYPE_VALUE.FALSE);
        } catch (err) {
            showToast(toast, 'error', 'Error', err instanceof Error ? err.message : 'Something went wrong');
        }
    };

    const handleRevertDispatch = () => {
        if (!existingSo) return;
        confirmDialog({
            message: 'Revert this order back to Processing? Every shipped item will be added back onto Inventory stock.',
            header: 'Revert Dispatch',
            icon: 'pi pi-exclamation-triangle',
            accept: async () => {
                try {
                    await revertDispatchSalesOrder(existingSo.id);
                    showToast(toast, 'success', 'Reverted', 'Sales order reverted to Processing successfully');
                    fetchSalesOrders();
                    fetchInventories();
                } catch (err) {
                    showToast(toast, 'error', 'Error', err instanceof Error ? err.message : 'Something went wrong');
                }
            },
        });
    };

    const handleCancelOrder = () => {
        if (!existingSo) return;
        confirmDialog({
            message: 'Are you sure you want to cancel this order?',
            header: 'Cancel Sales Order',
            icon: 'pi pi-exclamation-triangle',
            acceptClassName: 'p-button-danger',
            accept: async () => {
                try {
                    await cancelSalesOrder(existingSo.id);
                    showToast(toast, 'success', 'Cancelled', 'Sales order cancelled successfully');
                    fetchSalesOrders();
                    navigate('/sales-order');
                } catch (err) {
                    showToast(toast, 'error', 'Error', err instanceof Error ? err.message : 'Something went wrong');
                }
            },
        });
    };

    const itemColumns = getSalesOrderItemColumns(items, inventories as InventoryItem[], isLocked ? DEFAULT_DATA_TYPE_VALUE.UNDEFINED : openEditItemDialog);
    const itemActionTemplate = isLocked
        ? DEFAULT_DATA_TYPE_VALUE.UNDEFINED
        : getActionBodyTemplate<SalesOrderItemRow>({ onDelete: (row) => removeItem(row.rowId) });

    // Transaction History table - deleting a payment is always available regardless of
    // isLocked, since recording payment is a financial action independent of the Draft-only
    // Items lock (see the Add Payment button's own disabled condition below). Written by hand
    // (not via getActionBodyTemplate) for the same react-hooks/refs reason as
    // PurchaseOrderForm.tsx's identical paymentActionTemplate - handleDeletePayment closes
    // over the `toast` ref.
    const paymentColumns = getSalesOrderPaymentColumns(dateFormat, users);
    const paymentActionTemplate = (payment: SalesOrderPayment) => (
        <div className="data-table-actions">
            <HiOutlineTrash size={16} color="#dc2626" onClick={() => handleDeletePayment(payment)} />
        </div>
    );

    const dispatchItemsList = existingSo?.items.filter((item) => item.pendingQty > 0) ?? [];
    const dispatchColumns: ColumnConfig<SalesOrderItem>[] = [
        {
            field: 'skuId',
            key: 'srNo',
            header: 'Sr. No.',
            style: { width: '70px' },
            body: (row) => <span className="so-dispatch-sr-no">{String(dispatchItemsList.findIndex((i) => i.skuId === row.skuId) + 1).padStart(2, '0')}</span>,
        },
        {
            field: 'itemName',
            header: 'Item Details',
            body: (row) => {
                const inventoryItem = (inventories as InventoryItem[]).find((i) => i.skuId === row.skuId);
                const image = inventoryItem?.images?.[0];
                return (
                    <div className="so-dispatch-item-details">
                        <div className="so-dispatch-item-thumb">
                            {image ? <img src={resolveImageUrl(image)} alt="" /> : <HiOutlineCube size={18} />}
                        </div>
                        <div>
                            <div className="so-dispatch-item-name">{row.itemName}</div>
                            <div className="so-dispatch-item-category">{inventoryItem?.categoryName || inventoryItem?.productType || '—'}</div>
                        </div>
                    </div>
                );
            },
        },
        { field: 'skuId', key: 'sku', header: 'SKU' },
        {
            field: 'pendingQty',
            key: 'available',
            header: 'Available Qty',
            body: (row) => {
                const inventoryItem = (inventories as InventoryItem[]).find((i) => i.skuId === row.skuId);
                return (
                    <DispatchAvailableQtyCell
                        key={row.skuId}
                        skuId={row.skuId}
                        inventoryQty={inventoryItem?.quantity ?? DEFAULT_DATA_TYPE_VALUE.ZERO}
                        unit={row.unit}
                        store={dispatchQtyStore}
                    />
                );
            },
        },
        {
            field: 'skuId',
            key: 'dispatchQty',
            header: 'Dispatch Quantity',
            body: (row) => (
                <DispatchQtyStepper key={row.skuId} skuId={row.skuId} max={row.pendingQty} store={dispatchQtyStore} />
            ),
        },
    ];

    if (isEditRoute && salesOrdersLoading) {
        return <div className="sales-order-form-page">Loading sales order…</div>;
    }
    if (isEditRoute && !existingSo) {
        return <div className="sales-order-form-page">Sales order not found.</div>;
    }

    return (
        <div className="sales-order-form-page">
            <Toast ref={toast} />

            <div className="so-form-toolbar">
                <div className="so-form-toolbar-title">
                    <button type="button" className="so-form-back-btn" onClick={handleCancel} aria-label="Back to sales orders">
                        <HiOutlineArrowLeft size={18} />
                    </button>
                    <h2>{isEditRoute ? `Edit ${currentSoNo}` : 'New Sales Order'}</h2>
                </div>
                <div className="so-form-toolbar-actions">
                    {existingSo?.status === 'Draft' && (
                        <Button label="Confirm Order" icon={<HiOutlineCheckCircle className="mr-2" />} onClick={handleConfirmOrder} outlined />
                    )}
                    {existingSo?.status === 'Confirmed' && (
                        <Button label="Start Processing" icon={<HiOutlineCheckCircle className="mr-2" />} onClick={handleStartProcessing} outlined />
                    )}
                    {(existingSo?.status === 'Processing' || existingSo?.status === 'Partially Shipped') && (
                        <Button label={existingSo?.status === 'Partially Shipped' ? 'Dispatch Remaining' : 'Dispatch Items'} icon={<HiOutlineTruck className="mr-2" />} onClick={openDispatchDialog} outlined />
                    )}
                    {(existingSo?.status === 'Partially Shipped' || existingSo?.status === 'Dispatched') && (
                        <Button label="Revert to Processing" icon={<HiOutlineArrowUturnLeft className="mr-2" />} onClick={handleRevertDispatch} outlined />
                    )}
                    {(existingSo?.status === 'Draft' || existingSo?.status === 'Confirmed' || existingSo?.status === 'Processing') && isEditRoute && (
                        <Button label="Cancel Order" icon={<HiOutlineXCircle className="mr-2" />} severity="danger" outlined onClick={handleCancelOrder} />
                    )}
                    <Button label="Cancel" outlined onClick={handleCancel} />
                    {existingSo?.status !== 'Cancelled' && (
                        <Button label="Save" icon={<HiOutlineCheckCircle className="mr-2" />} onClick={handleSave} />
                    )}
                </div>
            </div>

            <div className="so-form-layout">
                <div className="so-form-main">
                    <div className="so-card so-card--tabs">
                        <TabView activeIndex={activeTab} onTabChange={(e) => setActiveTab(e.index)}>
                            <TabPanel header={<span className="so-tab-label"><HiOutlineClipboardDocumentList size={15} />Order Information</span>}>
                                <div className="so-section">
                                    <div className="so-section-title">Order Details</div>
                                    <div className="sales-order-form-grid">
                                        <div className="form-field">
                                            <label>SO No.</label>
                                            <div className="so-input-icon-wrapper">
                                                <InputText className="so-input so-input--icon-right" value={isEditRoute ? `#${currentSoNo}` : DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING} placeholder="#SO-XXXXXX" disabled />
                                                <HiOutlineLockClosed size={14} className="so-input-icon-right" />
                                            </div>
                                        </div>
                                        <div className="form-field">
                                            <label>SO Date <span className="so-item-required">*</span></label>
                                            <Calendar value={orderDate} onChange={(e) => setOrderDate(e.value as Date)} dateFormat="dd/mm/yy" showIcon disabled={isLocked} />
                                        </div>
                                        <div className="form-field">
                                            <label>Purchase Order (Ref.)</label>
                                            <InputText value={purchaseOrderRef} onChange={(e) => setPurchaseOrderRef(e.target.value)} placeholder="Enter purchase order reference" disabled={isLocked} />
                                        </div>
                                    </div>
                                </div>

                                <div className="so-section">
                                    <div className="so-section-title">Customer Details</div>
                                    <div className="sales-order-form-grid">
                                        <div className="form-field">
                                            <label>Customer <span className="so-item-required">*</span></label>
                                            <Dropdown
                                                value={customerName}
                                                onChange={(e) => handleCustomerSelect(e.value)}
                                                options={(customers as Customer[]).map((c) => c.customerName)}
                                                placeholder="Select customer"
                                                disabled={isLocked}
                                                filter
                                            />
                                        </div>
                                        <div className="form-field">
                                            <label>Customer Code</label>
                                            <InputText value={customerCode} onChange={(e) => setCustomerCode(e.target.value)} placeholder="Enter customer code (optional)" disabled={isLocked} />
                                        </div>
                                    </div>
                                </div>
                                <div className="so-section so-section--last">
                                    <div className="so-section-title">Delivery And Notes</div>
                                    <div className="sales-order-form-grid">
                                        <div className="form-field">
                                            <label>Dispatch/Delivery Date</label>
                                            <Calendar value={deliveryDate} onChange={(e) => setDeliveryDate(e.value as Date)} dateFormat="dd/mm/yy" showIcon placeholder="Select date" disabled={isLocked} />
                                        </div>
                                        <div className="sales-order-form-half-row">
                                            <div className="form-field">
                                                <label>Delivery Address</label>
                                                <div className="so-input-icon-wrapper">
                                                    <InputTextarea className="so-input" value={deliveryAddress} onChange={(e) => setDeliveryAddress(e.target.value)} rows={3} placeholder="Enter delivery address" disabled={isLocked} />
                                                    <HiOutlineMapPin size={15} className="so-textarea-icon" />
                                                </div>
                                            </div>
                                            <div className="form-field">
                                                <label>Remarks</label>
                                                <div className="so-input-icon-wrapper">
                                                    <InputTextarea className="so-input" value={remarks} onChange={(e) => setRemarks(e.target.value)} rows={3} placeholder="Enter any remarks (optional)" />
                                                    <HiOutlineDocumentText size={15} className="so-textarea-icon" />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </TabPanel>

                            <TabPanel header={<span className="so-tab-label"><HiOutlineShoppingBag size={15} />Order Items</span>}>
                                <div className="sales-order-items-header">
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

                            <TabPanel header={<span className="so-tab-label"><HiOutlineBanknotes size={15} />Transaction History</span>}>
                                <div className="sales-order-items-header">
                                    <h3>Payment Transactions</h3>
                                    {/* Available regardless of isLocked - collecting payment is independent of the
                                        Draft-only Items lock. Disabled once the balance is fully cleared instead. */}
                                    <Button
                                        label="Add Payment"
                                        icon={<HiOutlinePlus className="mr-2" />}
                                        size="small"
                                        onClick={openPaymentDialog}
                                        outlined
                                        disabled={!existingSo || balanceDue <= 0}
                                    />
                                </div>
                                {!existingSo ? (
                                    <div className="so-preview-items-empty">
                                        <div className="so-preview-items-empty-icon">
                                            <HiOutlineBanknotes size={22} />
                                        </div>
                                        <div className="so-preview-items-empty-title">Save the Sales Order first</div>
                                        <div className="so-preview-items-empty-sub">Payments can only be recorded once the order has been saved.</div>
                                    </div>
                                ) : (
                                    <DataTable
                                        value={existingSo.payments}
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

                <div className="so-preview-panel">
                    <div className="so-preview-card">
                        <div className="so-card-header so-preview-header">
                            <div className="so-card-header-icon">
                                <HiOutlineLink size={20} />
                            </div>
                            <div className="so-preview-header-text">
                                <h3>Order Summary</h3>
                            </div>
                            <span className={`so-preview-status so-preview-status--${(isEditRoute ? currentStatus : 'Draft').toLowerCase().replace(/\s+/g, '-')}`}>
                                {isEditRoute ? currentStatus : 'Draft'}
                            </span>
                        </div>

                        <div className="so-preview-so-no">
                            <span className="so-preview-label">SO No.</span>
                            <span className="so-preview-badge">{isEditRoute ? `#${currentSoNo}` : '#SO-XXXXXX'}</span>
                        </div>

                        <div className="so-preview-mini-grid">
                            <div>
                                <div className="so-preview-label">Customer</div>
                                <div>{customerName || '—'}</div>
                            </div>
                        </div>

                        <div className="so-preview-divider" />

                        <div className="so-preview-label">Item Summary</div>
                        {items.length === 0 ? (
                            <div className="so-preview-items-empty">
                                <div className="so-preview-items-empty-icon">
                                    <HiOutlineShoppingCart size={22} />
                                </div>
                                <div className="so-preview-items-empty-title">No items added yet</div>
                                <div className="so-preview-items-empty-sub">Add items to see the summary</div>
                            </div>
                        ) : (
                            // Scrolls internally once past 5 rows, instead of pushing Totals/
                            // Payment Status further and further down the panel as items grow.
                            <div className="so-preview-items-scroll">
                                <table className="so-preview-items-table">
                                    <thead>
                                        <tr>
                                            <th>Item</th>
                                            <th>Qty</th>
                                            <th>Rate</th>
                                            <th>Total</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {items.map((item) => (
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

                        <div className="so-preview-divider" />

                        <div className="so-preview-totals">
                            <div><span>Sub Total</span><span>Rs. {totals.subTotal.toLocaleString('en-IN')}</span></div>
                            <div><span>Discount</span><span className="so-discount-value">- Rs. {totals.discountAmount.toLocaleString('en-IN')}</span></div>
                            <div><span>GST</span><span>Rs. {totals.gstAmount.toLocaleString('en-IN')}</span></div>
                        </div>

                        <div className="so-preview-grand-total"><span>Grand Total</span><span>Rs. {totals.grandTotal.toLocaleString('en-IN')}</span></div>

                        <>
                            <div className="so-preview-divider" />
                            <div className="so-payment-progress">
                                <div className="so-payment-progress-row">
                                    <span>Payment Status</span>
                                    <StatusBadge label={paymentStatus} variant={paymentStatusVariant[paymentStatus]} />
                                </div>
                                <div className="so-payment-progress-row">
                                    <span>Paid</span>
                                    <span>{formatRupees(paidAmount)}</span>
                                </div>
                                <div className="so-payment-progress-track">
                                    <div className="so-payment-progress-fill" style={{ width: `${paidPercent}%` }} />
                                </div>
                                <div className="so-payment-progress-row so-payment-progress-balance">
                                    <span>Balance due</span>
                                    <span className={balanceDue > 0 ? 'so-payment-balance-due' : 'so-payment-balance-clear'}>{formatRupees(balanceDue)}</span>
                                </div>
                            </div>
                            {balanceDue > 0 && (
                                <div className="so-preview-warning-banner">
                                    <HiOutlineExclamationTriangle size={16} />
                                    <span>Balance due of {formatRupees(balanceDue)} remains outstanding - collect payment before dispatch.</span>
                                </div>
                            )}
                        </>
                    </div>
                </div>
            </div>

            <Dialog
                visible={itemDialogVisible}
                onHide={() => setItemDialogVisible(DEFAULT_DATA_TYPE_VALUE.FALSE)}
                header={editingItemRowId ? 'Edit Item' : 'Add Item'}
                style={{ width: '540px', maxWidth: '95vw' }}
                className="so-item-dialog"
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
                <div className="so-item-form-body">
                    <div className="so-item-field">
                        <label>Item (SKU) <span className="so-item-required">*</span></label>
                        <div className="so-item-input-icon-wrapper">
                            <HiOutlineTag className="so-item-input-icon" />
                            <Dropdown
                                className="so-item-input so-item-input--icon"
                                value={itemForm.skuId}
                                onChange={(e) => handleSkuSelect(e.value)}
                                options={(inventories as InventoryItem[]).map((i) => ({ label: `${i.skuId} - ${i.productName}`, value: i.skuId }))}
                                placeholder="Select an item"
                                filter
                            />
                        </div>
                    </div>

                    <div className="so-item-form-grid">
                        <div className="so-item-field">
                            <label>Unit</label>
                            <div className="so-item-input-icon-wrapper">
                                <HiOutlineCube className="so-item-input-icon" />
                                <InputText className="so-item-input so-item-input--icon" value={itemForm.unit} disabled />
                            </div>
                        </div>
                        <div className="so-item-field">
                            <label>Selling Price (Rs.) <span className="so-item-required">*</span></label>
                            <div className="so-item-input-icon-wrapper">
                                <span className="so-item-input-icon so-item-input-icon--text">₹</span>
                                <InputNumber
                                    className="so-item-input so-item-input--icon"
                                    value={itemForm.unitPrice}
                                    onValueChange={(e) => setItemForm({ ...itemForm, unitPrice: e.value ?? DEFAULT_DATA_TYPE_VALUE.ZERO })}
                                    mode="decimal"
                                    minFractionDigits={2}
                                />
                            </div>
                        </div>
                        <div className="so-item-field">
                            <label>Ordered Quantity <span className="so-item-required">*</span></label>
                            <div className="so-item-input-icon-wrapper">
                                <HiOutlineShoppingBag className="so-item-input-icon" />
                                <InputNumber
                                    className="so-item-input so-item-input--icon"
                                    value={itemForm.orderedQty}
                                    onValueChange={(e) => setItemForm({ ...itemForm, orderedQty: e.value ?? DEFAULT_DATA_TYPE_VALUE.ZERO })}
                                />
                            </div>
                        </div>
                        <div className="so-item-field">
                            <label>Discount (%)</label>
                            <div className="so-item-input-icon-wrapper">
                                <span className="so-item-input-icon so-item-input-icon--text">%</span>
                                <InputNumber
                                    className="so-item-input so-item-input--icon"
                                    value={itemForm.discountPercent}
                                    onValueChange={(e) => setItemForm({ ...itemForm, discountPercent: e.value ?? DEFAULT_DATA_TYPE_VALUE.ZERO })}
                                    suffix="%"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="so-item-field">
                        <label>GST (%)</label>
                        <InputNumber
                            className="so-item-input"
                            value={itemForm.gstPercent}
                            onValueChange={(e) => setItemForm({ ...itemForm, gstPercent: e.value ?? DEFAULT_DATA_TYPE_VALUE.ZERO })}
                            suffix="%"
                        />
                    </div>

                    <div className="so-item-summary">
                        <div className="so-item-summary-icon">
                            <HiOutlineCalculator size={14} />
                        </div>
                        <div className="so-item-summary-body">
                            <span className="so-item-summary-title">Amount Summary</span>
                            <div className="so-item-summary-row">
                                <div className="so-item-summary-cell">
                                    <span className="so-item-summary-label">Sub Total</span>
                                    <span className="so-item-summary-value">{formatRupees(itemFormTotals.subTotal)}</span>
                                </div>
                                <span className="so-item-summary-operator">-</span>
                                <div className="so-item-summary-cell">
                                    <span className="so-item-summary-label">Discount</span>
                                    <span className="so-item-summary-value so-discount-value">{formatRupees(itemFormTotals.discountAmount)}</span>
                                </div>
                                <span className="so-item-summary-operator">+</span>
                                <div className="so-item-summary-cell">
                                    <span className="so-item-summary-label">GST</span>
                                    <span className="so-item-summary-value">{formatRupees(itemFormTotals.gstAmount)}</span>
                                </div>
                                <span className="so-item-summary-operator">=</span>
                                <div className="so-item-summary-cell">
                                    <span className="so-item-summary-label">Total Amount</span>
                                    <span className="so-item-summary-value so-item-summary-total">{formatRupees(itemFormTotals.grandTotal)}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </Dialog>

            <Dialog
                visible={paymentDialogVisible}
                onHide={() => setPaymentDialogVisible(DEFAULT_DATA_TYPE_VALUE.FALSE)}
                header="Add Payment"
                style={{ width: '480px', maxWidth: '95vw' }}
                className="so-item-dialog"
                footer={
                    <>
                        <Button label="Cancel" outlined onClick={() => setPaymentDialogVisible(DEFAULT_DATA_TYPE_VALUE.FALSE)} disabled={paymentSaving} />
                        <Button label="Add Payment" icon={<HiOutlinePlus className="mr-2" />} onClick={handleAddPayment} loading={paymentSaving} />
                    </>
                }
            >
                <div className="so-item-form-body">
                    <div className="so-item-form-grid">
                        <div className="so-item-field">
                            <label>Amount (Rs.) <span className="so-item-required">*</span></label>
                            <div className="so-item-input-icon-wrapper">
                                <span className="so-item-input-icon so-item-input-icon--text">₹</span>
                                <InputNumber
                                    className="so-item-input so-item-input--icon"
                                    value={paymentAmount}
                                    onValueChange={(e) => setPaymentAmount(e.value ?? DEFAULT_DATA_TYPE_VALUE.ZERO)}
                                    mode="decimal"
                                    minFractionDigits={2}
                                    max={balanceDue}
                                />
                            </div>
                            <span className="so-payment-balance-hint">Balance due: {formatRupees(balanceDue)}</span>
                        </div>
                        <div className="so-item-field">
                            <label>Payment Date <span className="so-item-required">*</span></label>
                            <Calendar value={paymentDate} onChange={(e) => setPaymentDate(e.value as Date)} dateFormat="dd/mm/yy" showIcon />
                        </div>
                    </div>

                    <div className="so-item-form-grid">
                        <div className="so-item-field">
                            <label>Payment Method</label>
                            <Dropdown value={paymentMethod} onChange={(e) => setPaymentMethod(e.value)} options={paymentMethodOptions} placeholder="Select method (optional)" />
                        </div>
                        <div className="so-item-field">
                            <label>Payment Terms</label>
                            <Dropdown value={paymentPaymentTerms} onChange={(e) => setPaymentPaymentTerms(e.value)} options={paymentTermsOptions} placeholder="Select terms (optional)" />
                        </div>
                    </div>

                    <div className="so-item-form-grid">
                        <div className="so-item-field">
                            <label>Approved By</label>
                            <AutoComplete
                                value={paymentApprovedBy}
                                suggestions={paymentApprovedBySuggestions}
                                completeMethod={searchPaymentApprovedByUsers}
                                field="fullName"
                                onChange={handlePaymentApprovedByChange}
                                placeholder="Enter approver name (optional)"
                                dropdown
                                panelClassName="so-approved-by-panel"
                            />
                        </div>
                        <div className="so-item-field">
                            <label>Approved At</label>
                            <Calendar value={paymentApprovedAt} onChange={(e) => setPaymentApprovedAt(e.value as Date)} dateFormat="dd/mm/yy" showIcon showTime />
                        </div>
                    </div>

                    <div className="so-item-field">
                        <label>Remarks (Optional)</label>
                        <InputTextarea
                            className="so-item-input"
                            value={paymentRemarks}
                            onChange={(e) => setPaymentRemarks(e.target.value)}
                            placeholder="Enter remarks (optional)"
                            rows={3}
                        />
                    </div>
                </div>
            </Dialog>

            <Dialog
                visible={dispatchDialogVisible}
                onHide={() => setDispatchDialogVisible(DEFAULT_DATA_TYPE_VALUE.FALSE)}
                header="Dispatch Items"
                style={{ width: '640px', maxWidth: '95vw' }}
                footer={
                    <>
                        <Button label="Cancel" outlined onClick={() => setDispatchDialogVisible(DEFAULT_DATA_TYPE_VALUE.FALSE)} />
                        <Button label="Dispatch" icon={<HiOutlineTruck className="mr-2" />} onClick={handleDispatchSave} />
                    </>
                }
            >
                <div className="so-dispatch-content">
                    <DataTable<SalesOrderItem>
                        value={dispatchItemsList}
                        columns={dispatchColumns}
                        dataKey="skuId"
                        rows={5}
                        sortable={false}
                        filterable={false}
                        emptyMessage="Nothing left to dispatch."
                    />
                </div>
            </Dialog>
        </div>
    );
};
export default SalesOrderForm;
