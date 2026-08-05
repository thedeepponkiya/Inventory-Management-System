import { useContext, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppContext } from '../../../context/AppContextDefinition';
import type { RawSku } from '../../../services/rawSkuService';
import { getStockSeverityColor } from '../dashboardUtils';
import '../Dashboard.css';
import './LowStockAlerts.css';

const LowStockAlerts = () => {
    const navigate = useNavigate();
    const { rawSkus } = useContext(AppContext);
    const rawSkuList = rawSkus as RawSku[];

    const lowStockItems = useMemo(
        () => rawSkuList
            .filter((sku) => sku.minStock > 0 && sku.currentStock <= sku.minStock)
            .sort((a, b) => a.currentStock / a.minStock - b.currentStock / b.minStock)
            .slice(0, 20),
        [rawSkuList],
    );

    return (
        <div className="dashboard-card">
            <div className="dashboard-card-header">
                <h2>Low Stock Alerts</h2>
                <span className="dashboard-card-link" onClick={() => navigate('/raw-sku')}>View all</span>
            </div>
            {lowStockItems.length === 0 ? (
                <div className="dashboard-empty-state">No SKUs are currently below their minimum stock level.</div>
            ) : (
                <div className="dashboard-low-stock-list dashboard-low-stock-list--scroll">
                    {lowStockItems.map((item) => {
                        const ratio = Math.min(100, (item.currentStock / item.minStock) * 100);
                        const severityColor = getStockSeverityColor(item.currentStock, item.minStock);
                        return (
                            <div className="dashboard-low-stock-item" key={item.id}>
                                <div className="dashboard-low-stock-info">
                                    <div className="dashboard-low-stock-name">{item.skuName}</div>
                                    <div className="dashboard-low-stock-sub">
                                        Current Stock: <span style={{ color: severityColor, fontWeight: 700 }}>{item.currentStock}</span>
                                    </div>
                                </div>
                                <div className="dashboard-low-stock-meta">
                                    <div className="dashboard-low-stock-min">Min. Stock: {item.minStock}</div>
                                    <div className="dashboard-low-stock-bar">
                                        <div className="dashboard-low-stock-bar-fill" style={{ width: `${ratio}%`, background: severityColor }} />
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};
export default LowStockAlerts;
