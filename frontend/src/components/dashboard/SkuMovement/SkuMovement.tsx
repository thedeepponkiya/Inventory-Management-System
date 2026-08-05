import { useContext, useMemo, useState } from 'react';
import { Dropdown } from 'primereact/dropdown';
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

    // Derived from dispatched Orders' items, since there's no dedicated stock-movement log
    // table; a dispatched Order's items are the only real record of a Raw SKU quantity
    // actually leaving its location. Range is driven by movementFilter (This Month / Last
    // Month / Last 3 Months).
    const skuMovement = useMemo(() => {
        const { start, end } = getFilterRange(movementFilter);

        const consumedBySku = new Map<string, { rawSkuName: string; unit: string; total: number }>();
        bomList
            .filter((bom) => bom.status === 'Dispatch' && new Date(bom.updatedAt) >= start && new Date(bom.updatedAt) <= end)
            .forEach((bom) => {
                bom.items.forEach((item) => {
                    const consumedQty = item.requiredQty * bom.outputQty;
                    const existing = consumedBySku.get(item.rawSkuCode);
                    if (existing) {
                        existing.total += consumedQty;
                    } else {
                        consumedBySku.set(item.rawSkuCode, { rawSkuName: item.rawSkuName, unit: item.unit, total: consumedQty });
                    }
                });
            });

        const topMoving = Array.from(consumedBySku.entries())
            .map(([skuCode, data]) => ({ skuCode, ...data }))
            .sort((a, b) => b.total - a.total)
            .slice(0, 5);

        const nonMoving = rawSkuList
            .filter((sku) => !consumedBySku.has(sku.skuCode))
            .sort((a, b) => b.currentStock - a.currentStock)
            .slice(0, 5);

        return { topMoving, nonMoving };
    }, [bomList, rawSkuList, movementFilter]);

    return (
        <div className="dashboard-card">
            <div className="dashboard-card-header">
                <h2>SKU Movement</h2>
                <Dropdown
                    value={movementFilter}
                    onChange={(e) => setMovementFilter(e.value)}
                    options={['This Month', 'Last Month', 'Last 3 Months']}
                    className="dashboard-month-dropdown"
                />
            </div>
            <div className="dashboard-movement-grid">
                <div className="dashboard-movement-col">
                    <h3 className="dashboard-movement-title">Non-Moving SKUs</h3>
                    {skuMovement.nonMoving.length === 0 ? (
                        <div className="dashboard-empty-state">Every SKU has moved out in this period.</div>
                    ) : (
                        <div className="dashboard-low-stock-list">
                            {skuMovement.nonMoving.map((sku) => (
                                <div className="dashboard-low-stock-item" key={sku.id}>
                                    <div className="dashboard-low-stock-info">
                                        <div className="dashboard-low-stock-name">{sku.skuName}</div>
                                        <div className="dashboard-low-stock-sub">#{sku.skuCode}</div>
                                    </div>
                                    <div className="dashboard-low-stock-meta">
                                        <div className="dashboard-low-stock-min">{sku.currentStock} {sku.unit}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="dashboard-movement-col">
                    <h3 className="dashboard-movement-title">Top Moving SKUs</h3>
                    {skuMovement.topMoving.length === 0 ? (
                        <div className="dashboard-empty-state">No Orders have been dispatched in this period.</div>
                    ) : (
                        <div className="dashboard-low-stock-list">
                            {skuMovement.topMoving.map((sku) => (
                                <div className="dashboard-low-stock-item" key={sku.skuCode}>
                                    <div className="dashboard-low-stock-info">
                                        <div className="dashboard-low-stock-name">{sku.rawSkuName}</div>
                                        <div className="dashboard-low-stock-sub">#{sku.skuCode}</div>
                                    </div>
                                    <div className="dashboard-low-stock-meta">
                                        <div className="dashboard-low-stock-min dashboard-low-stock-min--positive">
                                            {Number(sku.total.toFixed(2))} {sku.unit} moved
                                        </div>
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
