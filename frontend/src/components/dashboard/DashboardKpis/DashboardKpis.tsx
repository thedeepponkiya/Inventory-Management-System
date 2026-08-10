import { useContext, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    HiOutlineCube,
    HiOutlineArchiveBox,
    HiOutlineClipboardDocumentCheck,
    HiOutlineShoppingBag,
    HiOutlineCurrencyRupee,
    HiOutlineBanknotes,
} from 'react-icons/hi2';
import { KpiCardRow } from '../../../common/commonComponents/kpiCard/KpiCard';
import { AppContext } from '../../../context/AppContextDefinition';
import type { InventoryItem } from '../../../services/inventoryService';
import type { RawSku } from '../../../services/rawSkuService';
import type { PurchaseOrder } from '../../../services/purchaseOrderService';
import type { SalesOrder } from '../../../services/salesOrderService';

const DashboardKpis = () => {
    const navigate = useNavigate();
    const { inventories, rawSkus, purchaseOrders, salesOrders } = useContext(AppContext);

    const inventoryList = inventories as InventoryItem[];
    const rawSkuList = rawSkus as RawSku[];
    const purchaseOrderList = purchaseOrders as PurchaseOrder[];
    const salesOrderList = salesOrders as SalesOrder[];

    const totalInventoryStock = useMemo(
        () => inventoryList.reduce((sum, item) => sum + item.quantity, 0),
        [inventoryList],
    );
    const totalFinishedSkus = rawSkuList.length;
    const totalStockValue = useMemo(
        () => inventoryList.reduce((sum, item) => sum + item.quantity * item.unitCost, 0),
        [inventoryList],
    );
    const totalPurchaseValue = useMemo(
        () => purchaseOrderList.reduce((sum, po) => sum + po.grandTotal, 0),
        [purchaseOrderList],
    );
    const totalSalesValue = useMemo(
        () => salesOrderList.reduce((sum, so) => sum + so.grandTotal, 0),
        [salesOrderList],
    );
    // Realized margin, not a theoretical one: only dispatchedQty counts (the point where
    // Inventory stock actually leaves - see salesOrder.controller.js's dispatchSalesOrder),
    // so Draft/Confirmed/Processing orders contribute 0 and Cancelled orders (only
    // cancellable pre-shipment) are excluded automatically, without a status filter.
    // profitMarginPercent is profit as a % of the revenue actually earned from that same
    // dispatched quantity - not % of totalSalesValue, which would also count undispatched
    // (not-yet-realized) order value and understate the true margin.
    const { totalProfit, profitMarginPercent } = useMemo(() => {
        let profit = 0;
        let dispatchedRevenue = 0;
        salesOrderList.forEach((so) => {
            so.items.forEach((item) => {
                const productCost = inventoryList.find((inv) => inv.skuId === item.skuId)?.unitCost ?? 0;
                profit += (item.unitPrice - productCost) * item.dispatchedQty;
                dispatchedRevenue += item.unitPrice * item.dispatchedQty;
            });
        });
        return { totalProfit: profit, profitMarginPercent: dispatchedRevenue > 0 ? (profit / dispatchedRevenue) * 100 : 0 };
    }, [salesOrderList, inventoryList]);

    return (
        <KpiCardRow
            columns={6}
            items={[
                { icon: HiOutlineCube, iconBg: '#e0f2fe', iconColor: '#0284c7', label: 'Total Inventory Stock', value: totalInventoryStock.toLocaleString('en-IN'), sublabel: 'Total units across Inventory Home', linkLabel: 'View inventory', onClick: () => navigate('/home') },
                { icon: HiOutlineArchiveBox, iconBg: '#dbeafe', iconColor: '#2563eb', label: 'Total Finished SKUs', value: totalFinishedSkus, sublabel: 'All items in inventory', linkLabel: 'View all SKUs', onClick: () => navigate('/raw-sku') },
                { icon: HiOutlineClipboardDocumentCheck, iconBg: '#dcfce7', iconColor: '#16a34a', label: 'Total Stock Value', value: `₹${totalStockValue.toLocaleString('en-IN')}`, sublabel: 'Current inventory value', linkLabel: 'View inventory', onClick: () => navigate('/home') },
                { icon: HiOutlineShoppingBag, iconBg: '#ede9fe', iconColor: '#7c3aed', label: 'Total Purchase Value', value: `₹${totalPurchaseValue.toLocaleString('en-IN')}`, sublabel: 'All purchase orders', linkLabel: 'View purchase orders', onClick: () => navigate('/purchase-order') },
                { icon: HiOutlineCurrencyRupee, iconBg: '#ffedd5', iconColor: '#ea580c', label: 'Total Sales Value', value: `₹${totalSalesValue.toLocaleString('en-IN')}`, sublabel: 'All sales orders', linkLabel: 'View sales orders', onClick: () => navigate('/sales-order') },
                {
                    icon: HiOutlineBanknotes,
                    iconBg: totalProfit >= 0 ? '#dcfce7' : '#fee2e2',
                    iconColor: totalProfit >= 0 ? '#16a34a' : '#dc2626',
                    label: 'Total Profit',
                    value: `₹${totalProfit.toLocaleString('en-IN')}`,
                    delta: { value: `${profitMarginPercent.toFixed(1)}%`, direction: profitMarginPercent >= 0 ? 'up' : 'down' },
                    sublabel: 'From dispatched sales orders',
                    linkLabel: 'View sales orders',
                    onClick: () => navigate('/sales-order'),
                },
            ]}
        />
    );
};
export default DashboardKpis;
