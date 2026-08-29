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
    HiOutlineTrash,
    HiOutlinePencilSquare,
    HiOutlineArrowPath,
    HiOutlineSquare3Stack3D,
    HiOutlineXCircle,
} from 'react-icons/hi2';
import { FaRegFilePdf } from 'react-icons/fa6';
import FilterBar, { type FilterField } from '../../common/commonComponents/filterBar/FilterBar';
import DataTable, { type DataTableHandle } from '../../common/commonComponents/dataTable/DataTable';
import DialogHeader from '../../common/commonComponents/dialogHeader/DialogHeader';
import CustomFieldsSection from '../../common/commonComponents/customFieldsSection/CustomFieldsSection';
import { AppContext } from '../../context/AppContextDefinition';
import { useCompanyLogoContext } from '../../context/CompanyLogoContextDefinition';
import { useCompanySettingsContext } from '../../context/CompanySettingsContextDefinition';
import { useDateFormatContext } from '../../context/DateFormatContextDefinition';
import { createBom, updateBom, deleteBom, completeBomItem, revertBomItem, getNextBomCode, type Bom as BomType, type BomItem, type BomPayload } from '../../services/bomService';
import type { InventoryItem, AssemblyLine } from '../../services/inventoryService';
import type { RawSku } from '../../services/rawSkuService';
import { DEFAULT_DATA_TYPE_VALUE } from '../../common/constants/commonConstant';
import { getBomColumns, getBomItemColumns, getBomItemExpansionColumns, type BomItemRow } from '../../common/commonFunctions/CommonUtilities';
import { showToast } from '../../common/commonFunctions/commonFunction';
import { useBulkDelete } from '../../common/commonFunctions/useBulkDelete';
import { useCustomFieldColumns } from '../../common/commonFunctions/useCustomFieldColumns';
import { useFieldLabels } from '../../common/commonFunctions/useFieldLabels';
import { downloadBomPdf, printBomPdf } from '../../common/commonFunctions/bomPdf';
import './Bom.css';

let nextBomItemRowId = 1;
const rowsFromItems = (items: BomItem[]): BomItemRow[] => items.map((item) => ({ ...item, rowId: nextBomItemRowId++ }));

// Version stays fixed at '1.0' - not user-editable, but BomPayload still requires it.
const BOM_VERSION = '1.0';

const Bom = () => {
    const { boms, bomsLoading, fetchBoms, inventories, fetchInventories, rawSkus, fetchRawSkus } = useContext(AppContext);
    const { companyLogo } = useCompanyLogoContext();
    const { companyName, address } = useCompanySettingsContext();
    const { dateFormat } = useDateFormatContext();
    const toast = useRef<Toast>(DEFAULT_DATA_TYPE_VALUE.NULL);
    const dataTableRef = useRef<DataTableHandle>(null);
    const [filters, setFilters] = useState<Record<string, unknown>>({ search: DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING });
    const [panelVisible, setPanelVisible] = useState(DEFAULT_DATA_TYPE_VALUE.FALSE);
    const [items, setItems] = useState<BomItemRow[]>([]);
    const [customFields, setCustomFields] = useState<Record<string, unknown>>({});
    const [editingId, setEditingId] = useState<number | null>(DEFAULT_DATA_TYPE_VALUE.NULL);
    const [editingBomCode, setEditingBomCode] = useState(DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING);
    const [previewBomCode, setPreviewBomCode] = useState(DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING);
    const menuRef = useRef<Menu>(DEFAULT_DATA_TYPE_VALUE.NULL);
    const menuTargetRef = useRef<SVGElement | null>(DEFAULT_DATA_TYPE_VALUE.NULL);
    const [menuBom, setMenuBom] = useState<BomType | null>(DEFAULT_DATA_TYPE_VALUE.NULL);
    // Add Item row (Items section) - which Inventory item + qty is about to be added as a new
    // line. Fully separate from anything else in this dialog - a BOM has no single Output
    // Product of its own anymore for this to double up as (see bomService.ts's Bom comment),
    // so there's no more reset-after-add confusion the way the old design had.
    const [componentSkuId, setComponentSkuId] = useState(DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING);
    const [componentQty, setComponentQty] = useState(1);
    // Set while editing an already-added Pending row (see handleEditComponent) - the Add
    // Item row's fields double as the edit form too, so this just changes what clicking the
    // button does (update that one row in place instead of adding/merging a new one) and
    // what its label says, rather than needing a whole separate edit UI.
    const [editingItemRowId, setEditingItemRowId] = useState<number | null>(DEFAULT_DATA_TYPE_VALUE.NULL);

    const filterFields: FilterField[] = [
        { key: 'search', type: 'search', label: 'Search', placeholder: 'Search by BOM code' },
    ];

    const filteredBoms = useMemo(() => {
        const search = (filters.search as string)?.toLowerCase() ?? DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING;
        return (boms as BomType[]).filter((bom) => {
            return !search || bom.bomCode.toLowerCase().includes(search);
        });
    }, [boms, filters]);

    const openAddDialog = async () => {
        setEditingId(DEFAULT_DATA_TYPE_VALUE.NULL);
        setEditingBomCode(DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING);
        setItems([]);
        setCustomFields({});
        setComponentSkuId(DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING);
        setComponentQty(1);
        setEditingItemRowId(DEFAULT_DATA_TYPE_VALUE.NULL);
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
        setItems(rowsFromItems(bom.items));
        setCustomFields(bom.customFields ?? {});
        setComponentSkuId(DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING);
        setComponentQty(1);
        setEditingItemRowId(DEFAULT_DATA_TYPE_VALUE.NULL);
        setPanelVisible(DEFAULT_DATA_TYPE_VALUE.TRUE);
    };

    // Once a BOM has any item Completed (status is no longer 'Process'), the whole BOM is
    // locked from further editing here - no renaming the BOM Code, no adding/editing/deleting
    // ANY item (even a still-Pending one), no custom fields. Production against this BOM has
    // already started; from this point on the only way to change it is per-item Complete/
    // Revert from the main list's own expanded row, never this dialog. A brand-new BOM
    // (editingId null) is never locked.
    const editingBom = editingId ? (boms as BomType[]).find((bom) => bom.id === editingId) : DEFAULT_DATA_TYPE_VALUE.UNDEFINED;
    const isBomLocked = Boolean(editingBom && editingBom.status !== 'Process');

    // Only ever called from a Pending row's own delete icon (see itemActionTemplate below) -
    // a Completed row has no delete icon to click in the first place, so this doesn't need its
    // own extra guard against removing one. Also backs out of editing that same row, if it
    // was the one open in the Add Item row above.
    const removeItem = (rowId: number) => {
        setItems((prev) => prev.filter((item) => item.rowId !== rowId));
        if (editingItemRowId === rowId) {
            setEditingItemRowId(DEFAULT_DATA_TYPE_VALUE.NULL);
            setComponentSkuId(DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING);
            setComponentQty(1);
        }
    };

    // Loads an already-added Pending row back into the Add Item row's own fields so its
    // Item/Qty can be changed - only ever reachable for Pending rows (see itemActionTemplate),
    // a Completed row must be reverted first (same reasoning as the merge-block below).
    const handleEditComponent = (row: BomItemRow) => {
        setEditingItemRowId(row.rowId);
        setComponentSkuId(row.skuId);
        setComponentQty(row.requiredQty);
    };

    const handleCancelEditComponent = () => {
        setEditingItemRowId(DEFAULT_DATA_TYPE_VALUE.NULL);
        setComponentSkuId(DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING);
        setComponentQty(1);
    };

    // Add Item row's button does double duty: with no row being edited, it pushes
    // componentSkuId/componentQty in as a new line (or merges into an existing Pending line
    // for the same Inventory item, summing requiredQty - same duplicate-merge convention as
    // Sales Order's Add Item dialog). While editingItemRowId is set (see handleEditComponent),
    // it instead overwrites that one row in place with whatever's now in the fields. Blocks
    // touching an already-Completed line outright either way - that represents stock that's
    // already actually moved, which only revertBomItem should ever be able to undo first.
    const handleAddComponent = () => {
        if (!componentSkuId) {
            showToast(toast, 'error', 'Error', 'Please select an Item');
            return;
        }
        if (!componentQty || componentQty <= 0) {
            showToast(toast, 'error', 'Error', 'Please enter a valid Qty');
            return;
        }
        if (items.some((item) => item.skuId === componentSkuId && item.status === 'Completed' && item.rowId !== editingItemRowId)) {
            showToast(toast, 'error', 'Error', 'This item is already Completed in this BOM - revert it first to change its qty');
            return;
        }

        const component = (inventories as InventoryItem[]).find((inv) => inv.skuId === componentSkuId);

        if (editingItemRowId !== null) {
            // Changing which Item this row points at could collide with a DIFFERENT existing
            // row for that same skuId - rather than silently merging two rows together here,
            // just block it and ask the user to remove the other row first.
            if (items.some((item) => item.skuId === componentSkuId && item.rowId !== editingItemRowId)) {
                showToast(toast, 'error', 'Error', 'This BOM already has a line for that Item - remove it first, or pick a different Item here');
                return;
            }
            setItems((prev) => prev.map((item) =>
                item.rowId === editingItemRowId
                    ? { ...item, skuId: componentSkuId, productName: component?.productName ?? item.productName, requiredQty: componentQty, unit: component?.unit ?? item.unit }
                    : item
            ));
            showToast(toast, 'success', 'Updated', 'Item updated');
        } else {
            setItems((prev) => {
                const existing = prev.find((item) => item.skuId === componentSkuId);
                if (existing) {
                    return prev.map((item) =>
                        item.skuId === componentSkuId ? { ...item, requiredQty: item.requiredQty + componentQty } : item
                    );
                }
                return [
                    ...prev,
                    {
                        rowId: nextBomItemRowId++,
                        skuId: componentSkuId,
                        productName: component?.productName ?? DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING,
                        requiredQty: componentQty,
                        unit: component?.unit ?? 'PCS',
                        remarks: DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING,
                        status: 'Pending',
                    },
                ];
            });
            showToast(toast, 'success', 'Added', 'Item added');
        }

        setComponentSkuId(DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING);
        setComponentQty(1);
        setEditingItemRowId(DEFAULT_DATA_TYPE_VALUE.NULL);
    };

    const handleSave = async () => {
        if (items.length === 0) {
            showToast(toast, 'warn', 'Warning', 'Please add at least one Item');
            return;
        }

        // Blocks saving a BOM whose still-Pending items would need more of a Raw SKU
        // than is actually in stock - completing that item later would fail this exact same
        // check server-side (see bom.controller.js's completeBomItem), so catching it here
        // gives a clear error immediately instead of only at Complete time. Already-Completed
        // items are skipped - their Raw SKU stock has already been deducted, so checking
        // it again against current stock would be meaningless. Just a plain toast (not a
        // per-item list) - one generic message covers the case fine.
        //
        // Summed per Raw SKU code first, same reasoning as completeBomItem's own check -
        // an Inventory item's assembly can list the same Raw SKU on more than one line
        // (Inventory Home's Product Assembly tab doesn't dedupe/merge them), so checking each
        // line independently against the same starting stock could miss a shortage that only
        // shows up once every line needing that SKU is added together.
        const inventoryList = inventories as InventoryItem[];
        const rawSkuList = rawSkus as RawSku[];
        const neededBySkuCode = new Map<string, number>();
        for (const item of items.filter((i) => i.status === 'Pending')) {
            const component = inventoryList.find((inv) => inv.skuId === item.skuId);
            for (const line of component?.assembly ?? []) {
                const needed = line.quantity * item.requiredQty;
                neededBySkuCode.set(line.skuCode, (neededBySkuCode.get(line.skuCode) ?? 0) + needed);
            }
        }
        const hasShortage = Array.from(neededBySkuCode.entries()).some(([skuCode, needed]) => {
            const available = rawSkuList.find((sku) => sku.skuCode === skuCode)?.currentStock ?? 0;
            return needed > available;
        });
        if (hasShortage) {
            showToast(toast, 'error', 'Error', "Some items don't have enough Raw SKU stock - can't save this BOM");
            return;
        }

        const bomCode = editingId ? editingBomCode : previewBomCode;
        if (!bomCode.trim()) {
            showToast(toast, 'error', 'Error', 'Please enter a BOM Code');

            return;
        }

        const payload: BomPayload = {
            // On create, reuses the code already previewed in this dialog unless the user
            // edited it. On update, sent as an actual rename - bom.controller.js's updateBom
            // only re-checks uniqueness when this differs from the BOM's current code.
            bomCode,
            version: BOM_VERSION,
            items: items.map(({ skuId, productName, requiredQty, unit, remarks }) => ({
                skuId,
                productName,
                requiredQty,
                unit,
                remarks,
            })),
            createdBy: 'Admin User',
            customFields,
        };

        try {
            if (editingId) {
                await updateBom(editingId, payload);
            } else {
                await createBom(payload);
            }
            showToast(toast, 'success', editingId ? 'Updated' : 'Created', `BOM ${editingId ? 'updated' : 'created'} successfully`);
            fetchBoms();
            setItems([]);
            setCustomFields({});
            setEditingId(DEFAULT_DATA_TYPE_VALUE.NULL);
            setPanelVisible(DEFAULT_DATA_TYPE_VALUE.FALSE);
        } catch (err) {
            showToast(toast, 'error', 'Error', err instanceof Error ? err.message : 'Something went wrong');
        }
    };

    // Completes ONE line of a BOM - deducts that Inventory item's own Raw SKU assembly
    // and credits its own qty onto Inventory (see bom.controller.js's completeBomItem). The
    // BOM's overall status (Process/Partially Completed/Completed) is recomputed server-side
    // from every line's own status, not set here.
    const handleCompleteItem = (bom: BomType, item: BomItem) => {
        confirmDialog({
            message: `Mark "${item.productName}" as Completed? This deducts its Raw SKU assembly from stock and adds ${item.requiredQty} ${item.unit} into Inventory.`,
            header: 'Mark Item as Completed',
            icon: 'pi pi-exclamation-triangle',
            accept: async () => {
                try {
                    await completeBomItem(bom.id, item.skuId);
                    fetchBoms();
                    fetchInventories();
                    fetchRawSkus();
                    showToast(toast, 'success', 'Completed', `${item.productName} marked as Completed`);
                } catch (err) {
                    showToast(toast, 'error', 'Error', err instanceof Error ? err.message : 'Something went wrong');
                }
            },
        });
    };

    const handleRevertItem = (bom: BomType, item: BomItem) => {
        confirmDialog({
            message: `Revert "${item.productName}" back to Pending? This restores its Raw SKU assembly and removes ${item.requiredQty} ${item.unit} from Inventory.`,
            header: 'Revert Item to Pending',
            icon: 'pi pi-exclamation-triangle',
            accept: async () => {
                try {
                    await revertBomItem(bom.id, item.skuId);
                    fetchBoms();
                    fetchInventories();
                    fetchRawSkus();
                    showToast(toast, 'success', 'Reverted', `${item.productName} reverted to Pending`);
                } catch (err) {
                    showToast(toast, 'error', 'Error', err instanceof Error ? err.message : 'Something went wrong');
                }
            },
        });
    };

    const menuItems = [
        { label: 'Print', icon: 'pi pi-print', command: () => menuBom && printBomPdf(menuBom, companyLogo, { companyName, address }) },
        { label: 'Download', icon: <FaRegFilePdf />, command: () => menuBom && downloadBomPdf(menuBom, companyLogo, { companyName, address }) },
    ];

    const customFieldColumns = useCustomFieldColumns<BomType>('bom');
    const { label: fieldLabel } = useFieldLabels('bom');
    const columns = [...getBomColumns(dateFormat, openEditDialog, fieldLabel), ...customFieldColumns];

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

    // Complete/Revert now happen per-item from the expanded row below (getBomItemExpansionColumns'
    // own Action column), not at the whole-BOM level - this row action is Print/Download only.
    const bomActionTemplate = (row: BomType) => (
        <div className="data-table-actions">
            <HiOutlinePrinter size={16} title="Print or Download" onClick={(e) => openPrintMenu(e, row)} />
        </div>
    );

    // Main list's expandable-row content - every item in that BOM, each with its own
    // Complete/Revert action, independent of every other item in the same BOM (see
    // bom.controller.js's completeBomItem/revertBomItem).
    const renderBomItemsExpansion = (bom: BomType) => {
        if (bom.items.length === 0) {
            return <div className="bom-component-expansion-empty">No items in this BOM yet.</div>;
        }
        const expansionColumns = getBomItemExpansionColumns(
            inventories as InventoryItem[],
            (item) => handleCompleteItem(bom, item),
            (item) => handleRevertItem(bom, item)
        );
        return (
            <div className="bom-component-expansion">
                <DataTable
                    value={bom.items}
                    columns={expansionColumns}
                    dataKey="skuId"
                    paginator={bom.items.length > 5}
                    rows={5}
                    sortable={false}
                    filterable={false}
                />
            </div>
        );
    };

    // Edit/Delete only for still-Pending rows - a Completed row represents stock that's
    // already actually moved (see bom.controller.js's updateBom), so it has no actions at all
    // here; it can only go back to Pending via the main list's own Revert action.
    const itemActionTemplate = (row: BomItemRow) =>
        row.status === 'Pending' ? (
            <div className="data-table-actions">
                <HiOutlinePencilSquare size={16} title="Edit" onClick={() => handleEditComponent(row)} />
                <HiOutlineTrash size={16} color="#dc2626" title="Delete" onClick={() => removeItem(row.rowId)} />
            </div>
        ) : DEFAULT_DATA_TYPE_VALUE.NULL;

    const itemColumns = getBomItemColumns(items, inventories as InventoryItem[], rawSkus as RawSku[]);

    // Purely informational drill-down while composing a BOM - an Item being added is itself
    // an Inventory item that may have its own Raw SKU assembly defined (Inventory Home's
    // Product Assembly tab). Expanding a row previews that breakdown, scaled by how much of
    // the item this line intends to produce (row.requiredQty) - this is exactly what
    // completing that line later will actually deduct (see bom.controller.js's
    // completeBomItem), shown here ahead of time so the user knows what it'll take.
    const renderComponentAssembly = (row: BomItemRow) => {
        const component = (inventories as InventoryItem[]).find((inv) => inv.skuId === row.skuId);
        const assembly = component?.assembly ?? [];
        const componentQtyNeeded = row.requiredQty;

        if (assembly.length === 0) {
            return <div className="bom-component-expansion-empty">No Raw SKU assembly defined for this item.</div>;
        }

        return (
            <div className="bom-component-expansion">
                <h4 className="bom-component-expansion-title">
                    Raw SKU required to produce {componentQtyNeeded} {row.unit} of {row.productName}
                </h4>
                <table className="bom-recipe-table">
                    <thead>
                        <tr>
                            <th>Raw SKU</th>
                            <th>Qty (per unit)</th>
                            <th>Required Qty</th>
                            <th>Current Stock</th>
                        </tr>
                    </thead>
                    <tbody>
                        {assembly.map((line: AssemblyLine) => {
                            const finishedSku = (rawSkus as RawSku[]).find((sku) => sku.skuCode === line.skuCode);
                            const requiredQty = Number((line.quantity * componentQtyNeeded).toFixed(2));
                            const currentStock = finishedSku?.currentStock;
                            const insufficient = currentStock !== undefined && requiredQty > currentStock;
                            const sufficient = currentStock !== undefined && requiredQty <= currentStock;
                            const qtyStatusClass = insufficient ? ' bom-recipe-qty-needed--insufficient' : sufficient ? ' bom-recipe-qty-needed--sufficient' : '';
                            return (
                                <tr key={line.skuCode}>
                                    <td>{line.skuCode} - {line.skuName}</td>
                                    <td>{line.quantity} {line.unit}</td>
                                    <td className={`bom-recipe-qty-needed${qtyStatusClass}`}>{requiredQty} {line.unit}</td>
                                    <td>
                                        {currentStock !== undefined ? `${currentStock} ${line.unit}` : '—'}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        );
    };

    // Deletable regardless of status - deliberately does not reverse the stock impact any
    // already-Completed line already made (see bom.controller.js's deleteBom).
    const { selectedRows, setSelectedRows, handleBulkDelete, bulkDeleting } = useBulkDelete<BomType>({
        getId: (row) => row.id,
        deleteOne: deleteBom,
        onDeleted: fetchBoms,
        toast,
        entityNamePlural: 'BOMs',
    });

    return (
        <div className="bom-page">
            <Toast ref={toast} />
            <Menu model={menuItems} popup ref={menuRef} onShow={repositionPrintMenu} className="bom-print-menu" />

            <FilterBar
                fields={filterFields}
                values={filters}
                onChange={(key, value) => setFilters((prev) => ({ ...prev, [key]: value }))}
                onReset={() => {
                    setFilters({ search: DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING });
                    dataTableRef.current?.clearFilters();
                }}
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
                        <Button className="filter-bar-add-btn" label="Add BOM" icon={<HiOutlinePlus className="mr-2" />} onClick={openAddDialog} outlined />
                    </>
                }
                trailingActions={
                    <Button className="filter-bar-refresh-btn" icon={<HiOutlineArrowPath />} outlined size="small" onClick={fetchBoms} loading={bomsLoading} aria-label="Refresh" title="Refresh" />
                }
            />

            <DataTable
                ref={dataTableRef}
                value={filteredBoms}
                columns={columns}
                loading={bomsLoading}
                actionBodyTemplate={bomActionTemplate}
                selectable
                selection={selectedRows}
                onSelectionChange={setSelectedRows}
                expandable
                rowExpansionTemplate={renderBomItemsExpansion}
            />

            <Dialog
                visible={panelVisible}
                onHide={() => setPanelVisible(DEFAULT_DATA_TYPE_VALUE.FALSE)}
                header={<DialogHeader icon={HiOutlineSquare3Stack3D} title={editingId ? 'Edit BOM' : 'Add New BOM'} />}
                style={{ width: '1040px', maxWidth: '95vw' }}
                footer={
                    <>
                        <Button label="Cancel" outlined onClick={() => setPanelVisible(DEFAULT_DATA_TYPE_VALUE.FALSE)} />
                        {/* Hidden once locked - nothing left in this dialog can actually change
                            (see isBomLocked), so Save would have nothing to submit. */}
                        {!isBomLocked && (
                            <Button label="Save" icon={<HiOutlineCheckCircle className="mr-2" />} onClick={handleSave} />
                        )}
                    </>
                }
            >
                <div className="bom-dialog-body">
                    {isBomLocked && (
                        <div className="bom-locked-banner">
                            This BOM has items already Completed and can no longer be edited - revert an item back to Pending first (from the main list) to make changes.
                        </div>
                    )}
                    <div className="bom-form-section">
                        <h3 className="bom-form-section-title">Basic Information</h3>
                        <div className="bom-add-component-row">
                            <div className="form-field bom-add-component-code">
                                <label>{fieldLabel('bomCode', 'BOM Code')}</label>
                                <InputText
                                    value={editingId ? editingBomCode : previewBomCode}
                                    onChange={(e) => (editingId ? setEditingBomCode(e.target.value) : setPreviewBomCode(e.target.value))}
                                    placeholder={!editingId && !previewBomCode ? 'Generating...' : undefined}
                                    disabled={isBomLocked}
                                />
                            </div>
                            {!isBomLocked && (
                            <>
                            <div className="form-field bom-add-component-dropdown">
                                <label>Item</label>
                                <Dropdown
                                    value={componentSkuId || DEFAULT_DATA_TYPE_VALUE.NULL}
                                    onChange={(e) => setComponentSkuId(e.value)}
                                    options={(inventories as InventoryItem[]).map((item) => ({ label: `${item.skuId} - ${item.productName}`, value: item.skuId }))}
                                    placeholder="Select an Item to add"
                                    filter
                                />
                            </div>
                            <div className="form-field bom-add-component-qty">
                                <label>Qty</label>
                                <InputNumber
                                    value={componentQty}
                                    onValueChange={(e) => setComponentQty(e.value ?? DEFAULT_DATA_TYPE_VALUE.ZERO)}
                                    min={0}
                                    placeholder="Qty"
                                />
                            </div>
                            {componentSkuId && (
                                <div className="form-field bom-add-component-unit-field">
                                    <label>Unit</label>
                                    <span className="bom-add-component-unit">
                                        {(inventories as InventoryItem[]).find((inv) => inv.skuId === componentSkuId)?.unit}
                                    </span>
                                </div>
                            )}
                            <div className="form-field bom-add-component-btn">
                                <label>&nbsp;</label>
                                <Button
                                    label={editingItemRowId !== null ? 'Update Item' : 'Add Item'}
                                    icon={editingItemRowId !== null ? <HiOutlinePencilSquare className="mr-2" /> : <HiOutlinePlus className="mr-2" />}
                                    onClick={handleAddComponent}
                                    outlined
                                />
                            </div>
                            {editingItemRowId !== null && (
                                <div className="form-field bom-add-component-btn">
                                    <label>&nbsp;</label>
                                    <Button label="Cancel" icon={<HiOutlineXCircle className="mr-2" />} onClick={handleCancelEditComponent} text />
                                </div>
                            )}
                            </>
                            )}
                        </div>
                    </div>

                    <div className="bom-form-section">
                        <div className="bom-items-header">
                            <div>
                                <h3 className="bom-form-section-title">{fieldLabel('items', 'Items')}</h3>
                                <span className="bom-items-subtitle">Main Inventory items this BOM will produce - each is completed independently once actually made.</span>
                            </div>
                        </div>

                        <DataTable
                            value={items}
                            columns={itemColumns}
                            actionBodyTemplate={isBomLocked ? DEFAULT_DATA_TYPE_VALUE.UNDEFINED : itemActionTemplate}
                            expandable
                            rowExpansionTemplate={renderComponentAssembly}
                            paginator
                            rows={5}
                            sortable={false}
                            filterable={false}
                            dataKey="rowId"
                            emptyMessage="No items added yet."
                        />
                    </div>

                    <CustomFieldsSection
                        entityKey="bom"
                        values={customFields}
                        onChange={(columnName, value) => setCustomFields((prev) => ({ ...prev, [columnName]: value }))}
                        disabled={isBomLocked}
                    />
                </div>
            </Dialog>
        </div>
    );
};
export default Bom;
