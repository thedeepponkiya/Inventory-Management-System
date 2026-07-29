export const dashboardKpiMockData = {
    totalSkus: 152,
    totalStockValue: 1245600,
    totalKits: 48,
    kitsIssuedThisMonth: 126,
};

export const stockOverviewLabels = ['1 May', '5 May', '10 May', '15 May', '20 May', '25 May', '31 May'];

export const stockOverviewSeriesMockData = {
    inward: [1800, 2000, 2300, 2150, 2450, 2300, 2450],
    issued: [1200, 1350, 1500, 1420, 1620, 1550, 1620],
    available: [4200, 4600, 5100, 5400, 5830, 5700, 5830],
};

export interface LowStockAlert {
    id: string;
    skuName: string;
    currentStock: number;
    minStock: number;
}

export const lowStockAlertsMockData: LowStockAlert[] = [
    { id: 'LS-1', skuName: 'Handle', currentStock: 12, minStock: 50 },
    { id: 'LS-2', skuName: 'Plate', currentStock: 18, minStock: 40 },
    { id: 'LS-3', skuName: 'Spring', currentStock: 25, minStock: 60 },
    { id: 'LS-4', skuName: 'Bush', currentStock: 15, minStock: 40 },
    { id: 'LS-5', skuName: 'Screw', currentStock: 30, minStock: 80 },
];
