import { HashRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import Header from '../common/commonComponents/header/Header';
import { useAuthContext } from '../context/AuthContextDefinition';
import Dashboard from '../components/dashboard/Dashboard';
import MaterialInward from '../components/materialInward/MaterialInward';
import RawSku from '../components/rawSku/RawSku';
import Locations from '../components/locations/Locations';
import Category from '../components/category/Category';
import ProductType from '../components/productType/ProductType';
import Vendor from '../components/vendor/Vendor';
import InventoryHome from '../components/inventory/InventoryHome';
import Bom from '../components/bom/Bom';
import Transactions from '../components/transactions/Transactions';
import Invoices from '../components/invoices/Invoices';
import InvoiceForm from '../components/invoices/InvoiceForm';
import Reports from '../components/reports/Reports';
import Users from '../components/users/Users';
import PurchaseOrder from '../components/purchaseOrder/PurchaseOrder';
import PurchaseOrderForm from '../components/purchaseOrder/PurchaseOrderForm';
import Login from '../components/login/Login';
import CrmProviders from '../features/crm/CrmProviders';
import CrmSourcesPage from '../features/crm/pages/CrmSourcesPage';
import CrmSettingsPage from '../features/crm/pages/CrmSettingsPage';
import CrmLeadsPage from '../features/crm/pages/CrmLeadsPage';
import CrmFollowupsPage from '../features/crm/pages/CrmFollowupsPage';
import CrmCampaignsPage from '../features/crm/pages/CrmCampaignsPage';
import CrmDashboardPage from '../features/crm/pages/CrmDashboardPage';
import CrmReportsPage from '../features/crm/pages/CrmReportsPage';
import './routers.css';
import SidePanel from '../common/commonComponents/sideBarNavigation/SideBarNavigation';

const AppRoutes = () => {
    const location = useLocation();
    const { isAuthenticated } = useAuthContext();

    if (!isAuthenticated) {
        return (
            <Routes>
                <Route path='/login' element={<Login />}></Route>
                <Route path='*' element={<Navigate to='/login' replace />}></Route>
            </Routes>
        );
    }

    if (location.pathname === '/login') {
        return <Navigate to='/' replace />;
    }

    return (
        <>
            <SidePanel></SidePanel>
            <div className='app-main-col'>
                <Header />
                <div className='app-content py-2 px-4'>
                    <Routes>
                        <Route path='/' element={<Dashboard />}></Route>
                        <Route path='/material-inward' element={<MaterialInward />}></Route>
                        <Route path='/raw-sku' element={<RawSku />}></Route>
                        <Route path='/locations' element={<Locations />}></Route>
                        <Route path='/category' element={<Category />}></Route>
                        <Route path='/product-type' element={<ProductType />}></Route>
                        <Route path='/vendor' element={<Vendor />}></Route>
                        <Route path='/home' element={<InventoryHome />}></Route>
                        <Route path='/bom' element={<Bom />}></Route>
                        <Route path='/transactions' element={<Transactions />}></Route>
                        <Route path='/invoices' element={<Invoices />}></Route>
                        <Route path='/invoices/new' element={<InvoiceForm />}></Route>
                        <Route path='/invoices/:id' element={<InvoiceForm />}></Route>
                        <Route path='/reports' element={<Reports />}></Route>
                        <Route path='/users' element={<Users />}></Route>
                        <Route path='/purchase-order' element={<PurchaseOrder />}></Route>
                        <Route path='/purchase-order/new' element={<PurchaseOrderForm />}></Route>
                        <Route path='/purchase-order/:id' element={<PurchaseOrderForm />}></Route>
                        <Route path='/crm' element={<CrmProviders />}>
                            <Route index element={<CrmDashboardPage />}></Route>
                            <Route path='leads' element={<CrmLeadsPage />}></Route>
                            <Route path='followups' element={<CrmFollowupsPage />}></Route>
                            <Route path='campaigns' element={<CrmCampaignsPage />}></Route>
                            <Route path='reports' element={<CrmReportsPage />}></Route>
                            <Route path='sources' element={<CrmSourcesPage />}></Route>
                            <Route path='settings' element={<CrmSettingsPage />}></Route>
                        </Route>
                    </Routes>
                </div>
            </div>
        </>
    );
};

const Router = () => {
    return (
        <div className='router-wrapper common-light-color'>
            <HashRouter>
                <AppRoutes />
            </HashRouter >
        </div >
    );
};
export default Router;
