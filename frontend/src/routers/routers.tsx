import { useContext } from 'react';
import type { ReactNode } from 'react';
import { HashRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import Header from '../common/commonComponents/header/Header';
import { AppContext } from '../context/AppContextDefinition';
import { useAuthContext } from '../context/AuthContextDefinition';
import { isModuleAllowed } from '../services/rolePermissionsService';
import NoAccess from '../common/commonComponents/noAccess/NoAccess';
import Dashboard from '../components/dashboard/Dashboard';
import MaterialInward from '../components/materialInward/MaterialInward';
import RawSku from '../components/rawSku/RawSku';
import Locations from '../components/locations/Locations';
import Category from '../components/category/Category';
import ProductType from '../components/productType/ProductType';
import Unit from '../components/unit/Unit';
import Vendor from '../components/vendor/Vendor';
import Customer from '../components/customer/Customer';
import InventoryHome from '../components/inventory/InventoryHome';
import Bom from '../components/bom/Bom';
import Invoices from '../components/invoices/Invoices';
import InvoiceForm from '../components/invoices/InvoiceForm';
import Reports from '../components/reports/Reports';
import Users from '../components/users/Users';
import PurchaseOrder from '../components/purchaseOrder/PurchaseOrder';
import PurchaseOrderForm from '../components/purchaseOrder/PurchaseOrderForm';
import SalesOrder from '../components/salesOrder/SalesOrder';
import SalesOrderForm from '../components/salesOrder/SalesOrderForm';
import Login from '../components/login/Login';
import DeveloperAdmin from '../components/developerAdmin/DeveloperAdmin';
import CrmProviders from '../features/crm/CrmProviders';
import CrmSourcesPage from '../features/crm/pages/CrmSourcesPage';
import CrmSettingsPage from '../features/crm/pages/CrmSettingsPage';
import CrmLeadsPage from '../features/crm/pages/CrmLeadsPage';
import CrmFollowupsPage from '../features/crm/pages/CrmFollowupsPage';
import CrmDashboardPage from '../features/crm/pages/CrmDashboardPage';
import CrmReportsPage from '../features/crm/pages/CrmReportsPage';
import './routers.css';
import SidePanel from '../common/commonComponents/sideBarNavigation/SideBarNavigation';

// Renders NoAccess instead of `element` whenever the logged-in user's role isn't permitted
// for the CURRENT url (see rolePermissionsService.ts) - this is what actually stops someone
// from reaching a page by typing/bookmarking its URL directly, since SideBarNavigation.tsx
// hiding the nav item only stops discovery through the UI, not direct navigation.
// '/developer-admin' is deliberately never wrapped in this - it already has its own dedicated
// isHidden-only guard (see DeveloperAdmin.tsx), and isn't one of rolePermissionsService.ts's
// known modules, so wrapping it here would incorrectly default-allow it to every role.
const ProtectedRoute = ({ element }: { element: ReactNode }) => {
    const location = useLocation();
    const { user } = useAuthContext();
    const { rolePermissions } = useContext(AppContext);
    if (!isModuleAllowed(location.pathname, user?.roleId ?? null, user?.isHidden ?? false, rolePermissions ?? {})) {
        return <NoAccess />;
    }
    return <>{element}</>;
};

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
                        <Route path='/' element={<ProtectedRoute element={<Dashboard />} />}></Route>
                        <Route path='/material-inward' element={<ProtectedRoute element={<MaterialInward />} />}></Route>
                        <Route path='/raw-sku' element={<ProtectedRoute element={<RawSku />} />}></Route>
                        <Route path='/locations' element={<ProtectedRoute element={<Locations />} />}></Route>
                        <Route path='/category' element={<ProtectedRoute element={<Category />} />}></Route>
                        <Route path='/product-type' element={<ProtectedRoute element={<ProductType />} />}></Route>
                        <Route path='/unit' element={<ProtectedRoute element={<Unit />} />}></Route>
                        <Route path='/vendor' element={<ProtectedRoute element={<Vendor />} />}></Route>
                        <Route path='/customer' element={<ProtectedRoute element={<Customer />} />}></Route>
                        <Route path='/home' element={<ProtectedRoute element={<InventoryHome />} />}></Route>
                        <Route path='/bom' element={<ProtectedRoute element={<Bom />} />}></Route>
                        <Route path='/invoices' element={<ProtectedRoute element={<Invoices />} />}></Route>
                        <Route path='/invoices/new' element={<ProtectedRoute element={<InvoiceForm />} />}></Route>
                        <Route path='/invoices/:id' element={<ProtectedRoute element={<InvoiceForm />} />}></Route>
                        <Route path='/reports' element={<ProtectedRoute element={<Reports />} />}></Route>
                        <Route path='/users' element={<ProtectedRoute element={<Users />} />}></Route>
                        <Route path='/developer-admin' element={<DeveloperAdmin />}></Route>
                        <Route path='/purchase-order' element={<ProtectedRoute element={<PurchaseOrder />} />}></Route>
                        <Route path='/purchase-order/new' element={<ProtectedRoute element={<PurchaseOrderForm />} />}></Route>
                        <Route path='/purchase-order/:id' element={<ProtectedRoute element={<PurchaseOrderForm />} />}></Route>
                        <Route path='/sales-order' element={<ProtectedRoute element={<SalesOrder />} />}></Route>
                        <Route path='/sales-order/new' element={<ProtectedRoute element={<SalesOrderForm />} />}></Route>
                        <Route path='/sales-order/:id' element={<ProtectedRoute element={<SalesOrderForm />} />}></Route>
                        <Route path='/crm' element={<ProtectedRoute element={<CrmProviders />} />}>
                            <Route index element={<CrmDashboardPage />}></Route>
                            <Route path='leads' element={<CrmLeadsPage />}></Route>
                            <Route path='followups' element={<CrmFollowupsPage />}></Route>
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
