import { matchPath } from 'react-router-dom';

export interface RouteMeta {
    path: string;
    title: string;
    subtitle?: string;
}

export const routeMetaList: RouteMeta[] = [
    { path: '/', title: 'Dashboard', subtitle: "Welcome back, Admin! Here's what's happening with your inventory." },
    { path: '/material-inward', title: 'Material Inward', subtitle: 'Record new stock received from supplier and update inventory.' },
    { path: '/raw-sku', title: 'Raw SKU', subtitle: 'Manage all SKUs / components in your inventory.' },
    { path: '/locations', title: 'Locations', subtitle: 'Manage all locations where SKUs are stored in your warehouse.' },
    { path: '/category', title: 'Category', subtitle: 'Manage all product categories used to group SKUs.' },
    { path: '/product-type', title: 'Product Type', subtitle: 'Manage all product types used to classify inventory items.' },
    { path: '/home', title: 'Inventory Home', subtitle: 'Manage all inventory items and their product assembly.' },
    { path: '/transactions', title: 'Transactions', subtitle: 'View and manage all inventory transactions.' },
    { path: '/invoices', title: 'Invoices', subtitle: 'Create, view and manage all sales invoices.' },
    { path: '/reports', title: 'Reports', subtitle: 'View, analyze and export inventory reports.' },
    { path: '/users', title: 'Users', subtitle: 'Manage system users and their access.' },
];

export const getRouteMeta = (pathname: string): RouteMeta => {
    const found = routeMetaList.find((route) => matchPath({ path: route.path, end: true }, pathname));
    return found ?? { path: pathname, title: 'Dashboard' };
};