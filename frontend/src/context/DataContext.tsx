import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';

import { skuMockData, type Sku } from '../mockData/skuData';
import { categoryMockData, type Category } from '../mockData/categoryData';
import { productTypeMockData, type ProductType } from '../mockData/productTypeData';
import { locationMockData, type Location } from '../mockData/locationData';
import { inventoryHomeMockData, type InventoryItem } from '../mockData/inventoryHomeData';
import { transactionMockData, type Transaction } from '../mockData/transactionData';
import { invoiceMockData, type Invoice } from '../mockData/invoiceData';
import { userMockData, type User } from '../mockData/userData';
import {
    dashboardKpiMockData,
    stockOverviewLabels,
    stockOverviewSeriesMockData,
    lowStockAlertsMockData,
    type LowStockAlert,
} from '../mockData/dashboardData';
import {
    reportKpiMockData,
    reportCategoriesMockData,
    recentReportsMockData,
    type ReportCategory,
    type RecentReport,
} from '../mockData/reportData';
import {
    supplierMockData,
    transporterMockData,
    recentInwardsMockData,
    type RecentInward,
} from '../mockData/materialInwardData';
import { settingsMockData, type Settings } from '../mockData/settingsData';
import { purchaseOrderMockData, type PurchaseOrder } from '../mockData/purchaseOrderData';

export type DashboardKpis = typeof dashboardKpiMockData;
export type StockOverviewSeries = typeof stockOverviewSeriesMockData;
export type ReportKpiSummary = typeof reportKpiMockData;

export interface CreateMaterialInwardRequest {
    invoiceNo: string;
    supplier: string;
    invoiceDate: Date;
    referenceNo: string;
    transporter: string;
    receivedBy: string;
    notes: string;
    items: { categoryName: string; skuCode: string; batchNo: string; qty: number; unitPrice: number }[];
    paymentStatus: string;
    paymentMode: string;
    remarks: string;
}

// Temporary stand-in for a real database while the Node.js + PostgreSQL API is being
// built. Each domain's in-memory array below is seeded from here (falling back to its
// mock data on first run) and persisted back on every create/update/delete, so data
// survives a page refresh within the same browser. Delete once the real API exists.
const STORAGE_PREFIX = 'inventory-app:';

function loadFromStorage<T>(key: string, fallback: T): T {
    try {
        const raw = localStorage.getItem(STORAGE_PREFIX + key);
        return raw ? (JSON.parse(raw) as T) : fallback;
    } catch {
        return fallback;
    }
}

function saveToStorage<T>(key: string, data: T): void {
    try {
        localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(data));
    } catch {
        // Storage quota exceeded or unavailable (e.g. private browsing) - safe to ignore.
    }
}

function simulateRequest<T>(data: T, delayMs = 300): Promise<T> {
    return new Promise((resolve) => {
        setTimeout(() => resolve(data), delayMs);
    });
}

// Module-level "database" per domain, so it persists across re-renders and every
// consumer of the context, the same way a real API's server-side store would.
let skusStore: Sku[] = loadFromStorage('skus', skuMockData);
let categoriesStore: Category[] = loadFromStorage('categories', categoryMockData);
let productTypesStore: ProductType[] = loadFromStorage('productTypes', productTypeMockData);
let locationsStore: Location[] = loadFromStorage('locations', locationMockData);
let inventoryItemsStore: InventoryItem[] = loadFromStorage('inventoryHomeItems', inventoryHomeMockData);
const transactionsStore: Transaction[] = [...transactionMockData];
const invoicesStore: Invoice[] = [...invoiceMockData];
let purchaseOrdersStore: PurchaseOrder[] = loadFromStorage('purchaseOrders', purchaseOrderMockData);
let usersStore: User[] = loadFromStorage('users', userMockData);
let recentInwardsStore: RecentInward[] = [...recentInwardsMockData];
let settingsStore: Settings = { ...settingsMockData };

export interface AsyncSlice<T> {
    data: T;
    loading: boolean;
    error: string | null;
}

function idleSlice<T>(initial: T): AsyncSlice<T> {
    return { data: initial, loading: true, error: null };
}

export interface DashboardData {
    kpis: DashboardKpis;
    stockOverviewLabels: string[];
    stockOverviewSeries: StockOverviewSeries;
    lowStockAlerts: LowStockAlert[];
}

export interface ReportsData {
    summary: ReportKpiSummary;
    categories: ReportCategory[];
    recent: RecentReport[];
}

export interface MaterialInwardOptionsData {
    suppliers: string[];
    transporters: string[];
    recentInwards: RecentInward[];
}

export interface DataContextValue {
    skus: AsyncSlice<Sku[]>;
    categories: AsyncSlice<Category[]>;
    productTypes: AsyncSlice<ProductType[]>;
    locations: AsyncSlice<Location[]>;
    inventoryHomeItems: AsyncSlice<InventoryItem[]>;
    transactions: AsyncSlice<Transaction[]>;
    invoices: AsyncSlice<Invoice[]>;
    purchaseOrders: AsyncSlice<PurchaseOrder[]>;
    users: AsyncSlice<User[]>;
    dashboard: AsyncSlice<DashboardData>;
    reports: AsyncSlice<ReportsData>;
    materialInwardOptions: AsyncSlice<MaterialInwardOptionsData>;
    settings: AsyncSlice<Settings>;
    createSku: (payload: Omit<Sku, 'id' | 'code'>) => Promise<void>;
    updateSku: (id: string, payload: Partial<Omit<Sku, 'id' | 'code'>>) => Promise<void>;
    deleteSku: (id: string) => Promise<void>;
    createLocation: (payload: Omit<Location, 'id' | 'code' | 'totalSkus'>) => Promise<void>;
    updateLocation: (id: string, payload: Partial<Omit<Location, 'id' | 'code'>>) => Promise<void>;
    deleteLocation: (id: string) => Promise<void>;
    createCategory: (payload: Omit<Category, 'id' | 'code' | 'skuCount'>) => Promise<void>;
    updateCategory: (id: string, payload: Partial<Omit<Category, 'id' | 'code' | 'skuCount'>>) => Promise<void>;
    deleteCategory: (id: string) => Promise<void>;
    createProductType: (payload: Omit<ProductType, 'id' | 'code'>) => Promise<void>;
    updateProductType: (id: string, payload: Partial<Omit<ProductType, 'id' | 'code'>>) => Promise<void>;
    deleteProductType: (id: string) => Promise<void>;
    createInventoryHomeItem: (payload: Omit<InventoryItem, 'id' | 'createdDate'>) => Promise<void>;
    updateInventoryHomeItem: (id: string, payload: Partial<Omit<InventoryItem, 'id' | 'createdDate'>>) => Promise<void>;
    deleteInventoryHomeItem: (id: string) => Promise<void>;
    createUser: (payload: Omit<User, 'id'>) => Promise<void>;
    updateUser: (id: string, payload: Partial<Omit<User, 'id'>>) => Promise<void>;
    deleteUser: (id: string) => Promise<void>;
    createMaterialInward: (payload: CreateMaterialInwardRequest) => Promise<void>;
    createPurchaseOrder: (payload: Omit<PurchaseOrder, 'id' | 'poNumber'>) => Promise<void>;
    updatePurchaseOrder: (id: string, payload: Partial<Omit<PurchaseOrder, 'id' | 'poNumber'>>) => Promise<void>;
    deletePurchaseOrder: (id: string) => Promise<void>;
    updateSettings: (payload: Settings) => Promise<void>;
    refetch: () => void;
}

const emptyDashboardKpis: DashboardKpis = { totalSkus: 0, totalStockValue: 0, totalKits: 0, kitsIssuedThisMonth: 0 };
const emptyStockOverviewSeries: StockOverviewSeries = { inward: [], issued: [], available: [] };
const emptyReportSummary: ReportKpiSummary = {
    totalInwardValue: 0,
    totalIssueValue: 0,
    totalTransferValue: 0,
    totalReturnValue: 0,
    currentStockValue: 0,
};
const emptySettings: Settings = { companyName: '', address: '', gstNumber: '', invoicePrefix: '', financialYear: '', theme: 'Light' };

export const DataContext = createContext<DataContextValue | null>(null);

export function useDataContext(): DataContextValue {
    const ctx = useContext(DataContext);
    if (!ctx) throw new Error('useDataContext must be used within a DataContextProvider');
    return ctx;
}

const DataContextProvider = ({ children }: { children: ReactNode }) => {
    const [skus, setSkus] = useState<AsyncSlice<Sku[]>>(idleSlice([]));
    const [categories, setCategories] = useState<AsyncSlice<Category[]>>(idleSlice([]));
    const [productTypes, setProductTypes] = useState<AsyncSlice<ProductType[]>>(idleSlice([]));
    const [locations, setLocations] = useState<AsyncSlice<Location[]>>(idleSlice([]));
    const [inventoryHomeItems, setInventoryHomeItems] = useState<AsyncSlice<InventoryItem[]>>(idleSlice([]));
    const [transactions, setTransactions] = useState<AsyncSlice<Transaction[]>>(idleSlice([]));
    const [invoices, setInvoices] = useState<AsyncSlice<Invoice[]>>(idleSlice([]));
    const [purchaseOrders, setPurchaseOrders] = useState<AsyncSlice<PurchaseOrder[]>>(idleSlice([]));
    const [users, setUsers] = useState<AsyncSlice<User[]>>(idleSlice([]));
    const [dashboard, setDashboard] = useState<AsyncSlice<DashboardData>>(
        idleSlice({ kpis: emptyDashboardKpis, stockOverviewLabels: [], stockOverviewSeries: emptyStockOverviewSeries, lowStockAlerts: [] }),
    );
    const [reports, setReports] = useState<AsyncSlice<ReportsData>>(
        idleSlice({ summary: emptyReportSummary, categories: [], recent: [] }),
    );
    const [materialInwardOptions, setMaterialInwardOptions] = useState<AsyncSlice<MaterialInwardOptionsData>>(
        idleSlice({ suppliers: [], transporters: [], recentInwards: [] }),
    );
    const [settings, setSettings] = useState<AsyncSlice<Settings>>(idleSlice(emptySettings));

    const fetchAll = useCallback(() => {
        simulateRequest(skusStore)
            .then((data) => setSkus({ data, loading: false, error: null }))
            .catch(() => setSkus((prev) => ({ ...prev, loading: false, error: 'Failed to load SKUs' })));

        simulateRequest(categoriesStore)
            .then((data) => setCategories({ data, loading: false, error: null }))
            .catch(() => setCategories((prev) => ({ ...prev, loading: false, error: 'Failed to load categories' })));

        simulateRequest(productTypesStore)
            .then((data) => setProductTypes({ data, loading: false, error: null }))
            .catch(() => setProductTypes((prev) => ({ ...prev, loading: false, error: 'Failed to load product types' })));

        simulateRequest(locationsStore)
            .then((data) => setLocations({ data, loading: false, error: null }))
            .catch(() => setLocations((prev) => ({ ...prev, loading: false, error: 'Failed to load locations' })));

        simulateRequest(inventoryItemsStore)
            .then((data) => setInventoryHomeItems({ data, loading: false, error: null }))
            .catch(() => setInventoryHomeItems((prev) => ({ ...prev, loading: false, error: 'Failed to load inventory items' })));

        simulateRequest(transactionsStore)
            .then((data) => setTransactions({ data, loading: false, error: null }))
            .catch(() => setTransactions((prev) => ({ ...prev, loading: false, error: 'Failed to load transactions' })));

        simulateRequest(invoicesStore)
            .then((data) => setInvoices({ data, loading: false, error: null }))
            .catch(() => setInvoices((prev) => ({ ...prev, loading: false, error: 'Failed to load invoices' })));

        simulateRequest(purchaseOrdersStore)
            .then((data) => setPurchaseOrders({ data, loading: false, error: null }))
            .catch(() => setPurchaseOrders((prev) => ({ ...prev, loading: false, error: 'Failed to load purchase orders' })));

        simulateRequest(usersStore)
            .then((data) => setUsers({ data, loading: false, error: null }))
            .catch(() => setUsers((prev) => ({ ...prev, loading: false, error: 'Failed to load users' })));

        Promise.all([
            simulateRequest(dashboardKpiMockData),
            simulateRequest({ labels: stockOverviewLabels, series: stockOverviewSeriesMockData }),
            simulateRequest(lowStockAlertsMockData),
        ])
            .then(([kpis, overview, lowStockAlerts]) => {
                setDashboard({
                    data: { kpis, stockOverviewLabels: overview.labels, stockOverviewSeries: overview.series, lowStockAlerts },
                    loading: false,
                    error: null,
                });
            })
            .catch(() => setDashboard((prev) => ({ ...prev, loading: false, error: 'Failed to load dashboard data' })));

        Promise.all([simulateRequest(reportKpiMockData), simulateRequest(reportCategoriesMockData), simulateRequest(recentReportsMockData)])
            .then(([summary, categoriesData, recent]) => {
                setReports({ data: { summary, categories: categoriesData, recent }, loading: false, error: null });
            })
            .catch(() => setReports((prev) => ({ ...prev, loading: false, error: 'Failed to load reports' })));

        Promise.all([simulateRequest(supplierMockData), simulateRequest(transporterMockData), simulateRequest(recentInwardsStore)])
            .then(([suppliers, transporters, recentInwards]) => {
                setMaterialInwardOptions({ data: { suppliers, transporters, recentInwards }, loading: false, error: null });
            })
            .catch(() => setMaterialInwardOptions((prev) => ({ ...prev, loading: false, error: 'Failed to load material inward options' })));

        simulateRequest(settingsStore)
            .then((data) => setSettings({ data, loading: false, error: null }))
            .catch(() => setSettings((prev) => ({ ...prev, loading: false, error: 'Failed to load settings' })));
    }, []);

    useEffect(() => {
        fetchAll();
    }, [fetchAll]);

    const createSku = async (payload: Omit<Sku, 'id' | 'code'>) => {
        const nextCode = `SKU-${String(skusStore.length + 1).padStart(3, '0')}`;
        const created: Sku = { id: nextCode, code: nextCode, ...payload };
        skusStore = [...skusStore, created];
        saveToStorage('skus', skusStore);
        await simulateRequest(created);
        setSkus((prev) => ({ ...prev, data: [...prev.data, created] }));
    };

    const updateSku = async (id: string, payload: Partial<Omit<Sku, 'id' | 'code'>>) => {
        let updated: Sku | undefined;
        skusStore = skusStore.map((sku) => {
            if (sku.id !== id) return sku;
            updated = { ...sku, ...payload };
            return updated;
        });
        saveToStorage('skus', skusStore);
        await simulateRequest(updated);
        if (!updated) return;
        setSkus((prev) => ({ ...prev, data: prev.data.map((sku) => (sku.id === id ? updated! : sku)) }));
    };

    const deleteSku = async (id: string) => {
        skusStore = skusStore.filter((sku) => sku.id !== id);
        saveToStorage('skus', skusStore);
        await simulateRequest(undefined);
        setSkus((prev) => ({ ...prev, data: prev.data.filter((sku) => sku.id !== id) }));
    };

    const createLocation = async (payload: Omit<Location, 'id' | 'code' | 'totalSkus'>) => {
        const nextCode = `LOC-${String(locationsStore.length + 1).padStart(3, '0')}`;
        const created: Location = { id: nextCode, code: nextCode, totalSkus: 0, ...payload };
        locationsStore = [...locationsStore, created];
        saveToStorage('locations', locationsStore);
        await simulateRequest(created);
        setLocations((prev) => ({ ...prev, data: [...prev.data, created] }));
    };

    const updateLocation = async (id: string, payload: Partial<Omit<Location, 'id' | 'code'>>) => {
        let updated: Location | undefined;
        locationsStore = locationsStore.map((location) => {
            if (location.id !== id) return location;
            updated = { ...location, ...payload };
            return updated;
        });
        saveToStorage('locations', locationsStore);
        await simulateRequest(updated);
        if (!updated) return;
        setLocations((prev) => ({ ...prev, data: prev.data.map((location) => (location.id === id ? updated! : location)) }));
    };

    const deleteLocation = async (id: string) => {
        locationsStore = locationsStore.filter((location) => location.id !== id);
        saveToStorage('locations', locationsStore);
        await simulateRequest(undefined);
        setLocations((prev) => ({ ...prev, data: prev.data.filter((location) => location.id !== id) }));
    };

    const createCategory = async (payload: Omit<Category, 'id' | 'code' | 'skuCount'>) => {
        const nextCode = `CAT-${String(categoriesStore.length + 1).padStart(3, '0')}`;
        const created: Category = { id: nextCode, code: nextCode, skuCount: 0, ...payload };
        categoriesStore = [...categoriesStore, created];
        saveToStorage('categories', categoriesStore);
        await simulateRequest(created);
        setCategories((prev) => ({ ...prev, data: [...prev.data, created] }));
    };

    const updateCategory = async (id: string, payload: Partial<Omit<Category, 'id' | 'code' | 'skuCount'>>) => {
        let updated: Category | undefined;
        categoriesStore = categoriesStore.map((category) => {
            if (category.id !== id) return category;
            updated = { ...category, ...payload };
            return updated;
        });
        saveToStorage('categories', categoriesStore);
        await simulateRequest(updated);
        if (!updated) return;
        setCategories((prev) => ({ ...prev, data: prev.data.map((category) => (category.id === id ? updated! : category)) }));
    };

    const deleteCategory = async (id: string) => {
        categoriesStore = categoriesStore.filter((category) => category.id !== id);
        saveToStorage('categories', categoriesStore);
        await simulateRequest(undefined);
        setCategories((prev) => ({ ...prev, data: prev.data.filter((category) => category.id !== id) }));
    };

    const createProductType = async (payload: Omit<ProductType, 'id' | 'code'>) => {
        const nextCode = `PT-${String(productTypesStore.length + 1).padStart(3, '0')}`;
        const created: ProductType = { id: nextCode, code: nextCode, ...payload };
        productTypesStore = [...productTypesStore, created];
        saveToStorage('productTypes', productTypesStore);
        await simulateRequest(created);
        setProductTypes((prev) => ({ ...prev, data: [...prev.data, created] }));
    };

    const updateProductType = async (id: string, payload: Partial<Omit<ProductType, 'id' | 'code'>>) => {
        let updated: ProductType | undefined;
        productTypesStore = productTypesStore.map((type) => {
            if (type.id !== id) return type;
            updated = { ...type, ...payload };
            return updated;
        });
        saveToStorage('productTypes', productTypesStore);
        await simulateRequest(updated);
        if (!updated) return;
        setProductTypes((prev) => ({ ...prev, data: prev.data.map((type) => (type.id === id ? updated! : type)) }));
    };

    const deleteProductType = async (id: string) => {
        productTypesStore = productTypesStore.filter((type) => type.id !== id);
        saveToStorage('productTypes', productTypesStore);
        await simulateRequest(undefined);
        setProductTypes((prev) => ({ ...prev, data: prev.data.filter((type) => type.id !== id) }));
    };

    const createInventoryHomeItem = async (payload: Omit<InventoryItem, 'id' | 'createdDate'>) => {
        const createdDate = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
        const created: InventoryItem = { id: payload.skuId, createdDate, ...payload };
        inventoryItemsStore = [...inventoryItemsStore, created];
        saveToStorage('inventoryHomeItems', inventoryItemsStore);
        await simulateRequest(created);
        setInventoryHomeItems((prev) => ({ ...prev, data: [...prev.data, created] }));
    };

    const updateInventoryHomeItem = async (id: string, payload: Partial<Omit<InventoryItem, 'id' | 'createdDate'>>) => {
        let updated: InventoryItem | undefined;
        inventoryItemsStore = inventoryItemsStore.map((item) => {
            if (item.id !== id) return item;
            updated = { ...item, ...payload };
            return updated;
        });
        saveToStorage('inventoryHomeItems', inventoryItemsStore);
        await simulateRequest(updated);
        if (!updated) return;
        setInventoryHomeItems((prev) => ({ ...prev, data: prev.data.map((item) => (item.id === id ? updated! : item)) }));
    };

    const deleteInventoryHomeItem = async (id: string) => {
        inventoryItemsStore = inventoryItemsStore.filter((item) => item.id !== id);
        saveToStorage('inventoryHomeItems', inventoryItemsStore);
        await simulateRequest(undefined);
        setInventoryHomeItems((prev) => ({ ...prev, data: prev.data.filter((item) => item.id !== id) }));
    };

    const createUser = async (payload: Omit<User, 'id'>) => {
        const nextId = `USR-${String(usersStore.length + 1).padStart(3, '0')}`;
        const created: User = { id: nextId, ...payload };
        usersStore = [...usersStore, created];
        saveToStorage('users', usersStore);
        await simulateRequest(created);
        setUsers((prev) => ({ ...prev, data: [...prev.data, created] }));
    };

    const updateUser = async (id: string, payload: Partial<Omit<User, 'id'>>) => {
        let updated: User | undefined;
        usersStore = usersStore.map((user) => {
            if (user.id !== id) return user;
            updated = { ...user, ...payload };
            return updated;
        });
        saveToStorage('users', usersStore);
        await simulateRequest(updated);
        if (!updated) return;
        setUsers((prev) => ({ ...prev, data: prev.data.map((user) => (user.id === id ? updated! : user)) }));
    };

    const deleteUser = async (id: string) => {
        usersStore = usersStore.filter((user) => user.id !== id);
        saveToStorage('users', usersStore);
        await simulateRequest(undefined);
        setUsers((prev) => ({ ...prev, data: prev.data.filter((user) => user.id !== id) }));
    };

    const createMaterialInward = async (payload: CreateMaterialInwardRequest) => {
        const totalAmount = payload.items.reduce((sum, item) => sum + item.qty * item.unitPrice, 0);
        const created: RecentInward = {
            id: `MI-${recentInwardsStore.length + 1}`,
            invoiceNo: payload.invoiceNo,
            date: payload.invoiceDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
            amount: totalAmount,
            paymentStatus: payload.paymentStatus === 'Paid' ? 'Paid' : 'Unpaid',
        };
        recentInwardsStore = [created, ...recentInwardsStore];
        await simulateRequest(created);
        setMaterialInwardOptions((prev) => ({ ...prev, data: { ...prev.data, recentInwards: [created, ...prev.data.recentInwards] } }));
    };

    const createPurchaseOrder = async (payload: Omit<PurchaseOrder, 'id' | 'poNumber'>) => {
        const nextSeq = purchaseOrdersStore.length + 1;
        const created: PurchaseOrder = { id: `PO-${nextSeq}`, poNumber: `PO-2025-${String(nextSeq).padStart(6, '0')}`, ...payload };
        purchaseOrdersStore = [...purchaseOrdersStore, created];
        saveToStorage('purchaseOrders', purchaseOrdersStore);
        await simulateRequest(created);
        setPurchaseOrders((prev) => ({ ...prev, data: [...prev.data, created] }));
    };

    const updatePurchaseOrder = async (id: string, payload: Partial<Omit<PurchaseOrder, 'id' | 'poNumber'>>) => {
        let updated: PurchaseOrder | undefined;
        purchaseOrdersStore = purchaseOrdersStore.map((po) => {
            if (po.id !== id) return po;
            updated = { ...po, ...payload };
            return updated;
        });
        saveToStorage('purchaseOrders', purchaseOrdersStore);
        await simulateRequest(updated);
        if (!updated) return;
        setPurchaseOrders((prev) => ({ ...prev, data: prev.data.map((po) => (po.id === id ? updated! : po)) }));
    };

    const deletePurchaseOrder = async (id: string) => {
        purchaseOrdersStore = purchaseOrdersStore.filter((po) => po.id !== id);
        saveToStorage('purchaseOrders', purchaseOrdersStore);
        await simulateRequest(undefined);
        setPurchaseOrders((prev) => ({ ...prev, data: prev.data.filter((po) => po.id !== id) }));
    };

    const updateSettings = async (payload: Settings) => {
        settingsStore = { ...payload };
        const updated = await simulateRequest(settingsStore);
        setSettings((prev) => ({ ...prev, data: updated }));
    };

    return (
        <DataContext.Provider
            value={{
                skus,
                categories,
                productTypes,
                locations,
                inventoryHomeItems,
                transactions,
                invoices,
                purchaseOrders,
                users,
                dashboard,
                reports,
                materialInwardOptions,
                settings,
                createSku,
                updateSku,
                deleteSku,
                createLocation,
                updateLocation,
                deleteLocation,
                createCategory,
                updateCategory,
                deleteCategory,
                createProductType,
                updateProductType,
                deleteProductType,
                createInventoryHomeItem,
                updateInventoryHomeItem,
                deleteInventoryHomeItem,
                createUser,
                updateUser,
                deleteUser,
                createMaterialInward,
                createPurchaseOrder,
                updatePurchaseOrder,
                deletePurchaseOrder,
                updateSettings,
                refetch: fetchAll,
            }}
        >
            {children}
        </DataContext.Provider>
    );
};

export default DataContextProvider;
