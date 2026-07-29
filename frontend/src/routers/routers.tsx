import { HashRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import Header from '../common/commonComponents/header/Header';
import { useAuthContext } from '../context/AuthContext';
import Dashboard from '../components/dashboard/Dashboard';
import MaterialInward from '../components/materialInward/MaterialInward';
import RawSku from '../components/rawSku/RawSku';
import Locations from '../components/locations/Locations';
import Category from '../components/category/Category';
import ProductType from '../components/productType/ProductType';
import InventoryHome from '../components/inventory/InventoryHome';
import Transactions from '../components/transactions/Transactions';
import Invoices from '../components/invoices/Invoices';
import Reports from '../components/reports/Reports';
import Users from '../components/users/Users';
import PurchaseOrder from '../components/purchaseOrder/PurchaseOrder';
import Login from '../components/login/Login';
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
                        <Route path='/sku-master' element={<RawSku />}></Route>
                        <Route path='/locations' element={<Locations />}></Route>
                        <Route path='/category' element={<Category />}></Route>
                        <Route path='/product-type' element={<ProductType />}></Route>
                        <Route path='/home' element={<InventoryHome />}></Route>
                        <Route path='/transactions' element={<Transactions />}></Route>
                        <Route path='/invoices' element={<Invoices />}></Route>
                        <Route path='/reports' element={<Reports />}></Route>
                        <Route path='/users' element={<Users />}></Route>
                        <Route path='/purchase-order' element={<PurchaseOrder />}></Route>
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
