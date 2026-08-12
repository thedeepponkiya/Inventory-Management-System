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
import type { RawSku } from '../../../services/rawSkuService';
import type { Bom } from '../../../services/bomService';
import { getFilterRange } from '../dashboardUtils';
import '../Dashboard.css';
import './SkuMovement.css';

const SkuMovement = () => {
    const { rawSkus, boms } = useContext(AppContext);
    const rawSkuList = rawSkus as RawSku[];
    const bomList = boms as Bom[];
    const [movementFilter, setMovementFilter] = useState('Last 3 Months');
    const [search, setSearch] = useState('');

    // Derived from Completed Orders' items, since there's no dedicated stock-movement log
    // table; a Completed Order's items are the only real record of a Raw SKU quantity
    // actually leaving its location (deducted at Completed - see bom.controller.js's
    // completeBom). Range is driven by movementFilter (This/Last Week, This/Last Month,
    // Last 3 Months, This/Last Year).
    const skuMovement = useMemo(() => {
        const { start, end } = getFilterRange(movementFilter);
        const term = search.trim().toLowerCase();
        const matchesSearch = (name: string, code: string) =>
            !term || name.toLowerCase().includes(term) || code.toLowerCase().includes(term);

        const consumedBySku = new Map<string, { rawSkuName: string; unit: string; total: number; locationName: string | null }>();
        bomList
            .filter((bom) => bom.status === 'Completed' && new Date(bom.updatedAt) >= start && new Date(bom.updatedAt) <= end)
            .forEach((bom) => {
                bom.items.forEach((item) => {
                    const consumedQty = item.requiredQty * bom.outputQty;
                    const existing = consumedBySku.get(item.rawSkuCode);
                    if (existing) {
                        existing.total += consumedQty;
                    } else {
                        // BomItem has no location of its own - look it up from the Raw SKU
                        // master, same denormalize-at-read approach used everywhere else.
                        const locationName = rawSkuList.find((sku) => sku.skuCode === item.rawSkuCode)?.locationName ?? null;
                        consumedBySku.set(item.rawSkuCode, { rawSkuName: item.rawSkuName, unit: item.unit, total: consumedQty, locationName });
                    }
                });
            });

        // Search narrows the full candidate pool before ranking/capping at 5, so searching
        // for a specific SKU can surface it even if it wouldn't otherwise make the top 5.
        const topMoving = Array.from(consumedBySku.entries())
            .map(([skuCode, data]) => ({ skuCode, ...data }))
            .filter((sku) => matchesSearch(sku.rawSkuName, sku.skuCode))
            .sort((a, b) => b.total - a.total)
            .slice(0, 5);

        const nonMoving = rawSkuList
            .filter((sku) => !consumedBySku.has(sku.skuCode))
            .filter((sku) => matchesSearch(sku.skuName, sku.skuCode))
            .sort((a, b) => b.currentStock - a.currentStock)
            .slice(0, 5);

        return { topMoving, nonMoving };
    }, [bomList, rawSkuList, movementFilter, search]);

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
                                    <div className="sku-movement-item-icon sku-movement-item-icon--negative">
                                        <HiOutlineCube size={16} />
                                    </div>
                                    <div className="sku-movement-item-info">
                                        <div className="sku-movement-item-name">{sku.skuName}</div>
                                        <div className="sku-movement-item-sub">#{sku.skuCode}</div>
                                        <div className="sku-movement-item-sub">Location: {sku.locationName ?? '—'}</div>
                                    </div>
                                    <div className="sku-movement-item-meta">
                                        <div className="sku-movement-item-value sku-movement-item-value--negative">{sku.currentStock.toLocaleString('en-IN')}</div>
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
                            {search.trim() ? `No SKUs match "${search}".` : 'No Orders have been dispatched in this period.'}
                        </div>
                    ) : (
                        <div className="sku-movement-list">
                            {skuMovement.topMoving.map((sku) => (
                                <div className="sku-movement-item" key={sku.skuCode}>
                                    <div className="sku-movement-item-icon sku-movement-item-icon--positive">
                                        <HiOutlineCube size={16} />
                                    </div>
                                    <div className="sku-movement-item-info">
                                        <div className="sku-movement-item-name">{sku.rawSkuName}</div>
                                        <div className="sku-movement-item-sub">#{sku.skuCode}</div>
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