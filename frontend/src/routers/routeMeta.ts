import { matchPath } from 'react-router-dom';

export interface RouteMeta {
    path: string;
    title: string;
    subtitle?: string;
}

export const routeMetaList: RouteMeta[] = [
    { path: '/', title: 'Dashboard', subtitle: "Welcome back, Admin! Here's what's happening with your inventory." },
    { path: '/material-inward', title: 'Material Inward', subtitle: 'Record new stock received from supplier and update inventory.' },
    { path: '/raw-sku', title: 'Finished SKU', subtitle: 'Manage all SKUs / components in your inventory.' },
    { path: '/locations', title: 'Locations', subtitle: 'Manage all locations where SKUs are stored in your warehouse.' },
    { path: '/category', title: 'Category', subtitle: 'Manage all product categories used to group SKUs.' },
    { path: '/product-type', title: 'Product Type', subtitle: 'Manage all product types used to classify inventory items.' },
    { path: '/unit', title: 'Unit', subtitle: 'Manage all units of measure used across inventory.' },
    { path: '/vendor', title: 'Vendor', subtitle: 'Manage all vendors you purchase raw materials and finished SKUs from.' },
    { path: '/customer', title: 'Customer', subtitle: 'Manage all customers you sell products to.' },
    { path: '/home', title: 'Inventory Home', subtitle: 'Manage all inventory items and their product assembly.' },
    { path: '/purchase-order/new', title: 'New Purchase Order', subtitle: 'Create a new purchase order raised to a vendor.' },
    { path: '/purchase-order/:id', title: 'Purchase Order Details', subtitle: 'View and manage this purchase order.' },
    { path: '/purchase-order', title: 'Purchase Order', subtitle: 'Create, track and manage all purchase orders raised to vendors.' },
    { path: '/bom', title: 'BOM', subtitle: 'Manage bill of materials and complete product assembly recipes.' },
    { path: '/sales-order/new', title: 'New Sales Order', subtitle: 'Create a new sales order raised by a customer.' },
    { path: '/sales-order/:id', title: 'Sales Order Details', subtitle: 'View and manage this sales order.' },
    { path: '/sales-order', title: 'Sales Order', subtitle: 'Create, track and manage all sales orders raised by customers.' },
    { path: '/transactions', title: 'Transactions', subtitle: 'View and manage all inventory transactions.' },
    { path: '/invoices/new', title: 'New Invoice', subtitle: 'Create a new sales invoice.' },
    { path: '/invoices/:id', title: 'Invoice Details', subtitle: 'View and manage this invoice.' },
    { path: '/invoices', title: 'Invoices', subtitle: 'Create, view and manage all sales invoices.' },
    { path: '/reports', title: 'Reports', subtitle: 'View, analyze and export inventory reports.' },
    { path: '/users', title: 'Users', subtitle: 'Manage system users and their access.' },
    { path: '/developer-admin', title: 'Developer Admin', subtitle: 'Internal area visible only to the hidden Super Admin account.' },
    { path: '/crm', title: 'CRM Dashboard', subtitle: 'Overview of your leads and pipeline.' },
    { path: '/crm/leads', title: 'Leads', subtitle: 'Manage all leads captured across every source, in table or Kanban view.' },
    { path: '/crm/followups', title: 'Follow-ups', subtitle: 'Track scheduled follow-ups across all leads.' },
    { path: '/crm/campaigns', title: 'Campaigns', subtitle: 'Manage marketing campaigns tied to your lead sources.' },
    { path: '/crm/sources', title: 'Sources', subtitle: 'Manage where your leads come from.' },
    { path: '/crm/reports', title: 'CRM Reports', subtitle: 'View, analyze and export CRM reports.' },
    { path: '/crm/settings', title: 'CRM Settings', subtitle: 'Customize pipeline stages and CRM preferences.' },
];

export const getRouteMeta = (pathname: string): RouteMeta => {
    const found = routeMetaList.find((route) => matchPath({ path: route.path, end: true }, pathname));
    return found ?? { path: pathname, title: 'Dashboard' };
};