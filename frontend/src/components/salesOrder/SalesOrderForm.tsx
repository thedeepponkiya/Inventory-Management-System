import { useContext, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
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
    HiOutlineCurrencyRupee,
    HiOutlinePrinter,
    HiOutlineArrowDownTray,
} from 'react-icons/hi2';
import DataTable, { type ColumnConfig } from '../../common/commonComponents/dataTable/DataTable';
import { AppContext } from '../../context/AppContextDefinition';
import { useCompanyLogoContext } from '../../context/CompanyLogoContextDefinition';
import {
    createSalesOrder,
    updateSalesOrder,
    confirmSalesOrder,
    startProcessingSalesOrder,
    dispatchSalesOrder,
    revertDispatchSalesOrder,
    cancelSalesOrder,
    type SalesOrder as SalesOrderType,
    type SalesOrderItem,
    type SalesOrderPayload,
    type SalesOrderPaymentStatus,
} from '../../services/salesOrderService';
import type { InventoryItem } from '../../services/inventoryService';
import type { Customer } from '../../services/customerService';
import { DEFAULT_DATA_TYPE_VALUE } from '../../common/constants/commonConstant';
import { getSalesOrderItemColumns, getActionBodyTemplate, type SalesOrderItemRow } from '../../common/commonFunctions/CommonUtilities';
import { showToast, resolveImageUrl } from '../../common/commonFunctions/commonFunction';
import { printSalesOrderInvoicePdf, downloadSalesOrderInvoicePdf } from '../../common/commonFunctions/salesOrderInvoicePdf';
import './SalesOrderForm.css';

const paymentStatusOptions: SalesOrderPaymentStatus[] = ['Unpaid', 'Partial', 'Paid'];
const paymentTermsOptions = ['Net 15', 'Net 30', 'Net 45', 'Net 60', 'Advance', 'COD'];
// Single fixed option - no multi-currency conversion logic exists anywhere in this app,
// this is purely a display field (see schema.sql's comment on ims_sales_order.currency).
const currencyOptions = ['INR - Indian Rupee'];

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
    const { inventories, customers, salesOrders, salesOrdersLoading, fetchSalesOrders, fetchInventories } = useContext(AppContext);
    const toast = useRef<Toast>(DEFAULT_DATA_TYPE_VALUE.NULL);
    const { companyLogo } = useCompanyLogoContext();

    const existingSo = useMemo(
        () => (isEditRoute ? (salesOrders as SalesOrderType[]).find((so) => so.id === Number(id)) : DEFAULT_DATA_TYPE_VALUE.UNDEFINED),
        [isEditRoute, salesOrders, id],
    );

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
    const [paymentStatus, setPaymentStatus] = useState<SalesOrderPaymentStatus>('Unpaid');
    const [paidAmount, setPaidAmount] = useState(DEFAULT_DATA_TYPE_VALUE.ZERO);
    const [paymentTerms, setPaymentTerms] = useState<string | null>(DEFAULT_DATA_TYPE_VALUE.NULL);
    const [purchaseOrderRef, setPurchaseOrderRef] = useState(DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING);
    const [currency, setCurrency] = useState(currencyOptions[0]);
    const [remarks, setRemarks] = useState(DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING);
    const [items, setItems] = useState<SalesOrderItemRow[]>([]);

    const [itemDialogVisible, setItemDialogVisible] = useState(DEFAULT_DATA_TYPE_VALUE.FALSE);
    const [editingItemRowId, setEditingItemRowId] = useState<number | null>(DEFAULT_DATA_TYPE_VALUE.NULL);
    const [itemForm, setItemForm] = useState<ItemForm>(emptyItemForm());

    const [dispatchDialogVisible, setDispatchDialogVisible] = useState(DEFAULT_DATA_TYPE_VALUE.FALSE);
    const [dispatchQtyStore] = useState(() => createDispatchQtyStore());
    const [dispatchInvoice, setDispatchInvoice] = useState<SalesOrderType | null>(DEFAULT_DATA_TYPE_VALUE.NULL);

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
            setPaymentStatus(existingSo.paymentStatus);
            setPaidAmount(existingSo.paidAmount);
            setPaymentTerms(existingSo.paymentTerms);
            setPurchaseOrderRef(existingSo.purchaseOrderRef ?? DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING);
            setCurrency(existingSo.currency);
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
            paymentTerms,
            purchaseOrderRef: purchaseOrderRef || DEFAULT_DATA_TYPE_VALUE.NULL,
            currency,
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
            const updated = await dispatchSalesOrder(existingSo.id, shipments);
            showToast(toast, 'success', 'Dispatched', 'Items dispatched successfully');
            fetchSalesOrders();
            fetchInventories();
            setDispatchDialogVisible(DEFAULT_DATA_TYPE_VALUE.FALSE);
            setDispatchInvoice(updated);
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

    const itemColumns = getSalesOrderItemColumns(items, isLocked ? DEFAULT_DATA_TYPE_VALUE.UNDEFINED : openEditItemDialog);
    const itemActionTemplate = isLocked
        ? DEFAULT_DATA_TYPE_VALUE.UNDEFINED
        : getActionBodyTemplate<SalesOrderItemRow>({ onDelete: (row) => removeItem(row.rowId) });

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
                                <div className="so-section">
                                    <div className="so-section-title">Payment Details</div>
                                    <div className="sales-order-form-grid sales-order-form-grid--4col">
                                        <div className="form-field">
                                            <label>Payment Terms</label>
                                            <Dropdown value={paymentTerms} onChange={(e) => setPaymentTerms(e.value)} options={paymentTermsOptions} placeholder="Select payment terms" disabled={isLocked} />
                                        </div>
                                        <div className="form-field">
                                            <label>Payment Status</label>
                                            <Dropdown value={paymentStatus} onChange={(e) => setPaymentStatus(e.value)} options={paymentStatusOptions} placeholder="Select payment status" />
                                        </div>
                                        <div className="form-field">
                                            <label>Paid Amount (Rs.)</label>
                                            <InputNumber value={paidAmount} onValueChange={(e) => setPaidAmount(e.value ?? DEFAULT_DATA_TYPE_VALUE.ZERO)} mode="decimal" minFractionDigits={2} max={totals.grandTotal} />
                                        </div>
                                        <div className="form-field">
                                            <label>Currency <span className="so-item-required">*</span></label>
                                            <Dropdown
                                                value={currency}
                                                onChange={(e) => setCurrency(e.value)}
                                                options={currencyOptions}
                                                valueTemplate={(option) => (option ? <span className="so-currency-value"><HiOutlineCurrencyRupee size={14} />{option}</span> : 'Select currency')}
                                                itemTemplate={(option) => <span className="so-currency-value"><HiOutlineCurrencyRupee size={14} />{option}</span>}
                                                disabled={isLocked}
                                            />
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
                            <div>
                                <div className="so-preview-label">Payment Terms</div>
                                <div>{paymentTerms || '—'}</div>
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
                style={{ width: '540px' }}
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

            <Dialog
                visible={!!dispatchInvoice}
                onHide={() => setDispatchInvoice(DEFAULT_DATA_TYPE_VALUE.NULL)}
                header="Dispatch Invoice"
                style={{ width: '720px', maxWidth: '95vw' }}
                footer={
                    <>
                        <Button label="Close" outlined onClick={() => setDispatchInvoice(DEFAULT_DATA_TYPE_VALUE.NULL)} />
                        <Button label="Print" icon={<HiOutlinePrinter className="mr-2" />} outlined onClick={() => dispatchInvoice && printSalesOrderInvoicePdf(dispatchInvoice, companyLogo)} />
                        <Button label="Download" icon={<HiOutlineArrowDownTray className="mr-2" />} onClick={() => dispatchInvoice && downloadSalesOrderInvoicePdf(dispatchInvoice, companyLogo)} />
                    </>
                }
            >
                {dispatchInvoice && (
                    <div className="so-invoice">
                        <div className="so-invoice-header">
                            <div>
                                <h3 className="so-invoice-title">{dispatchInvoice.customerName}</h3>
                                <span className="so-invoice-subtitle">#{dispatchInvoice.soNo}</span>
                            </div>
                            <span className={`so-preview-status so-preview-status--${dispatchInvoice.status.toLowerCase().replace(/\s+/g, '-')}`}>{dispatchInvoice.status}</span>
                        </div>
                        <table className="so-invoice-table">
                            <thead>
                                <tr>
                                    <th>Item</th>
                                    <th>Qty</th>
                                    <th>Rate</th>
                                    <th>Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                {dispatchInvoice.items.map((item) => (
                                    <tr key={item.skuId}>
                                        <td>{item.itemName}</td>
                                        <td>{item.orderedQty} {item.unit}</td>
                                        <td>Rs. {item.unitPrice.toLocaleString('en-IN')}</td>
                                        <td>Rs. {(item.orderedQty * item.unitPrice).toLocaleString('en-IN')}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        <div className="so-invoice-totals">
                            <div><span>Sub Total</span><span>Rs. {dispatchInvoice.subTotal.toLocaleString('en-IN')}</span></div>
                            <div><span>Discount</span><span className="so-discount-value">- Rs. {dispatchInvoice.discountAmount.toLocaleString('en-IN')}</span></div>
                            <div><span>GST</span><span>Rs. {dispatchInvoice.gstAmount.toLocaleString('en-IN')}</span></div>
                        </div>
                        <div className="so-invoice-grand-total"><span>Grand Total</span><span>Rs. {dispatchInvoice.grandTotal.toLocaleString('en-IN')}</span></div>
                    </div>
                )}
            </Dialog>
        </div>
    );
};
export default SalesOrderForm;
