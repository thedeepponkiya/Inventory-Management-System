import * as React from 'react';
import { DEFAULT_DATA_TYPE_VALUE } from '../common/constants/commonConstant';
import { getLocations, type Location } from '../services/locationService';
import { getCategories, type Category } from '../services/categoryService';
import { getProductTypes, type ProductType } from '../services/productTypeService';
import { getVendors, type Vendor } from '../services/vendorService';
import { getPurchaseOrders, type PurchaseOrder } from '../services/purchaseOrderService';
import { getMaterialInwards, type MaterialInward } from '../services/materialInwardService';
import { getInvoices, type Invoice } from '../services/invoiceService';
import { getRawSkus, type RawSku } from '../services/rawSkuService';
import { getInventoryItems, type InventoryItem } from '../services/inventoryService';
import { AppContext } from './AppContextDefinition';

const AppContextProvider = (props: any) => {
    const [isSidePanelOpen, setIsSidePanelOpen] = React.useState(DEFAULT_DATA_TYPE_VALUE.FALSE);
    const [locations, setLocations] = React.useState<Location[]>([]);
    const [locationsLoading, setLocationsLoading] = React.useState(DEFAULT_DATA_TYPE_VALUE.TRUE);
    const [categories, setCategories] = React.useState<Category[]>([]);
    const [categoriesLoading, setCategoriesLoading] = React.useState(DEFAULT_DATA_TYPE_VALUE.TRUE);
    const [productTypes, setProductTypes] = React.useState<ProductType[]>([]);
    const [productTypesLoading, setProductTypesLoading] = React.useState(DEFAULT_DATA_TYPE_VALUE.TRUE);
    const [vendors, setVendors] = React.useState<Vendor[]>([]);
    const [vendorsLoading, setVendorsLoading] = React.useState(DEFAULT_DATA_TYPE_VALUE.TRUE);
    const [purchaseOrders, setPurchaseOrders] = React.useState<PurchaseOrder[]>([]);
    const [purchaseOrdersLoading, setPurchaseOrdersLoading] = React.useState(DEFAULT_DATA_TYPE_VALUE.TRUE);
    const [materialInwards, setMaterialInwards] = React.useState<MaterialInward[]>([]);
    const [materialInwardsLoading, setMaterialInwardsLoading] = React.useState(DEFAULT_DATA_TYPE_VALUE.TRUE);
    const [invoices, setInvoices] = React.useState<Invoice[]>([]);
    const [invoicesLoading, setInvoicesLoading] = React.useState(DEFAULT_DATA_TYPE_VALUE.TRUE);
    const [rawSkus, setRawSkus] = React.useState<RawSku[]>([]);
    const [rawSkusLoading, setRawSkusLoading] = React.useState(DEFAULT_DATA_TYPE_VALUE.TRUE);
    const [inventories, setInventories] = React.useState<InventoryItem[]>([]);
    const [inventoriesLoading, setInventoriesLoading] = React.useState(DEFAULT_DATA_TYPE_VALUE.TRUE);

    const fetchLocations = React.useCallback(() => {
        getLocations()
            .then((data) => setLocations(data))
            .catch(() => setLocations([]))
            .finally(() => setLocationsLoading(DEFAULT_DATA_TYPE_VALUE.FALSE));
    }, []);

    const fetchCategories = React.useCallback(() => {
        getCategories()
            .then((data) => setCategories(data))
            .catch(() => setCategories([]))
            .finally(() => setCategoriesLoading(DEFAULT_DATA_TYPE_VALUE.FALSE));
    }, []);

    const fetchProductTypes = React.useCallback(() => {
        getProductTypes()
            .then((data) => setProductTypes(data))
            .catch(() => setProductTypes([]))
            .finally(() => setProductTypesLoading(DEFAULT_DATA_TYPE_VALUE.FALSE));
    }, []);

    const fetchVendors = React.useCallback(() => {
        getVendors()
            .then((data) => setVendors(data))
            .catch(() => setVendors([]))
            .finally(() => setVendorsLoading(DEFAULT_DATA_TYPE_VALUE.FALSE));
    }, []);

    const fetchPurchaseOrders = React.useCallback(() => {
        getPurchaseOrders()
            .then((data) => setPurchaseOrders(data))
            .catch(() => setPurchaseOrders([]))
            .finally(() => setPurchaseOrdersLoading(DEFAULT_DATA_TYPE_VALUE.FALSE));
    }, []);

    const fetchMaterialInwards = React.useCallback(() => {
        getMaterialInwards()
            .then((data) => setMaterialInwards(data))
            .catch(() => setMaterialInwards([]))
            .finally(() => setMaterialInwardsLoading(DEFAULT_DATA_TYPE_VALUE.FALSE));
    }, []);

    const fetchInvoices = React.useCallback(() => {
        getInvoices()
            .then((data) => setInvoices(data))
            .catch(() => setInvoices([]))
            .finally(() => setInvoicesLoading(DEFAULT_DATA_TYPE_VALUE.FALSE));
    }, []);

    const fetchRawSkus = React.useCallback(() => {
        getRawSkus()
            .then((data) => setRawSkus(data))
            .catch(() => setRawSkus([]))
            .finally(() => setRawSkusLoading(DEFAULT_DATA_TYPE_VALUE.FALSE));
    }, []);

    const fetchInventories = React.useCallback(() => {
        getInventoryItems()
            .then((data) => setInventories(data))
            .catch(() => setInventories([]))
            .finally(() => setInventoriesLoading(DEFAULT_DATA_TYPE_VALUE.FALSE));
    }, []);

    React.useEffect(() => {
        fetchLocations();
        fetchCategories();
        fetchProductTypes();
        fetchVendors();
        fetchPurchaseOrders();
        fetchMaterialInwards();
        fetchInvoices();
        fetchRawSkus();
        fetchInventories();
    }, [fetchLocations, fetchCategories, fetchProductTypes, fetchVendors, fetchPurchaseOrders, fetchMaterialInwards, fetchInvoices, fetchRawSkus, fetchInventories]);

    return (
        <>
            <AppContext.Provider
                value={{
                    setIsSidePanelOpen,
                    isSidePanelOpen,
                    locations,
                    locationsLoading,
                    fetchLocations,
                    categories,
                    categoriesLoading,
                    fetchCategories,
                    productTypes,
                    productTypesLoading,
                    fetchProductTypes,
                    vendors,
                    vendorsLoading,
                    fetchVendors,
                    purchaseOrders,
                    purchaseOrdersLoading,
                    fetchPurchaseOrders,
                    materialInwards,
                    materialInwardsLoading,
                    fetchMaterialInwards,
                    invoices,
                    invoicesLoading,
                    fetchInvoices,
                    rawSkus,
                    rawSkusLoading,
                    fetchRawSkus,
                    inventories,
                    inventoriesLoading,
                    fetchInventories,
                }}>
                {props.children}
            </AppContext.Provider >
        </>
    )
};
export default AppContextProvider;
