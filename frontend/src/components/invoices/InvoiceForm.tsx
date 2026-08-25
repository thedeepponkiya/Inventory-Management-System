import { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { InputTextarea } from 'primereact/inputtextarea';
import { InputNumber } from 'primereact/inputnumber';
import { Dropdown } from 'primereact/dropdown';
import { Calendar } from 'primereact/calendar';
import { Toast } from 'primereact/toast';
import { HiOutlineArrowLeft, HiOutlineCheckCircle } from 'react-icons/hi2';
import { AppContext } from '../../context/AppContextDefinition';
import {
    createInvoice,
    updateInvoice,
    type Invoice as InvoiceType,
    type InvoicePayload,
    type InvoiceType as InvoiceTypeEnum,
    type PaymentStatus,
} from '../../services/invoiceService';
import { DEFAULT_DATA_TYPE_VALUE } from '../../common/constants/commonConstant';
import { showToast } from '../../common/commonFunctions/commonFunction';
import CustomFieldsSection from '../../common/commonComponents/customFieldsSection/CustomFieldsSection';
import './InvoiceForm.css';

const invoiceTypeOptions: InvoiceTypeEnum[] = ['Purchase', 'Sales'];
const paymentTermsOptions = ['Net 15', 'Net 30', 'Net 45', 'Net 60', 'Advance', 'COD'];
const paymentStatusOptions: PaymentStatus[] = ['Unpaid', 'Partial', 'Paid'];

const toIso = (date: Date | null): string | null => (date ? date.toISOString().slice(0, 10) : DEFAULT_DATA_TYPE_VALUE.NULL);

const InvoiceForm = () => {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const isEditRoute = Boolean(id);
    const { invoices, invoicesLoading, fetchInvoices } = useContext(AppContext);
    const toast = useRef<Toast>(DEFAULT_DATA_TYPE_VALUE.NULL);

    const existingInvoice = useMemo(
        () => (isEditRoute ? (invoices as InvoiceType[]).find((inv) => inv.id === Number(id)) : DEFAULT_DATA_TYPE_VALUE.UNDEFINED),
        [isEditRoute, invoices, id],
    );

    const [loadedForId, setLoadedForId] = useState<number | null>(DEFAULT_DATA_TYPE_VALUE.NULL);
    const [currentInvoiceNo, setCurrentInvoiceNo] = useState(DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING);
    const [invoiceType, setInvoiceType] = useState<InvoiceTypeEnum>('Purchase');
    const [referenceNo, setReferenceNo] = useState(DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING);
    const [materialInwardNo, setMaterialInwardNo] = useState(DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING);
    const [customerSupplier, setCustomerSupplier] = useState(DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING);
    const [location, setLocation] = useState(DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING);
    const [totalQty, setTotalQty] = useState(DEFAULT_DATA_TYPE_VALUE.ZERO);
    const [subTotal, setSubTotal] = useState(DEFAULT_DATA_TYPE_VALUE.ZERO);
    const [createdBy, setCreatedBy] = useState(DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING);
    const [createdAt, setCreatedAt] = useState(DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING);

    const [invoiceDate, setInvoiceDate] = useState<Date | null>(new Date());
    const [dueDate, setDueDate] = useState<Date | null>(DEFAULT_DATA_TYPE_VALUE.NULL);
    const [paymentTerms, setPaymentTerms] = useState<string | null>(DEFAULT_DATA_TYPE_VALUE.NULL);
    const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('Unpaid');
    const [paidAmount, setPaidAmount] = useState(DEFAULT_DATA_TYPE_VALUE.ZERO);
    const [freightCharge, setFreightCharge] = useState(DEFAULT_DATA_TYPE_VALUE.ZERO);
    const [otherCharges, setOtherCharges] = useState(DEFAULT_DATA_TYPE_VALUE.ZERO);
    const [remarks, setRemarks] = useState(DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING);
    const [unitPrice, setUnitPrice] = useState(DEFAULT_DATA_TYPE_VALUE.ZERO);
    const [discountPercent, setDiscountPercent] = useState(DEFAULT_DATA_TYPE_VALUE.ZERO);
    const [gstPercent, setGstPercent] = useState(DEFAULT_DATA_TYPE_VALUE.ZERO);
    const [customFields, setCustomFields] = useState<Record<string, unknown>>({});

    useEffect(() => {
        if (existingInvoice && loadedForId !== existingInvoice.id) {
            // One-time sync of local form state once the async-loaded record arrives from
            // AppContext; guarded by loadedForId so it never re-runs for the same record.
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setCurrentInvoiceNo(existingInvoice.invoiceNo);
            setInvoiceType(existingInvoice.invoiceType);
            setReferenceNo(existingInvoice.referenceNo ?? DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING);
            setMaterialInwardNo(existingInvoice.materialInwardNo ?? DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING);
            setCustomerSupplier(existingInvoice.customerSupplier ?? DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING);
            setLocation(existingInvoice.location ?? DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING);
            setTotalQty(existingInvoice.totalQty);
            setSubTotal(existingInvoice.subTotal);
            setCreatedBy(existingInvoice.createdBy ?? DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING);
            setCreatedAt(existingInvoice.createdAt);
            setInvoiceDate(new Date(existingInvoice.invoiceDate));
            setDueDate(existingInvoice.dueDate ? new Date(existingInvoice.dueDate) : DEFAULT_DATA_TYPE_VALUE.NULL);
            setPaymentTerms(existingInvoice.paymentTerms);
            setPaymentStatus(existingInvoice.paymentStatus);
            setPaidAmount(existingInvoice.paidAmount);
            setFreightCharge(existingInvoice.freightCharge);
            setOtherCharges(existingInvoice.otherCharges);
            setRemarks(existingInvoice.remarks ?? DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING);
            setUnitPrice(existingInvoice.unitPrice);
            setDiscountPercent(existingInvoice.discountPercent);
            setGstPercent(existingInvoice.gstPercent);
            setCustomFields(existingInvoice.customFields ?? {});
            setLoadedForId(existingInvoice.id);
        }
    }, [existingInvoice, loadedForId]);

    // An invoice auto-generated from a Material Inward carries its source data (customer/
    // supplier, location, quantities, sub total) in read-only fields - locked once editing an
    // existing MI-sourced invoice, since those values must trace back to the real receipt. A
    // brand-new manual invoice (no Material Inward behind it) has no source to protect, so
    // those same fields stay editable while creating one.
    const isFromMaterialInward = isEditRoute && Boolean(existingInvoice?.materialInwardNo);

    const totals = useMemo(() => {
        const discountAmount = (subTotal * discountPercent) / 100;
        const taxable = subTotal - discountAmount;
        const gstAmount = (taxable * gstPercent) / 100;
        const grandTotal = subTotal - discountAmount + gstAmount + freightCharge + otherCharges;
        const dueAmount = grandTotal - paidAmount;
        return { discountAmount, gstAmount, grandTotal, dueAmount };
    }, [subTotal, discountPercent, gstPercent, freightCharge, otherCharges, paidAmount]);

    const handleCancel = () => {
        navigate('/invoices');
    };

    const handleSave = async () => {
        if (!invoiceDate) {
            showToast(toast, 'error', 'Error', 'Invoice Date is required');
            return;
        }

        const payload: InvoicePayload = {
            invoiceDate: toIso(invoiceDate) ?? DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING,
            invoiceType,
            referenceNo: referenceNo || DEFAULT_DATA_TYPE_VALUE.NULL,
            materialInwardNo: materialInwardNo || DEFAULT_DATA_TYPE_VALUE.NULL,
            customerSupplier: customerSupplier || DEFAULT_DATA_TYPE_VALUE.NULL,
            location: location || DEFAULT_DATA_TYPE_VALUE.NULL,
            totalQty,
            subTotal,
            unitPrice,
            discountPercent,
            discountAmount: totals.discountAmount,
            gstPercent,
            gstAmount: totals.gstAmount,
            freightCharge,
            otherCharges,
            grandTotal: totals.grandTotal,
            paidAmount,
            dueAmount: totals.dueAmount,
            dueDate: toIso(dueDate),
            paymentTerms,
            paymentStatus,
            remarks: remarks || DEFAULT_DATA_TYPE_VALUE.NULL,
            createdBy: createdBy || 'Admin User',
            customFields,
        };

        try {
            if (isEditRoute && existingInvoice) {
                await updateInvoice(existingInvoice.id, payload);
                showToast(toast, 'success', 'Updated', 'Invoice updated successfully');
            } else {
                await createInvoice(payload);
                showToast(toast, 'success', 'Created', 'Invoice created successfully');
            }
            fetchInvoices();
            navigate('/invoices');
        } catch (err) {
            showToast(toast, 'error', 'Error', err instanceof Error ? err.message : 'Something went wrong');
        }
    };

    if (isEditRoute && invoicesLoading) {
        return <div className="invoice-form-page">Loading invoice…</div>;
    }
    if (isEditRoute && !existingInvoice) {
        return <div className="invoice-form-page">Invoice not found.</div>;
    }

    return (
        <div className="invoice-form-page">
            <Toast ref={toast} />

            <div className="inv-form-toolbar">
                <div className="inv-form-toolbar-title">
                    <button type="button" className="inv-form-back-btn" onClick={handleCancel} aria-label="Back to invoices">
                        <HiOutlineArrowLeft size={18} />
                    </button>
                    <h2>{isEditRoute ? `Edit ${currentInvoiceNo}` : 'New Invoice'}</h2>
                </div>
                <div className="inv-form-toolbar-actions">
                    <Button label="Cancel" outlined onClick={handleCancel} />
                    <Button label="Save" icon={<HiOutlineCheckCircle className="mr-2" />} onClick={handleSave} />
                </div>
            </div>

            <div className="inv-form-layout">
                <div className="inv-form-main">
                    <div className="inv-form-section-label">Invoice Source</div>
                    <div className="invoice-form-grid">
                        <div className="form-field">
                            <label>Invoice No.</label>
                            <InputText value={isEditRoute ? currentInvoiceNo : 'Auto-generated on save'} disabled />
                        </div>
                        <div className="form-field">
                            <label>Invoice Type</label>
                            <Dropdown value={invoiceType} onChange={(e) => setInvoiceType(e.value)} options={invoiceTypeOptions} disabled={isFromMaterialInward} />
                        </div>
                        <div className="form-field">
                            <label>Reference No.</label>
                            <InputText value={referenceNo} onChange={(e) => setReferenceNo(e.target.value)} placeholder="PO / reference no." disabled={isFromMaterialInward} />
                        </div>
                        <div className="form-field">
                            <label>Material Inward No.</label>
                            <InputText value={materialInwardNo} onChange={(e) => setMaterialInwardNo(e.target.value)} disabled={isFromMaterialInward} />
                        </div>
                        <div className="form-field">
                            <label>Customer / Supplier</label>
                            <InputText value={customerSupplier} onChange={(e) => setCustomerSupplier(e.target.value)} disabled={isFromMaterialInward} />
                        </div>
                        <div className="form-field">
                            <label>Location</label>
                            <InputText value={location} onChange={(e) => setLocation(e.target.value)} disabled={isFromMaterialInward} />
                        </div>
                        <div className="form-field">
                            <label>Total Qty</label>
                            <InputNumber value={totalQty} onValueChange={(e) => setTotalQty(e.value ?? DEFAULT_DATA_TYPE_VALUE.ZERO)} disabled={isFromMaterialInward} />
                        </div>
                        <div className="form-field">
                            <label>Sub Total (Rs.)</label>
                            <InputNumber value={subTotal} onValueChange={(e) => setSubTotal(e.value ?? DEFAULT_DATA_TYPE_VALUE.ZERO)} mode="decimal" minFractionDigits={2} disabled={isFromMaterialInward} />
                        </div>
                        <div className="form-field">
                            <label>Created By</label>
                            <InputText value={createdBy} disabled />
                        </div>
                        <div className="form-field">
                            <label>Created At</label>
                            <InputText value={createdAt ? new Date(createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING} disabled />
                        </div>
                    </div>

                    <div className="inv-form-section-label">Billing Details</div>
                    <div className="invoice-form-grid">
                        <div className="form-field">
                            <label>Invoice Date *</label>
                            <Calendar value={invoiceDate} onChange={(e) => setInvoiceDate(e.value as Date)} dateFormat="dd/mm/yy" showIcon />
                        </div>
                        <div className="form-field">
                            <label>Due Date</label>
                            <Calendar value={dueDate} onChange={(e) => setDueDate(e.value as Date)} dateFormat="dd/mm/yy" showIcon />
                        </div>
                        <div className="form-field">
                            <label>Payment Terms</label>
                            <Dropdown value={paymentTerms} onChange={(e) => setPaymentTerms(e.value)} options={paymentTermsOptions} placeholder="Select payment terms" />
                        </div>
                        <div className="form-field">
                            <label>Payment Status</label>
                            <Dropdown value={paymentStatus} onChange={(e) => setPaymentStatus(e.value)} options={paymentStatusOptions} />
                        </div>
                        <div className="form-field">
                            <label>Paid Amount (Rs.)</label>
                            <InputNumber value={paidAmount} onValueChange={(e) => setPaidAmount(e.value ?? DEFAULT_DATA_TYPE_VALUE.ZERO)} mode="decimal" minFractionDigits={2} />
                        </div>
                        <div className="form-field">
                            <label>Unit Price (Rs.)</label>
                            <InputNumber value={unitPrice} onValueChange={(e) => setUnitPrice(e.value ?? DEFAULT_DATA_TYPE_VALUE.ZERO)} mode="decimal" minFractionDigits={2} />
                        </div>
                        <div className="form-field">
                            <label>Discount %</label>
                            <InputNumber value={discountPercent} onValueChange={(e) => setDiscountPercent(e.value ?? DEFAULT_DATA_TYPE_VALUE.ZERO)} suffix="%" />
                        </div>
                        <div className="form-field">
                            <label>Discount Amount (Rs.)</label>
                            <InputNumber value={totals.discountAmount} mode="decimal" minFractionDigits={2} disabled />
                        </div>
                        <div className="form-field">
                            <label>GST %</label>
                            <InputNumber value={gstPercent} onValueChange={(e) => setGstPercent(e.value ?? DEFAULT_DATA_TYPE_VALUE.ZERO)} suffix="%" />
                        </div>
                        <div className="form-field">
                            <label>Freight Charge (Rs.)</label>
                            <InputNumber value={freightCharge} onValueChange={(e) => setFreightCharge(e.value ?? DEFAULT_DATA_TYPE_VALUE.ZERO)} mode="decimal" minFractionDigits={2} />
                        </div>
                        <div className="form-field">
                            <label>Other Charges (Rs.)</label>
                            <InputNumber value={otherCharges} onValueChange={(e) => setOtherCharges(e.value ?? DEFAULT_DATA_TYPE_VALUE.ZERO)} mode="decimal" minFractionDigits={2} />
                        </div>
                        <div className="form-field invoice-form-full">
                            <label>Remarks</label>
                            <InputTextarea value={remarks} onChange={(e) => setRemarks(e.target.value)} rows={2} placeholder="Enter remarks (optional)" />
                        </div>
                    </div>

                    <CustomFieldsSection
                        entityKey="invoice"
                        values={customFields}
                        onChange={(columnName, value) => setCustomFields((prev) => ({ ...prev, [columnName]: value }))}
                    />
                </div>

                <div className="inv-preview-panel">
                    <div className="inv-preview-card">
                        <div className="inv-preview-header">
                            <div>
                                <div className="inv-preview-title">Invoice</div>
                                <div className="inv-preview-subtitle">#{isEditRoute ? currentInvoiceNo : 'Auto-generated'}</div>
                            </div>
                            <span className="inv-preview-status">{paymentStatus}</span>
                        </div>

                        <div className="inv-preview-section">
                            <div className="inv-preview-label">Customer / Supplier</div>
                            {customerSupplier ? <div>{customerSupplier}</div> : <div className="inv-preview-empty">Not set</div>}
                        </div>

                        {materialInwardNo && (
                            <div className="inv-preview-section">
                                <div className="inv-preview-label">Material Inward</div>
                                <div>{materialInwardNo}</div>
                            </div>
                        )}

                        <div className="inv-preview-dates">
                            <div>
                                <div className="inv-preview-label">Invoice Date</div>
                                <div>{invoiceDate ? invoiceDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}</div>
                            </div>
                            <div>
                                <div className="inv-preview-label">Due Date</div>
                                <div>{dueDate ? dueDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}</div>
                            </div>
                        </div>

                        <div className="inv-preview-totals">
                            <div><span>Sub Total</span><span>Rs. {subTotal.toLocaleString('en-IN')}</span></div>
                            <div><span>Discount</span><span>- Rs. {totals.discountAmount.toLocaleString('en-IN')}</span></div>
                            <div><span>GST</span><span>+ Rs. {totals.gstAmount.toLocaleString('en-IN')}</span></div>
                            <div><span>Freight</span><span>+ Rs. {freightCharge.toLocaleString('en-IN')}</span></div>
                            <div><span>Other Charges</span><span>+ Rs. {otherCharges.toLocaleString('en-IN')}</span></div>
                            <div className="inv-preview-grand-total"><span>Grand Total</span><span>Rs. {totals.grandTotal.toLocaleString('en-IN')}</span></div>
                            <div><span>Paid</span><span>Rs. {paidAmount.toLocaleString('en-IN')}</span></div>
                            <div><span>Due</span><span>Rs. {totals.dueAmount.toLocaleString('en-IN')}</span></div>
                        </div>

                        {remarks && (
                            <div className="inv-preview-remarks">
                                <div className="inv-preview-label">Remarks</div>
                                <div>{remarks}</div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
export default InvoiceForm;
