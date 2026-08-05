import './Dashboard.css';
import DashboardKpis from './DashboardKpis/DashboardKpis';
import LowStockAlerts from './LowStockAlerts/LowStockAlerts';
import OrdersTrend from './OrdersTrend/OrdersTrend';
import RecentOrders from './RecentOrders/RecentOrders';
import SkuMovement from './SkuMovement/SkuMovement';
import StockDistribution from './StockDistribution/StockDistribution';

const Dashboard = () => {
    return (
        <div className="dashboard-page">
            <DashboardKpis />

            <div className="dashboard-overview-grid">
                <OrdersTrend />
                <StockDistribution />
            </div>

            <div className="dashboard-grid">
                <div className="dashboard-main-col">
                    <RecentOrders />
                </div>
                <div className="dashboard-side-col">
                    <LowStockAlerts />
                </div>
            </div>

            <SkuMovement />

            {/* <div className="dashboard-overview-grid">
                <PurchaseOrderAnalytics />
                <MaterialInwardAnalytics />
            </div> */}

            {/* <RecentMaterialInwards /> */}
        </div>
    );
};
export default Dashboard;
