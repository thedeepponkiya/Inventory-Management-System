import { useContext, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    HiOutlineCube,
    HiOutlineArchiveBox,
    HiOutlineClipboardDocumentCheck,
    HiOutlineShoppingBag,
    HiOutlineCurrencyRupee,
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

    return (
        <KpiCardRow
            columns={5}
            items={[
                { icon: HiOutlineCube, iconBg: '#e0f2fe', iconColor: '#0284c7', label: 'Total Inventory Stock', value: totalInventoryStock.toLocaleString('en-IN'), sublabel: 'Total units across Inventory Home', linkLabel: 'View inventory', onClick: () => navigate('/home') },
                { icon: HiOutlineArchiveBox, iconBg: '#dbeafe', iconColor: '#2563eb', label: 'Total Finished SKUs', value: totalFinishedSkus, sublabel: 'All items in inventory', linkLabel: 'View all SKUs', onClick: () => navigate('/raw-sku') },
                { icon: HiOutlineClipboardDocumentCheck, iconBg: '#dcfce7', iconColor: '#16a34a', label: 'Total Stock Value', value: `Rs. ${totalStockValue.toLocaleString('en-IN')}`, sublabel: 'Current inventory value', linkLabel: 'View inventory', onClick: () => navigate('/home') },
                { icon: HiOutlineShoppingBag, iconBg: '#ede9fe', iconColor: '#7c3aed', label: 'Total Purchase Value', value: `Rs. ${totalPurchaseValue.toLocaleString('en-IN')}`, sublabel: 'All purchase orders', linkLabel: 'View purchase orders', onClick: () => navigate('/purchase-order') },
                { icon: HiOutlineCurrencyRupee, iconBg: '#ffedd5', iconColor: '#ea580c', label: 'Total Sales Value', value: `Rs. ${totalSalesValue.toLocaleString('en-IN')}`, sublabel: 'All sales orders', linkLabel: 'View sales orders', onClick: () => navigate('/sales-order') },
            ]}
        />
    );
};
export default DashboardKpis;
