import { useContext, useMemo, useRef, useState } from 'react';
import type { MouseEvent } from 'react';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { InputNumber } from 'primereact/inputnumber';
import { Dropdown } from 'primereact/dropdown';
import { Dialog } from 'primereact/dialog';
import { Toast } from 'primereact/toast';
import { Menu } from 'primereact/menu';
import { confirmDialog } from 'primereact/confirmdialog';
import {
    HiOutlinePlus,
    HiOutlineCheckCircle,
    HiOutlinePrinter,
    HiOutlineArrowDownTray,
    HiOutlineTrash,
    HiOutlineArrowUturnLeft,
    HiOutlineExclamationTriangle,
    HiOutlineCheckBadge,
    HiOutlineArrowPath,
} from 'react-icons/hi2';
import FilterBar, { type FilterField } from '../../common/commonComponents/filterBar/FilterBar';
import DataTable from '../../common/commonComponents/dataTable/DataTable';
import { AppContext } from '../../context/AppContextDefinition';
import { useCompanyLogoContext } from '../../context/CompanyLogoContextDefinition';
import { useCompanySettingsContext } from '../../context/CompanySettingsContextDefinition';
import { useDateFormatContext } from '../../context/DateFormatContextDefinition';
import { createBom, updateBom, deleteBom, revertBomToProcess, completeBom, getNextBomCode, type Bom as BomType, type BomItem, type BomPayload } from '../../services/bomService';
import type { InventoryItem } from '../../services/inventoryService';
import type { RawSku } from '../../services/rawSkuService';
import type { Unit } from '../../services/unitService';
import { DEFAULT_DATA_TYPE_VALUE } from '../../common/constants/commonConstant';
import { getBomColumns, getBomItemColumns, type BomItemRow } from '../../common/commonFunctions/CommonUtilities';
import { showToast } from '../../common/commonFunctions/commonFunction';
import { useBulkDelete } from '../../common/commonFunctions/useBulkDelete';
import { downloadBomPdf, printBomPdf } from '../../common/commonFunctions/bomPdf';
import './Bom.css';

let nextBomItemRowId = 1;
const rowsFromItems = (items: BomItem[]): BomItemRow[] => items.map((item) => ({ ...item, rowId: nextBomItemRowId++ }));

interface BomForm {
    productSku: string;
    productName: string;
    categoryName: string | null;
    outputQty: number;
    unit: string;
    status: 'Process' | 'Completed';
}

// Category is still captured (auto-derived from the selected Product) and Version stays
// fixed at '1.0' - neither is user-editable anymore, but BomPayload still requires them.
const BOM_VERSION = '1.0';

interface StockShortfall {
    name: string;
    needed: number;
    available: number;
    unit: string;
}

const emptyForm: BomForm = {
    productSku: DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING,
    productName: DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING,
    categoryName: DEFAULT_DATA_TYPE_VALUE.NULL,
    outputQty: 1,
    unit: 'PCS',
    status: 'Process',
};

const Bom = () => {
    const { boms, bomsLoading, fetchBoms, inventories, fetchInventories, rawSkus, fetchRawSkus, units } = useContext(AppContext);
    const { companyLogo } = useCompanyLogoContext();
    const { companyName, address } = useCompanySettingsContext();
    const { dateFormat } = useDateFormatContext();
    const toast = useRef<Toast>(DEFAULT_DATA_TYPE_VALUE.NULL);
    const [filters, setFilters] = useState<Record<string, unknown>>({ search: DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING });
    const [panelVisible, setPanelVisible] = useState(DEFAULT_DATA_TYPE_VALUE.FALSE);
    const [form, setForm] = useState<BomForm>(emptyForm);
    const [items, setItems] = useState<BomItemRow[]>([]);
    const [editingId, setEditingId] = useState<number | null>(DEFAULT_DATA_TYPE_VALUE.NULL);
    const [editingBomCode, setEditingBomCode] = useState(DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING);
    const [previewBomCode, setPreviewBomCode] = useState(DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING);
    const [recipeBom, setRecipeBom] = useState<BomType | null>(DEFAULT_DATA_TYPE_VALUE.NULL);
    const [stockErrors, setStockErrors] = useState<StockShortfall[]>([]);
    const menuRef = useRef<Menu>(DEFAULT_DATA_TYPE_VALUE.NULL);
    const menuTargetRef = useRef<SVGElement | null>(DEFAULT_DATA_TYPE_VALUE.NULL);
    const [menuBom, setMenuBom] = useState<BomType | null>(DEFAULT_DATA_TYPE_VALUE.NULL);

    const filterFields: FilterField[] = [
        { key: 'search', type: 'search', label: 'Search', placeholder: 'Search by BOM code / product name' },
    ];

    const filteredBoms = useMemo(() => {
        const search = (filters.search as string)?.toLowerCase() ?? DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING;
        return (boms as BomType[]).filter((bom) => {
            return !search || bom.bomCode.toLowerCase().includes(search) || bom.productName.toLowerCase().includes(search);
        });
    }, [boms, filters]);

    const openAddDialog = async () => {
        setEditingId(DEFAULT_DATA_TYPE_VALUE.NULL);
        setEditingBomCode(DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING);
        setForm(emptyForm);
        setItems([]);
        setStockErrors([]);
        setPanelVisible(DEFAULT_DATA_TYPE_VALUE.TRUE);
        try {
            setPreviewBomCode(await getNextBomCode());
        } catch {
            setPreviewBomCode(DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING);
        }
    };

    const openEditDialog = (bom: BomType) => {
        setEditingId(bom.id);
        setEditingBomCode(bom.bomCode);
        setForm({
            productSku: bom.productSku,
            productName: bom.productName,
            categoryName: bom.categoryName,
            outputQty: bom.outputQty,
            unit: bom.unit,
            status: bom.status,
        });
        setItems(rowsFromItems(bom.items));
        setStockErrors([]);
        setPanelVisible(DEFAULT_DATA_TYPE_VALUE.TRUE);
    };

    const handleSave = async () => {
        if (!form.productSku) {
            showToast(toast, 'error', 'Error', 'Please select a Product');
            return;
        }

        if (items.length === 0) {
            showToast(toast, 'warn', 'Warning', 'Please add at least one SKU');
            return;
        }

        // Blocks saving a BOM that needs more of a Raw SKU than is actually in stock -
        // dispatching it later would deduct more than is available. Checked against live
        // rawSkus, not a frozen snapshot, so this stays accurate as stock changes.
        const rawSkuList = rawSkus as RawSku[];
        const insufficientItems = items
            .map((item) => {
                const sku = rawSkuList.find((s) => s.skuCode === item.rawSkuCode);
                const needed = item.requiredQty * form.outputQty;
                return sku && needed > sku.currentStock
                    ? { name: item.rawSkuName, needed: Number(needed.toFixed(2)), available: sku.currentStock, unit: item.unit }
                    : null;
            })
            .filter((entry): entry is NonNullable<typeof entry> => entry !== null);

        setStockErrors(insufficientItems);
        if (insufficientItems.length > 0) {
            return;
        }

        const payload: BomPayload = {
            // Only sent on create - reuses the code already previewed in this dialog so it
            // matches what actually gets saved (random codes, unlike the old sequential ones,
            // would otherwise differ between preview and save if each were generated fresh).
            ...(editingId ? {} : { bomCode: previewBomCode }),
            productSku: form.productSku,
            productName: form.productName,
            categoryName: form.categoryName,
            version: BOM_VERSION,
            outputQty: form.outputQty,
            unit: form.unit,
            status: form.status,
            items: items.map(({ rawSkuCode, rawSkuName, requiredQty, unit, remarks }) => ({
                rawSkuCode,
                rawSkuName,
                requiredQty,
                unit,
                remarks,
            })),
            createdBy: 'Admin User',
        };

        try {
            const saved = editingId ? await updateBom(editingId, payload) : await createBom(payload);
            showToast(toast, 'success', editingId ? 'Updated' : 'Created', `BOM ${editingId ? 'updated' : 'created'} successfully`);
            fetchBoms();
            setForm(emptyForm);
            setItems([]);
            setEditingId(DEFAULT_DATA_TYPE_VALUE.NULL);
            setPanelVisible(DEFAULT_DATA_TYPE_VALUE.FALSE);
            setRecipeBom(saved);
        } catch (err) {
            showToast(toast, 'error', 'Error', err instanceof Error ? err.message : 'Something went wrong');
        }
    };

    const handleComplete = (bom: BomType) => {
        confirmDialog({
            message: `Mark BOM "${bom.bomCode}" as Completed? This deducts the required raw material quantities from stock and adds ${bom.outputQty} ${bom.unit} of "${bom.productName}" into Inventory stock.`,
            header: 'Mark as Completed',
            icon: 'pi pi-exclamation-triangle',
            accept: async () => {
                try {
                    await completeBom(bom.id);
                    fetchBoms();
                    fetchRawSkus();
                    fetchInventories();
                    showToast(toast, 'success', 'Completed', 'BOM completed - raw material and Inventory stock updated');
                } catch (err) {
                    showToast(toast, 'error', 'Error', err instanceof Error ? err.message : 'Something went wrong');
                }
            },
        });
    };

    const handleRevertToProcess = (bom: BomType) => {
        confirmDialog({
            message: `Revert BOM "${bom.bomCode}" back to Process? This restores the deducted raw material quantities and removes the ${bom.outputQty} ${bom.unit} added to Inventory stock.`,
            header: 'Revert to Process',
            icon: 'pi pi-exclamation-triangle',
            accept: async () => {
                try {
                    await revertBomToProcess(bom.id);
                    fetchBoms();
                    fetchRawSkus();
                    fetchInventories();
                    showToast(toast, 'success', 'Reverted', 'BOM reverted to Process - raw material and Inventory stock restored');
                } catch (err) {
                    showToast(toast, 'error', 'Error', err instanceof Error ? err.message : 'Something went wrong');
                }
            },
        });
    };

    const menuItems = [
        { label: 'Print', icon: 'pi pi-print', command: () => menuBom && printBomPdf(menuBom, companyLogo, { companyName, address }, rawSkus as RawSku[]) },
        { label: 'Download', icon: 'pi pi-download', command: () => menuBom && downloadBomPdf(menuBom, companyLogo, { companyName, address }, rawSkus as RawSku[]) },
    ];

    const columns = getBomColumns(dateFormat, openEditDialog);

    // Forces the Print/Download popup to always open below the trigger icon. PrimeReact's
    // own alignOverlay logic auto-flips the menu above the target when there isn't enough
    // viewport room underneath (e.g. rows near the bottom of the table), which is not
    // wanted here - the menu should always appear below the icon. Repositioning happens on
    // a 0ms setTimeout inside onShow, not synchronously, because onShow can fire before
    // PrimeReact's own alignOverlay effect has run; reading/writing position at that exact
    // moment races it (and loses, since Prime's positioning effect runs afterward and
    // overwrites ours). Deferring to a macrotask guarantees Prime's layout pass has finished.
    const openPrintMenu = (e: MouseEvent<SVGElement>, row: BomType) => {
        setMenuBom(row);
        menuTargetRef.current = e.currentTarget;
        menuRef.current?.toggle(e);
    };

    const repositionPrintMenu = () => {
        setTimeout(() => {
            const menuEl = menuRef.current?.getElement();
            const target = menuTargetRef.current;
            if (menuEl && target) {
                const targetRect = target.getBoundingClientRect();
                const top = targetRect.bottom + window.scrollY + 8;
                menuEl.style.top = `${top}px`;
            }
        }, 0);
    };

    const bomActionTemplate = (row: BomType) => (
        <div className="data-table-actions">
            {row.status === 'Process' && <HiOutlineCheckBadge size={20} color="#16a34a" title="Mark as Completed" onClick={() => handleComplete(row)} />}
            {row.status === 'Completed' && <HiOutlineArrowUturnLeft size={16} title="Revert to Process" onClick={() => handleRevertToProcess(row)} />}
            <HiOutlinePrinter size={16} title="Print or Download" onClick={(e) => openPrintMenu(e, row)} />
        </div>
    );

    const itemColumns = getBomItemColumns(items, form.outputQty, rawSkus as RawSku[]);

    const { selectedRows, setSelectedRows, handleBulkDelete, bulkDeleting } = useBulkDelete<BomType>({
        getId: (row) => row.id,
        deleteOne: deleteBom,
        onDeleted: fetchBoms,
        toast,
        entityNamePlural: 'BOMs',
        canDelete: (row) => row.status !== 'Completed',
        cannotDeleteMessage: 'Completed BOMs cannot be deleted - revert to Process first if you need to undo it.',
    });

    return (
        <div className="bom-page">
            <Toast ref={toast} />
            <Menu model={menuItems} popup ref={menuRef} onShow={repositionPrintMenu} className="bom-print-menu" />

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
                        <Button label="Add BOM" icon={<HiOutlinePlus className="mr-2" />} onClick={openAddDialog} outlined />
                    </>
                }
                trailingActions={
                    <Button icon={<HiOutlineArrowPath />} outlined size="small" onClick={fetchBoms} loading={bomsLoading} aria-label="Refresh" title="Refresh" />
                }
            />

            <DataTable
                value={filteredBoms}
                columns={columns}
                loading={bomsLoading}
                actionBodyTemplate={bomActionTemplate}
                selectable
                selection={selectedRows}
                onSelectionChange={setSelectedRows}
            />

            <Dialog
                visible={panelVisible}
                onHide={() => setPanelVisible(DEFAULT_DATA_TYPE_VALUE.FALSE)}
                header={editingId ? 'Edit BOM' : 'Add New BOM'}
                style={{ width: '960px', maxWidth: '95vw' }}
                footer={
                    <>
                        <Button label="Cancel" outlined onClick={() => { setPanelVisible(DEFAULT_DATA_TYPE_VALUE.FALSE); setStockErrors([]); }} />
                        <Button label="Save" icon={<HiOutlineCheckCircle className="mr-2" />} onClick={handleSave} />
                    </>
                }
            >
                <div className="bom-dialog-body">
                    {stockErrors.length > 0 && (
                        <div className="bom-stock-error-banner">
                            <div className="bom-stock-error-title">
                                <HiOutlineExclamationTriangle size={16} />
                                Insufficient Stock - cannot save this BOM
                            </div>
                            <ul className="bom-stock-error-list">
                                {stockErrors.map((entry) => (
                                    <li key={entry.name}>
                                        <strong>{entry.name}</strong>: need {entry.needed} {entry.unit}, have {entry.available} {entry.unit}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                    <div className="bom-form-section">
                        <h3 className="bom-form-section-title">Basic Information</h3>
                        <div className="bom-dialog-grid">
                            <div className="form-field">
                                <label>BOM Code</label>
                                <InputText value={editingId ? editingBomCode : (previewBomCode || 'Generating...')} disabled />
                            </div>
                            <div className="form-field">
                                <label>Product *</label>
                                <Dropdown
                                    value={form.productSku || DEFAULT_DATA_TYPE_VALUE.NULL}
                                    onChange={(e) => {
                                        const product = (inventories as InventoryItem[]).find((item) => item.skuId === e.value);
                                        setForm({
                                            ...form,
                                            productSku: e.value,
                                            productName: product?.productName ?? DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING,
                                            categoryName: product?.categoryName ?? DEFAULT_DATA_TYPE_VALUE.NULL,
                                            unit: product?.unit ?? form.unit,
                                        });
                                        // Auto-populate Components from the selected product's own Product
                                        // Assembly (Inventory Home's kit definition) - each line's quantity
                                        // becomes the per-unit Required Qty, which Qty Needed then scales by
                                        // Output Qty automatically. Unit comes from the assembly line itself
                                        // (what the user picked in Product Assembly), not re-derived from the
                                        // Raw SKU's own master unit - the two can legitimately differ.
                                        const autoItems: BomItem[] = (product?.assembly ?? []).map((line) => ({
                                            rawSkuCode: line.skuCode,
                                            rawSkuName: line.skuName,
                                            requiredQty: line.quantity,
                                            unit: line.unit || (rawSkus as RawSku[]).find((s) => s.skuCode === line.skuCode)?.unit || 'PCS',
                                            remarks: DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING,
                                        }));
                                        setItems(rowsFromItems(autoItems));
                                    }}
                                    options={(inventories as InventoryItem[]).map((item) => ({ label: `${item.skuId} - ${item.productName}`, value: item.skuId }))}
                                    placeholder="Select product"
                                    filter
                                />
                            </div>
                            <div className="form-field">
                                <label>Output Qty</label>
                                <InputNumber value={form.outputQty} onValueChange={(e) => setForm({ ...form, outputQty: e.value ?? DEFAULT_DATA_TYPE_VALUE.ZERO })} min={0} />
                            </div>
                            <div className="form-field">
                                <label>Unit</label>
                                <Dropdown value={form.unit} onChange={(e) => setForm({ ...form, unit: e.value })} options={(units as Unit[]).map((u) => u.unit)} placeholder="Select unit" />
                            </div>
                        </div>
                    </div>

                    <div className="bom-form-section">
                        <div className="bom-items-header">
                            <div>
                                <h3 className="bom-form-section-title">Components</h3>
                                <span className="bom-items-subtitle">Finished SKUs required to produce {form.outputQty || 0} {form.unit} of this product - Qty Needed scales automatically.</span>
                            </div>
                        </div>
                        <DataTable
                            // Keyed on outputQty so the "Qty Needed" column - which depends on
                            // outputQty but not on `items` itself - is guaranteed to re-render
                            // even when PrimeReact's DataTable would otherwise skip it because
                            // the `items` array reference didn't change.
                            key={form.outputQty}
                            value={items}
                            columns={itemColumns}
                            paginator
                            rows={5}
                            sortable={false}
                            filterable={false}
                            dataKey="rowId"
                            emptyMessage="No components added yet."
                        />
                    </div>
                </div>
            </Dialog>

            <Dialog
                visible={!!recipeBom}
                onHide={() => setRecipeBom(DEFAULT_DATA_TYPE_VALUE.NULL)}
                header="BOM Recipe"
                style={{ width: '720px', maxWidth: '95vw' }}
                footer={
                    <>
                        <Button label="Close" outlined onClick={() => setRecipeBom(DEFAULT_DATA_TYPE_VALUE.NULL)} />
                        <Button label="Print" icon={<HiOutlinePrinter className="mr-2" />} outlined onClick={() => recipeBom && printBomPdf(recipeBom, companyLogo, { companyName, address }, rawSkus as RawSku[])} />
                        <Button label="Download" icon={<HiOutlineArrowDownTray className="mr-2" />} onClick={() => recipeBom && downloadBomPdf(recipeBom, companyLogo, { companyName, address }, rawSkus as RawSku[])} />
                    </>
                }
            >
                {recipeBom && (
                    <div className="bom-recipe">
                        <div className="bom-recipe-header">
                            <div>
                                <h3 className="bom-recipe-title">
                                    {recipeBom.productName} <span className="bom-recipe-sku">({recipeBom.productSku})</span>
                                </h3>
                                <span className="bom-recipe-subtitle">{recipeBom.bomCode}</span>
                            </div>
                            <div className="bom-recipe-output">
                                <span className="bom-recipe-output-label">Output</span>
                                <span className="bom-recipe-output-value">{recipeBom.outputQty} {recipeBom.unit}</span>
                            </div>
                        </div>
                        <table className="bom-recipe-table">
                            <thead>
                                <tr>
                                    <th>Raw SKU</th>
                                    <th>Required Qty</th>
                                    <th>Qty Needed</th>
                                    <th>Remarks</th>
                                </tr>
                            </thead>
                            <tbody>
                                {recipeBom.items.map((item) => (
                                    <tr key={item.rawSkuCode}>
                                        <td>{item.rawSkuCode} - {item.rawSkuName}</td>
                                        <td>{item.requiredQty} {item.unit}</td>
                                        <td className="bom-recipe-qty-needed">
                                            {Number((item.requiredQty * recipeBom.outputQty).toFixed(2))} {item.unit}
                                        </td>
                                        <td>{item.remarks || '—'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </Dialog>
        </div>
    );
};
export default Bom;
