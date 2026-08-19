import { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { InputTextarea } from 'primereact/inputtextarea';
import { InputNumber } from 'primereact/inputnumber';
import { Dropdown } from 'primereact/dropdown';
import { Calendar } from 'primereact/calendar';
import { TabView, TabPanel } from 'primereact/tabview';
import { Dialog } from 'primereact/dialog';
import { Toast } from 'primereact/toast';
import { HiOutlineCheckCircle, HiOutlineTruck, HiOutlineShoppingBag } from 'react-icons/hi2';
import DataTable from '../../common/commonComponents/dataTable/DataTable';
import DialogHeader from '../../common/commonComponents/dialogHeader/DialogHeader';
import QuickAddDropdown from '../../common/commonComponents/quickAddDropdown/QuickAddDropdown';
import { AppContext } from '../../context/AppContextDefinition';
import { useDateFormatContext } from '../../context/DateFormatContextDefinition';
import {
    createMaterialInward,
    updateMaterialInward,
    type MaterialInward as MaterialInwardType,
    type MaterialInwardItem,
    type MaterialInwardPayload,
} from '../../services/materialInwardService';
import type { PurchaseOrder as PurchaseOrderType } from '../../services/purchaseOrderService';
import type { Vendor } from '../../services/vendorService';
import type { Location as LocationType } from '../../services/locationService';
import type { RawSku } from '../../services/rawSkuService';
import { DEFAULT_DATA_TYPE_VALUE } from '../../common/constants/commonConstant';
import { getMaterialInwardItemColumns, type MaterialInwardItemRow } from '../../common/commonFunctions/CommonUtilities';
import { showToast } from '../../common/commonFunctions/commonFunction';
import './MaterialInwardForm.css';

let nextItemRowId = 1;

interface ItemForm {
    skuCode: string;
    itemName: string;
    unit: string;
    orderedQty: number;
    receivedQty: number;
    acceptedQty: number;
    rejectedQty: number;
    unitPrice: number;
    discountPercent: number;
    gstPercent: number;
    batchNo: string;
    expiryDate: Date | null;
    remarks: string;
}

const emptyItemForm = (): ItemForm => ({
    skuCode: DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING,
    itemName: DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING,
    unit: DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING,
    orderedQty: DEFAULT_DATA_TYPE_VALUE.ZERO,
    receivedQty: DEFAULT_DATA_TYPE_VALUE.ZERO,
    acceptedQty: DEFAULT_DATA_TYPE_VALUE.ZERO,
    rejectedQty: DEFAULT_DATA_TYPE_VALUE.ZERO,
    unitPrice: DEFAULT_DATA_TYPE_VALUE.ZERO,
    discountPercent: DEFAULT_DATA_TYPE_VALUE.ZERO,
    gstPercent: DEFAULT_DATA_TYPE_VALUE.ZERO,
    batchNo: DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING,
    expiryDate: DEFAULT_DATA_TYPE_VALUE.NULL,
    remarks: DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING,
});

const toIso = (date: Date | null): string | null => (date ? date.toISOString() : DEFAULT_DATA_TYPE_VALUE.NULL);

interface MaterialInwardFormProps {
    editingId: number | null;
    onHide: () => void;
}

const MaterialInwardForm = ({ editingId, onHide }: MaterialInwardFormProps) => {
    const isEditRoute = Boolean(editingId);
    const { vendors, locations, purchaseOrders, materialInwards, rawSkus, fetchMaterialInwards, fetchPurchaseOrders, fetchInvoices } = useContext(AppContext);
    const { dateFormat } = useDateFormatContext();
    const toast = useRef<Toast>(DEFAULT_DATA_TYPE_VALUE.NULL);

    const existingMi = useMemo(
        () => (isEditRoute ? (materialInwards as MaterialInwardType[]).find((mi) => mi.id === editingId) : DEFAULT_DATA_TYPE_VALUE.UNDEFINED),
        [isEditRoute, materialInwards, editingId],
    );

    const [activeTab, setActiveTab] = useState(DEFAULT_DATA_TYPE_VALUE.ZERO);
    const [loadedForId, setLoadedForId] = useState<number | null>(DEFAULT_DATA_TYPE_VALUE.NULL);
    const [currentInwardNo, setCurrentInwardNo] = useState(DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING);
    const [purchaseOrderId, setPurchaseOrderId] = useState<number | null>(DEFAULT_DATA_TYPE_VALUE.NULL);
    const [vendorId, setVendorId] = useState<number | null>(DEFAULT_DATA_TYPE_VALUE.NULL);
    const [receivedDate, setReceivedDate] = useState<Date | null>(new Date());
    const [invoiceNo, setInvoiceNo] = useState(DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING);
    const [invoiceDate, setInvoiceDate] = useState<Date | null>(DEFAULT_DATA_TYPE_VALUE.NULL);
    const [challanNo, setChallanNo] = useState(DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING);
    const [vehicleNo, setVehicleNo] = useState(DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING);
    const [warehouseId, setWarehouseId] = useState<number | null>(DEFAULT_DATA_TYPE_VALUE.NULL);
    const [remarks, setRemarks] = useState(DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING);
    const [freightCharge, setFreightCharge] = useState(DEFAULT_DATA_TYPE_VALUE.ZERO);
    const [otherCharges, setOtherCharges] = useState(DEFAULT_DATA_TYPE_VALUE.ZERO);
    const [items, setItems] = useState<MaterialInwardItemRow[]>([]);

    const [itemDialogVisible, setItemDialogVisible] = useState(DEFAULT_DATA_TYPE_VALUE.FALSE);
    const [editingItemRowId, setEditingItemRowId] = useState<number | null>(DEFAULT_DATA_TYPE_VALUE.NULL);
    const [editingPreviousReceivedQty, setEditingPreviousReceivedQty] = useState(DEFAULT_DATA_TYPE_VALUE.ZERO);
    const [itemForm, setItemForm] = useState<ItemForm>(emptyItemForm());

    useEffect(() => {
        if (existingMi && loadedForId !== existingMi.id) {
            // One-time sync of local form state once the async-loaded record arrives from
            // AppContext; guarded by loadedForId so it never re-runs for the same record.
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setCurrentInwardNo(existingMi.inwardNo);
            setPurchaseOrderId(existingMi.purchaseOrderId);
            setVendorId(existingMi.vendorId);
            setReceivedDate(new Date(existingMi.receivedDate));
            setInvoiceNo(existingMi.invoiceNo ?? DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING);
            setInvoiceDate(existingMi.invoiceDate ? new Date(existingMi.invoiceDate) : DEFAULT_DATA_TYPE_VALUE.NULL);
            setChallanNo(existingMi.challanNo ?? DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING);
            setVehicleNo(existingMi.vehicleNo ?? DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING);
            setWarehouseId(existingMi.warehouseId);
            setRemarks(existingMi.remarks ?? DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING);
            setFreightCharge(existingMi.freightCharge);
            setOtherCharges(existingMi.otherCharges);
            setItems(existingMi.items.map((item) => ({ ...item, rowId: nextItemRowId++ })));
            setLoadedForId(existingMi.id);
        }
    }, [existingMi, loadedForId]);

    const updateItem = (rowId: number, patch: Partial<MaterialInwardItemRow>) => {
        setItems((prev) => prev.map((item) => (item.rowId === rowId ? { ...item, ...patch } : item)));
    };

    const handlePurchaseOrderChange = (poId: number | null) => {
        setPurchaseOrderId(poId);
        if (!poId) return;

        const po = (purchaseOrders as PurchaseOrderType[]).find((p) => p.id === poId);
        if (!po) return;

        setVendorId(po.vendorId);

        const newItems: MaterialInwardItemRow[] = po.items.map((poItem) => {
            const previousReceivedQty = (materialInwards as MaterialInwardType[])
                .filter((mi) => mi.purchaseOrderId === poId && (!isEditRoute || mi.id !== existingMi?.id))
                .flatMap((mi) => mi.items)
                .filter((item) => item.itemName === poItem.itemName)
                .reduce((sum, item) => sum + item.receivedQty, DEFAULT_DATA_TYPE_VALUE.ZERO);
            const receivedQty = Math.max(poItem.orderedQty - previousReceivedQty, DEFAULT_DATA_TYPE_VALUE.ZERO);
            // Accepted defaults to the full received qty until the user does a QC split in the
            // item dialog, so pricing (based on acceptedQty, not receivedQty - rejected goods
            // aren't billed) starts out identical to the old received-based total.
            const acceptedQty = receivedQty;
            const lineGross = acceptedQty * poItem.unitPrice;
            const lineDiscount = (lineGross * poItem.discountPercent) / 100;
            const taxable = lineGross - lineDiscount;
            const lineGst = (taxable * poItem.gstPercent) / 100;

            return {
                rowId: nextItemRowId++,
                skuId: poItem.skuId,
                skuCode: poItem.skuCode,
                itemName: poItem.itemName,
                unit: poItem.unit,
                orderedQty: poItem.orderedQty,
                previousReceivedQty,
                receivedQty,
                pendingQty: poItem.orderedQty - previousReceivedQty - receivedQty,
                acceptedQty,
                rejectedQty: DEFAULT_DATA_TYPE_VALUE.ZERO,
                unitPrice: poItem.unitPrice,
                discountPercent: poItem.discountPercent,
                discountAmount: lineDiscount,
                gstPercent: poItem.gstPercent,
                gstAmount: lineGst,
                lineTotal: taxable + lineGst,
                batchNo: DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING,
                expiryDate: DEFAULT_DATA_TYPE_VALUE.NULL,
                remarks: DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING,
            };
        });
        setItems(newItems);
    };

    const openEditItemDialog = (row: MaterialInwardItemRow) => {
        setEditingItemRowId(row.rowId);
        setEditingPreviousReceivedQty(row.previousReceivedQty);
        setItemForm({
            skuCode: row.skuCode,
            itemName: row.itemName,
            unit: row.unit,
            orderedQty: row.orderedQty,
            receivedQty: row.receivedQty,
            acceptedQty: row.acceptedQty,
            rejectedQty: row.rejectedQty,
            unitPrice: row.unitPrice,
            discountPercent: row.discountPercent,
            gstPercent: row.gstPercent,
            batchNo: row.batchNo,
            expiryDate: row.expiryDate ? new Date(row.expiryDate) : DEFAULT_DATA_TYPE_VALUE.NULL,
            remarks: row.remarks,
        });
        setItemDialogVisible(DEFAULT_DATA_TYPE_VALUE.TRUE);
    };

    const handleItemDialogSave = () => {
        if (!itemForm.itemName.trim()) {
            showToast(toast, 'error', 'Error', 'Select a raw material');
            return;
        }
        if (itemForm.receivedQty <= 0) {
            showToast(toast, 'error', 'Error', 'Received quantity must be greater than 0');
            return;
        }
        if (purchaseOrderId) {
            const pendingAvailable = itemForm.orderedQty - editingPreviousReceivedQty;
            if (itemForm.receivedQty > pendingAvailable) {
                showToast(toast, 'error', 'Error', `Received quantity cannot exceed pending quantity (${pendingAvailable})`);
                return;
            }
        }
        if (itemForm.acceptedQty + itemForm.rejectedQty !== itemForm.receivedQty) {
            showToast(toast, 'error', 'Error', 'Accepted Qty + Rejected Qty must equal Received Qty');
            return;
        }

        // Priced off acceptedQty, not receivedQty - rejected goods are returned to the vendor
        // and shouldn't be billed for.
        const lineGross = itemForm.acceptedQty * itemForm.unitPrice;
        const discountAmount = (lineGross * itemForm.discountPercent) / 100;
        const taxable = lineGross - discountAmount;
        const gstAmount = (taxable * itemForm.gstPercent) / 100;
        const sku = (rawSkus as RawSku[]).find((s) => s.skuCode === itemForm.skuCode);
        const computed = {
            skuId: sku ? String(sku.id) : itemForm.skuCode,
            skuCode: itemForm.skuCode,
            itemName: itemForm.itemName,
            unit: itemForm.unit,
            orderedQty: itemForm.orderedQty,
            previousReceivedQty: editingPreviousReceivedQty,
            receivedQty: itemForm.receivedQty,
            pendingQty: itemForm.orderedQty - editingPreviousReceivedQty - itemForm.receivedQty,
            acceptedQty: itemForm.acceptedQty,
            rejectedQty: itemForm.rejectedQty,
            unitPrice: itemForm.unitPrice,
            discountPercent: itemForm.discountPercent,
            discountAmount,
            gstPercent: itemForm.gstPercent,
            gstAmount,
            lineTotal: taxable + gstAmount,
            batchNo: itemForm.batchNo,
            expiryDate: toIso(itemForm.expiryDate),
            remarks: itemForm.remarks,
        };

        if (editingItemRowId) {
            updateItem(editingItemRowId, computed);
        }
        setItemDialogVisible(DEFAULT_DATA_TYPE_VALUE.FALSE);
    };

    const totals = useMemo(() => {
        let totalQty = DEFAULT_DATA_TYPE_VALUE.ZERO;
        let subTotal = DEFAULT_DATA_TYPE_VALUE.ZERO;
        let discountAmount = DEFAULT_DATA_TYPE_VALUE.ZERO;
        let gstAmount = DEFAULT_DATA_TYPE_VALUE.ZERO;

        items.forEach((item) => {
            // Priced off acceptedQty, not receivedQty - rejected goods are returned to the
            // vendor and shouldn't be billed for.
            const lineGross = item.acceptedQty * item.unitPrice;
            const lineDiscount = (lineGross * item.discountPercent) / 100;
            const taxable = lineGross - lineDiscount;
            const lineGst = (taxable * item.gstPercent) / 100;

            totalQty += item.acceptedQty;
            subTotal += lineGross;
            discountAmount += lineDiscount;
            gstAmount += lineGst;
        });

        const grandTotal = subTotal - discountAmount + gstAmount + freightCharge + otherCharges;
        return { totalItems: items.length, totalQty, subTotal, discountAmount, gstAmount, grandTotal };
    }, [items, freightCharge, otherCharges]);

    const linkedPurchaseOrderIds = useMemo(
        () =>
            new Set(
                (materialInwards as MaterialInwardType[])
                    .filter((mi) => mi.purchaseOrderId !== null && (!isEditRoute || mi.id !== existingMi?.id))
                    .map((mi) => mi.purchaseOrderId),
            ),
        [materialInwards, isEditRoute, existingMi],
    );

    // A PO that already has a Material Inward against it is hidden from the dropdown so a
    // second inward can't be created for it here; the currently selected PO stays visible
    // so it keeps rendering correctly once picked (or when editing an existing inward).
    const eligiblePurchaseOrders = useMemo(
        () =>
            (purchaseOrders as PurchaseOrderType[]).filter(
                (po) => po.status !== 'Draft' && po.status !== 'Cancelled' && (po.id === purchaseOrderId || !linkedPurchaseOrderIds.has(po.id)),
            ),
        [purchaseOrders, linkedPurchaseOrderIds, purchaseOrderId],
    );

    const handleSave = async () => {
        if (!vendorId || !warehouseId || !receivedDate) {
            showToast(toast, 'error', 'Error', 'Vendor, Warehouse and Received Date are required');
            return;
        }
        if (!items.some((item) => item.itemName)) {
            showToast(toast, 'error', 'Error', 'Add at least one item');
            return;
        }

        const computedItems: MaterialInwardItem[] = items
            .filter((item) => item.itemName)
            .map((item) => {
                // Priced off acceptedQty, not receivedQty - rejected goods are returned to the
                // vendor and shouldn't be billed for.
                const lineGross = item.acceptedQty * item.unitPrice;
                const discountAmount = (lineGross * item.discountPercent) / 100;
                const taxable = lineGross - discountAmount;
                const gstAmount = (taxable * item.gstPercent) / 100;
                return {
                    skuId: item.skuId,
                    skuCode: item.skuCode,
                    itemName: item.itemName,
                    unit: item.unit,
                    orderedQty: item.orderedQty,
                    previousReceivedQty: item.previousReceivedQty,
                    receivedQty: item.receivedQty,
                    pendingQty: item.orderedQty - item.previousReceivedQty - item.receivedQty,
                    acceptedQty: item.acceptedQty,
                    rejectedQty: item.rejectedQty,
                    unitPrice: item.unitPrice,
                    discountPercent: item.discountPercent,
                    discountAmount,
                    gstPercent: item.gstPercent,
                    gstAmount,
                    lineTotal: taxable + gstAmount,
                    batchNo: item.batchNo,
                    expiryDate: item.expiryDate,
                    remarks: item.remarks,
                };
            });

        const selectedPo = purchaseOrderId ? (purchaseOrders as PurchaseOrderType[]).find((po) => po.id === purchaseOrderId) : DEFAULT_DATA_TYPE_VALUE.UNDEFINED;
        const selectedVendor = (vendors as Vendor[]).find((v) => v.id === vendorId);

        const payload: MaterialInwardPayload = {
            purchaseOrderId,
            purchaseOrderNo: selectedPo?.poNo ?? DEFAULT_DATA_TYPE_VALUE.NULL,
            vendorId,
            vendorName: selectedVendor?.vendorName ?? DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING,
            receivedDate: toIso(receivedDate) ?? DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING,
            invoiceNo: invoiceNo || DEFAULT_DATA_TYPE_VALUE.NULL,
            invoiceDate: toIso(invoiceDate),
            challanNo: challanNo || DEFAULT_DATA_TYPE_VALUE.NULL,
            vehicleNo: vehicleNo || DEFAULT_DATA_TYPE_VALUE.NULL,
            warehouseId,
            items: computedItems,
            totalItems: computedItems.length,
            totalQty: totals.totalQty,
            subTotal: totals.subTotal,
            discountAmount: totals.discountAmount,
            gstAmount: totals.gstAmount,
            freightCharge,
            otherCharges,
            grandTotal: totals.grandTotal,
            remarks: remarks || DEFAULT_DATA_TYPE_VALUE.NULL,
            receivedBy: 'Admin User',
        };

        try {
            if (isEditRoute && existingMi) {
                await updateMaterialInward(existingMi.id, payload);
                showToast(toast, 'success', 'Updated', 'Material inward updated successfully');
            } else {
                const { warning } = await createMaterialInward(payload);
                showToast(toast, 'success', 'Created', 'Material inward created successfully');
                if (warning) showToast(toast, 'warn', 'Invoice not generated', warning, 6000);
            }
            fetchMaterialInwards();
            // Saving an inward against a PO also updates that PO's received/pending qty and
            // status server-side (see materialInward.controller.js's resync) - without this,
            // AppContext's cached purchaseOrders stays stale until a manual page refresh.
            fetchPurchaseOrders();
            // Creating a Material Inward also auto-generates an Invoice server-side (see
            // materialInward.controller.js) - refetch so it shows up on /invoices immediately.
            if (!isEditRoute) fetchInvoices();
            onHide();
        } catch (err) {
            showToast(toast, 'error', 'Error', err instanceof Error ? err.message : 'Something went wrong');
        }
    };

    const isPoLinked = Boolean(purchaseOrderId);

    const itemColumns = getMaterialInwardItemColumns(items, dateFormat, openEditItemDialog);

    return (
        <Dialog
            visible
            onHide={onHide}
            className="mi-form-dialog"
            header={<DialogHeader icon={HiOutlineTruck} title={isEditRoute ? `Edit ${currentInwardNo}` : 'New Material Inward'} />}
            style={{ width: '960px', maxWidth: '96vw' }}
            footer={
                <>
                    <Button label="Cancel" outlined onClick={onHide} />
                    <Button label="Save" icon={<HiOutlineCheckCircle className="mr-2" />} onClick={handleSave} />
                </>
            }
        >
            <Toast ref={toast} />

            <TabView activeIndex={activeTab} onTabChange={(e) => setActiveTab(e.index)}>
                <TabPanel header="Inward Details">
                    <div className="material-inward-form-grid">
                        <div className="form-field">
                            <label>Inward No.</label>
                            <InputText value={isEditRoute ? currentInwardNo : 'Auto-generated on save'} disabled />
                        </div>
                        <div className="form-field">
                            <label>Purchase Order</label>
                            <Dropdown
                                value={purchaseOrderId}
                                onChange={(e) => handlePurchaseOrderChange(e.value)}
                                options={eligiblePurchaseOrders.map((po) => ({ label: `${po.poNo} — ${po.vendorName}`, value: po.id }))}
                                placeholder="Select purchase order (optional)"
                                filter
                                filterPlaceholder="Search purchase order"
                            />
                        </div>
                        <div className="form-field">
                            <label>Vendor *</label>
                            <QuickAddDropdown
                                quickAddType="vendor"
                                value={vendorId}
                                onChange={(e) => setVendorId(e.value)}
                                options={(vendors as Vendor[]).map((v) => ({ label: v.vendorName, value: v.id }))}
                                placeholder="Select vendor"
                                disabled={isPoLinked}
                            />
                        </div>
                        <div className="form-field">
                            <label>Warehouse *</label>
                            <QuickAddDropdown
                                quickAddType="location"
                                value={warehouseId}
                                onChange={(e) => setWarehouseId(e.value)}
                                options={(locations as LocationType[]).map((loc) => ({ label: loc.location, value: loc.id }))}
                                placeholder="Select warehouse"
                            />
                        </div>
                        <div className="form-field">
                            <label>Received Date *</label>
                            <Calendar value={receivedDate} onChange={(e) => setReceivedDate(e.value as Date)} dateFormat="dd/mm/yy" showIcon />
                        </div>
                        <div className="form-field">
                            <label>Invoice No.</label>
                            <InputText value={invoiceNo} onChange={(e) => setInvoiceNo(e.target.value)} placeholder="Enter invoice no." />
                        </div>
                        <div className="form-field">
                            <label>Invoice Date</label>
                            <Calendar value={invoiceDate} onChange={(e) => setInvoiceDate(e.value as Date)} dateFormat="dd/mm/yy" showIcon />
                        </div>
                        <div className="form-field">
                            <label>Challan No.</label>
                            <InputText value={challanNo} onChange={(e) => setChallanNo(e.target.value)} placeholder="Enter challan no." />
                        </div>
                        <div className="form-field">
                            <label>Vehicle No.</label>
                            <InputText value={vehicleNo} onChange={(e) => setVehicleNo(e.target.value)} placeholder="Enter vehicle no." />
                        </div>
                        <div className="form-field material-inward-form-full">
                            <label>Remarks</label>
                            <InputTextarea value={remarks} onChange={(e) => setRemarks(e.target.value)} rows={2} placeholder="Enter remarks (optional)" />
                        </div>
                    </div>
                </TabPanel>

                <TabPanel header="Items & Charges">
                    <div className="material-inward-items-header">
                        <h3>Inward Items</h3>
                    </div>
                    <DataTable
                        value={items}
                        columns={itemColumns}
                        paginator={false}
                        sortable={false}
                        filterable={false}
                        dataKey="rowId"
                        emptyMessage="No items added yet."
                    />

                    <div className="material-inward-form-grid material-inward-charges-grid">
                        <div className="form-field">
                            <label>Freight Charge (Rs.)</label>
                            <InputNumber value={freightCharge} onValueChange={(e) => setFreightCharge(e.value ?? DEFAULT_DATA_TYPE_VALUE.ZERO)} mode="decimal" minFractionDigits={2} />
                        </div>
                        <div className="form-field">
                            <label>Other Charges (Rs.)</label>
                            <InputNumber value={otherCharges} onValueChange={(e) => setOtherCharges(e.value ?? DEFAULT_DATA_TYPE_VALUE.ZERO)} mode="decimal" minFractionDigits={2} />
                        </div>
                    </div>
                </TabPanel>
            </TabView>

            <Dialog
                visible={itemDialogVisible}
                onHide={() => setItemDialogVisible(DEFAULT_DATA_TYPE_VALUE.FALSE)}
                header={<DialogHeader icon={HiOutlineShoppingBag} title="Edit Item" />}
                style={{ width: '480px', maxWidth: '95vw' }}
                footer={
                    <>
                        <Button label="Cancel" outlined onClick={() => setItemDialogVisible(DEFAULT_DATA_TYPE_VALUE.FALSE)} />
                        <Button label="Save" icon={<HiOutlineCheckCircle className="mr-2" />} onClick={handleItemDialogSave} />
                    </>
                }
            >
                <div className="dialog-form-body">
                    <div className="form-field">
                        <label>Raw Material *</label>
                        <Dropdown
                            value={itemForm.skuCode || DEFAULT_DATA_TYPE_VALUE.NULL}
                            onChange={(e) => {
                                const sku = (rawSkus as RawSku[]).find((s) => s.skuCode === e.value);
                                setItemForm({
                                    ...itemForm,
                                    skuCode: e.value,
                                    itemName: sku?.skuName ?? DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING,
                                    unit: sku?.unit ?? DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING,
                                });
                            }}
                            options={(rawSkus as RawSku[]).map((s) => ({ label: `${s.skuCode} - ${s.skuName}`, value: s.skuCode }))}
                            placeholder="Select raw material"
                            filter
                            disabled={isPoLinked}
                        />
                    </div>
                    {editingPreviousReceivedQty > 0 && (
                        <div className="mi-item-dialog-hint">Previously received: {editingPreviousReceivedQty}</div>
                    )}
                    <div className="form-field form-field--row">
                        <label>Ordered Qty</label>
                        <InputNumber value={itemForm.orderedQty} onValueChange={(e) => setItemForm({ ...itemForm, orderedQty: e.value ?? DEFAULT_DATA_TYPE_VALUE.ZERO })} disabled={isPoLinked} />
                    </div>
                    <div className="form-field form-field--row">
                        <label>Received Qty *</label>
                        <InputNumber
                            value={itemForm.receivedQty}
                            onValueChange={(e) => {
                                const receivedQty = e.value ?? DEFAULT_DATA_TYPE_VALUE.ZERO;
                                setItemForm((prev) => ({ ...prev, receivedQty, rejectedQty: Math.max(receivedQty - prev.acceptedQty, DEFAULT_DATA_TYPE_VALUE.ZERO) }));
                            }}
                        />
                    </div>
                    <div className="form-field form-field--row">
                        <label>Accepted Qty</label>
                        <InputNumber
                            value={itemForm.acceptedQty}
                            onValueChange={(e) => {
                                const acceptedQty = e.value ?? DEFAULT_DATA_TYPE_VALUE.ZERO;
                                setItemForm((prev) => ({ ...prev, acceptedQty, rejectedQty: Math.max(prev.receivedQty - acceptedQty, DEFAULT_DATA_TYPE_VALUE.ZERO) }));
                            }}
                        />
                    </div>
                    <div className="form-field form-field--row">
                        <label>Rejected Qty</label>
                        {/* Auto-filled from Received - Accepted whenever either changes above,
                            but still directly editable here in case the split isn't a clean
                            subtraction (e.g. some units are pending inspection). */}
                        <InputNumber value={itemForm.rejectedQty} onValueChange={(e) => setItemForm({ ...itemForm, rejectedQty: e.value ?? DEFAULT_DATA_TYPE_VALUE.ZERO })} />
                    </div>
                    <div className="form-field form-field--row">
                        <label>Unit Price (Rs.)</label>
                        <InputNumber value={itemForm.unitPrice} onValueChange={(e) => setItemForm({ ...itemForm, unitPrice: e.value ?? DEFAULT_DATA_TYPE_VALUE.ZERO })} mode="decimal" minFractionDigits={2} disabled={isPoLinked} />
                    </div>
                    <div className="form-field form-field--row">
                        <label>Discount %</label>
                        <InputNumber value={itemForm.discountPercent} onValueChange={(e) => setItemForm({ ...itemForm, discountPercent: e.value ?? DEFAULT_DATA_TYPE_VALUE.ZERO })} suffix="%" disabled={isPoLinked} />
                    </div>
                    <div className="form-field form-field--row">
                        <label>GST %</label>
                        <InputNumber value={itemForm.gstPercent} onValueChange={(e) => setItemForm({ ...itemForm, gstPercent: e.value ?? DEFAULT_DATA_TYPE_VALUE.ZERO })} suffix="%" disabled={isPoLinked} />
                    </div>
                    <div className="form-field">
                        <label>Batch No.</label>
                        <InputText value={itemForm.batchNo} onChange={(e) => setItemForm({ ...itemForm, batchNo: e.target.value })} placeholder="Enter batch no." />
                    </div>
                    <div className="form-field">
                        <label>Expiry Date</label>
                        <Calendar value={itemForm.expiryDate} onChange={(e) => setItemForm({ ...itemForm, expiryDate: e.value as Date })} dateFormat="dd/mm/yy" showIcon />
                    </div>
                    <div className="form-field">
                        <label>Remarks</label>
                        <InputText value={itemForm.remarks} onChange={(e) => setItemForm({ ...itemForm, remarks: e.target.value })} placeholder="Enter remarks (optional)" />
                    </div>
                </div>
            </Dialog>
        </Dialog>
    );
};
export default MaterialInwardForm;
