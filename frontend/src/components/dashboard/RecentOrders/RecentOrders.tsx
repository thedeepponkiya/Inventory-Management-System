import { useContext, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { HiOutlineClipboardDocumentList } from 'react-icons/hi2';
import DataTable from '../../../common/commonComponents/dataTable/DataTable';
import StatusBadge from '../../../common/commonComponents/statusBadge/StatusBadge';
import { AppContext } from '../../../context/AppContextDefinition';
import type { Bom } from '../../../services/bomService';
import '../Dashboard.css';

const RecentOrders = () => {
    const navigate = useNavigate();
    const { boms } = useContext(AppContext);
    const bomList = boms as Bom[];

    const recentOrders = useMemo(
        () => [...bomList].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 5),
        [bomList],
    );

    const recentOrdersColumns = [
        { field: 'bomCode' as const, header: 'Order Code', body: (row: Bom) => `#${row.bomCode}` },
        { field: 'productName' as const, header: 'Product' },
        { field: 'outputQty' as const, header: 'Output Qty', body: (row: Bom) => `${row.outputQty} ${row.unit}` },
        {
            field: 'status' as const,
            header: 'Status',
            body: (row: Bom) => <StatusBadge label={row.status} variant={row.status === 'Completed' ? 'success' : 'info'} />,
        },
    ];

    return (
        <div className="dashboard-card">
            <div className="dashboard-card-header">
                <h2><HiOutlineClipboardDocumentList size={18} className="dashboard-card-header-icon" />Recent Orders</h2>
                <span className="dashboard-card-link" onClick={() => navigate('/bom')}>View all</span>
            </div>
            <DataTable value={recentOrders} columns={recentOrdersColumns} paginator={false} />
        </div>
    );
};
export default RecentOrders;
