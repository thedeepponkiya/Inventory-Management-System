import { useContext, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import DataTable from '../../../common/commonComponents/dataTable/DataTable';
import { AppContext } from '../../../context/AppContextDefinition';
import type { MaterialInward } from '../../../services/materialInwardService';
import { useDateFormatContext } from '../../../context/DateFormatContextDefinition';
import { formatDate } from '../../../common/commonFunctions/dateFormat';
import '../Dashboard.css';

const RecentMaterialInwards = () => {
    const navigate = useNavigate();
    const { dateFormat } = useDateFormatContext();
    const { materialInwards } = useContext(AppContext);
    const materialInwardList = materialInwards as MaterialInward[];

    const recentInwards = useMemo(
        () => [...materialInwardList].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 5),
        [materialInwardList],
    );

    const recentInwardsColumns = [
        { field: 'inwardNo' as const, header: 'Inward No.', body: (row: MaterialInward) => `#${row.inwardNo}` },
        { field: 'vendorName' as const, header: 'Vendor' },
        { field: 'purchaseOrderNo' as const, header: 'PO No.', body: (row: MaterialInward) => (row.purchaseOrderNo ? `#${row.purchaseOrderNo}` : '—') },
        { field: 'grandTotal' as const, header: 'Value', body: (row: MaterialInward) => `Rs. ${row.grandTotal.toLocaleString('en-IN')}` },
        { field: 'receivedDate' as const, header: 'Received Date', body: (row: MaterialInward) => formatDate(row.receivedDate, dateFormat) },
    ];

    return (
        <div className="dashboard-card">
            <div className="dashboard-card-header">
                <h2>Recent Material Inwards</h2>
                <span className="dashboard-card-link" onClick={() => navigate('/material-inward')}>View all</span>
            </div>
            <DataTable value={recentInwards} columns={recentInwardsColumns} paginator={false} />
        </div>
    );
};
export default RecentMaterialInwards;
