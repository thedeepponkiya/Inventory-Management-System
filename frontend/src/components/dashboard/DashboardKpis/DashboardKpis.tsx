import { useContext, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    HiOutlineCube,
    HiOutlineArchiveBox,
    HiOutlineClipboardDocumentCheck,
    HiOutlineSquares2X2,
    HiOutlineShoppingCart,
} from 'react-icons/hi2';
import { KpiCardRow } from '../../../common/commonComponents/kpiCard/KpiCard';
import { AppContext } from '../../../context/AppContextDefinition';
import type { InventoryItem } from '../../../services/inventoryService';
import type { RawSku } from '../../../services/rawSkuService';
import type { Bom } from '../../../services/bomService';
import { isSameMonth } from '../dashboardUtils';

const DashboardKpis = () => {
    const navigate = useNavigate();
    const { inventories, rawSkus, boms } = useContext(AppContext);

    const inventoryList = inventories as InventoryItem[];
    const rawSkuList = rawSkus as RawSku[];
    const bomList = boms as Bom[];

    const totalInventoryStock = useMemo(
        () => inventoryList.reduce((sum, item) => sum + item.quantity, 0),
        [inventoryList],
    );
    const totalFinishedSkus = rawSkuList.length;
    const totalStockValue = useMemo(
        () => inventoryList.reduce((sum, item) => sum + item.quantity * item.unitCost, 0),
        [inventoryList],
    );
    const totalOrders = bomList.length;
    const ordersDispatchedThisMonth = useMemo(() => {
        const now = new Date();
        return bomList.filter((bom) => bom.status === 'Dispatch' && isSameMonth(new Date(bom.updatedAt), now)).length;
    }, [bomList]);

    const currentMonthLabel = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    return (
        <KpiCardRow
            columns={5}
            items={[
                { icon: HiOutlineCube, iconBg: '#e0f2fe', iconColor: '#0284c7', label: 'Total Inventory Stock', value: totalInventoryStock.toLocaleString('en-IN'), sublabel: 'Total units across Inventory Home', linkLabel: 'View inventory', onClick: () => navigate('/home') },
                { icon: HiOutlineArchiveBox, iconBg: '#dbeafe', iconColor: '#2563eb', label: 'Total Finished SKUs', value: totalFinishedSkus, sublabel: 'All items in inventory', linkLabel: 'View all SKUs', onClick: () => navigate('/raw-sku') },
                { icon: HiOutlineClipboardDocumentCheck, iconBg: '#dcfce7', iconColor: '#16a34a', label: 'Total Stock Value', value: `Rs. ${totalStockValue.toLocaleString('en-IN')}`, sublabel: 'Current inventory value', linkLabel: 'View inventory', onClick: () => navigate('/home') },
                { icon: HiOutlineSquares2X2, iconBg: '#ede9fe', iconColor: '#7c3aed', label: 'Total Orders', value: totalOrders, sublabel: 'All created orders', linkLabel: 'View all orders', onClick: () => navigate('/bom') },
                { icon: HiOutlineShoppingCart, iconBg: '#ffedd5', iconColor: '#ea580c', label: 'Orders Dispatched (This Month)', value: ordersDispatchedThisMonth, sublabel: `Till now in ${currentMonthLabel}`, linkLabel: 'View orders', onClick: () => navigate('/bom') },
            ]}
        />
    );
};
export default DashboardKpis;
