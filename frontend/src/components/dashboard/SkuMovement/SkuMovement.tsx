import { useContext, useMemo, useState } from 'react';
import { Dropdown } from 'primereact/dropdown';
import { InputText } from 'primereact/inputtext';
import {
    HiOutlineArrowsRightLeft,
    HiOutlineMinusCircle,
    HiOutlineArrowTrendingUp,
    HiOutlineCube,
    HiOutlineMagnifyingGlass,
} from 'react-icons/hi2';
import { AppContext } from '../../../context/AppContextDefinition';
import type { InventoryItem } from '../../../services/inventoryService';
import type { Bom } from '../../../services/bomService';
import { getFilterRange } from '../dashboardUtils';
import { resolveImageUrl } from '../../../common/commonFunctions/commonFunction';
import '../Dashboard.css';
import './SkuMovement.css';

// Shared by both the Non-Moving and Top Moving item rows - shows the SKU's actual photo when
// it has one (matching LowStockAlerts' thumbnail pattern), falling back to a plain icon in a
// colored box otherwise.
const SkuMovementThumb = ({ images, variant }: { images: string[]; variant: 'negative' | 'positive' }) => (
    images[0] ? (
        <img src={resolveImageUrl(images[0])} alt="" className="sku-movement-item-icon" />
    ) : (
        <span className={`sku-movement-item-icon sku-movement-item-icon--${variant}`}>
            <HiOutlineCube size={20} />
        </span>
    )
);

const SkuMovement = () => {
    const { inventories, boms } = useContext(AppContext);
    const inventoryList = inventories as InventoryItem[];
    const bomList = boms as Bom[];
    const [movementFilter, setMovementFilter] = useState('Last 3 Months');
    const [search, setSearch] = useState('');

    // Derived from every BOM's own Completed items, since there's no dedicated stock-movement
    // log table - a Completed item is the only real record of an Inventory item's quantity
    // actually being produced (credited - see bom.controller.js's completeBomItem). A BOM no
    // longer has one whole-record "Completed" moment (each item completes independently, see
    // bomService.ts's Bom comment), so this reads bom.items' own status directly rather than
    // gating on the BOM's own derived status - a Partially Completed BOM's finished items
    // still count. Range is driven by movementFilter (This/Last Week, This/Last Month,
    // Last 3 Months, This/Last Year), checked against the BOM's updatedAt as a best-effort
    // proxy for "when" - there's no per-item completion timestamp to check instead, so a BOM
    // touched again after the window closes can push an in-window completion out of range.
    const skuMovement = useMemo(() => {
        const { start, end } = getFilterRange(movementFilter);
        const term = search.trim().toLowerCase();
        const matchesSearch = (name: string, code: string) =>
            !term || name.toLowerCase().includes(term) || code.toLowerCase().includes(term);

        const producedBySku = new Map<string, { productName: string; unit: string; total: number; locationName: string | null; images: string[] }>();
        bomList
            .filter((bom) => new Date(bom.updatedAt) >= start && new Date(bom.updatedAt) <= end)
            .forEach((bom) => {
                bom.items.filter((item) => item.status === 'Completed').forEach((item) => {
                    const producedQty = item.requiredQty;
                    const existing = producedBySku.get(item.skuId);
                    if (existing) {
                        existing.total += producedQty;
                    } else {
                        // BomItem has no location/images of its own - look them up from the
                        // Inventory master, same denormalize-at-read approach used everywhere else.
                        const inventoryItem = inventoryList.find((inv) => inv.skuId === item.skuId);
                        producedBySku.set(item.skuId, { productName: item.productName, unit: item.unit, total: producedQty, locationName: inventoryItem?.locationName ?? null, images: inventoryItem?.images ?? [] });
                    }
                });
            });

        // No slice() cap - sorted by relevance and the panel's own list scrolls after ~5 items
        // (see .sku-movement-list's max-height in SkuMovement.css), so every matching SKU is
        // reachable rather than only the top 5, same approach as Recent Sales Orders/Low
        // Stock Alerts' own scrollable lists.
        const topMoving = Array.from(producedBySku.entries())
            .map(([skuId, data]) => ({ skuId, ...data }))
            .filter((sku) => matchesSearch(sku.productName, sku.skuId))
            .sort((a, b) => b.total - a.total);

        const nonMoving = inventoryList
            .filter((sku) => !producedBySku.has(sku.skuId))
            .filter((sku) => matchesSearch(sku.productName, sku.skuId))
            .sort((a, b) => b.quantity - a.quantity);

        return { topMoving, nonMoving };
    }, [bomList, inventoryList, movementFilter, search]);

    return (
        <div className="dashboard-card">
            <div className="dashboard-card-header sku-movement-header">
                <div className="sku-movement-header-left">
                    <div className="sku-movement-header-icon">
                        <HiOutlineArrowsRightLeft size={20} />
                    </div>
                    <div>
                        <h2 className="sku-movement-title">SKU Movement</h2>
                        <p className="sku-movement-subtitle">Overview of non-moving and top moving SKUs in selected period.</p>
                    </div>
                </div>
                <div className="sku-movement-header-right">
                    <span className="dashboard-search">
                        <HiOutlineMagnifyingGlass className="dashboard-search-icon" />
                        <InputText value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search SKU name or code..." />
                    </span>
                    <Dropdown
                        value={movementFilter}
                        onChange={(e) => setMovementFilter(e.value)}
                        options={['This Week', 'Last Week', 'This Month', 'Last Month', 'Last 3 Months', 'This Year', 'Last Year']}
                        className="dashboard-month-dropdown"
                    />
                </div>
            </div>

            <div className="dashboard-movement-grid">
                <div className="sku-movement-panel sku-movement-panel--negative">
                    <div className="sku-movement-panel-header">
                        <div className="sku-movement-panel-icon sku-movement-panel-icon--negative">
                            <HiOutlineMinusCircle size={16} />
                        </div>
                        <h3 className="sku-movement-panel-title">Non-Moving SKUs</h3>
                        {skuMovement.nonMoving.length > 0 && (
                            <span className="sku-movement-panel-badge sku-movement-panel-badge--negative">{skuMovement.nonMoving.length} Items</span>
                        )}
                    </div>
                    <p className="sku-movement-panel-subtitle">SKUs with no movement in the selected period.</p>

                    {skuMovement.nonMoving.length === 0 ? (
                        <div className="dashboard-empty-state">
                            {search.trim() ? `No SKUs match "${search}".` : 'Every SKU has moved out in this period.'}
                        </div>
                    ) : (
                        <div className="sku-movement-list">
                            {skuMovement.nonMoving.map((sku) => (
                                <div className="sku-movement-item" key={sku.id}>
                                    <SkuMovementThumb images={sku.images} variant="negative" />
                                    <div className="sku-movement-item-info">
                                        <div className="sku-movement-item-name">{sku.productName}</div>
                                        <div className="sku-movement-item-sub">#{sku.skuId}</div>
                                        <div className="sku-movement-item-sub">Location: {sku.locationName ?? '—'}</div>
                                    </div>
                                    <div className="sku-movement-item-meta">
                                        <div className="sku-movement-item-value sku-movement-item-value--negative">{sku.quantity.toLocaleString('en-IN')}</div>
                                        <div className="sku-movement-item-unit">{sku.unit}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="sku-movement-panel sku-movement-panel--positive">
                    <div className="sku-movement-panel-header">
                        <div className="sku-movement-panel-icon sku-movement-panel-icon--positive">
                            <HiOutlineArrowTrendingUp size={16} />
                        </div>
                        <h3 className="sku-movement-panel-title">Top Moving SKUs</h3>
                        {skuMovement.topMoving.length > 0 && (
                            <span className="sku-movement-panel-badge sku-movement-panel-badge--positive">{skuMovement.topMoving.length} Items</span>
                        )}
                    </div>
                    <p className="sku-movement-panel-subtitle">SKUs with the highest movement in the selected period.</p>

                    {skuMovement.topMoving.length === 0 ? (
                        <div className="dashboard-empty-state">
                            {search.trim() ? `No SKUs match "${search}".` : 'No BOM items have been completed in this period.'}
                        </div>
                    ) : (
                        <div className="sku-movement-list">
                            {skuMovement.topMoving.map((sku) => (
                                <div className="sku-movement-item" key={sku.skuId}>
                                    <SkuMovementThumb images={sku.images} variant="positive" />
                                    <div className="sku-movement-item-info">
                                        <div className="sku-movement-item-name">{sku.productName}</div>
                                        <div className="sku-movement-item-sub">#{sku.skuId}</div>
                                        <div className="sku-movement-item-sub">Location: {sku.locationName ?? '—'}</div>
                                    </div>
                                    <div className="sku-movement-item-meta">
                                        <div className="sku-movement-item-value sku-movement-item-value--positive">{Number(sku.total.toFixed(2)).toLocaleString('en-IN')}</div>
                                        <div className="sku-movement-item-unit">{sku.unit} moved</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
export default SkuMovement;