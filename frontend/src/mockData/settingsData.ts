export interface Settings {
    companyName: string;
    address: string;
    gstNumber: string;
    invoicePrefix: string;
    financialYear: string;
    theme: string;
}

export const settingsMockData: Settings = {
    companyName: 'Inventory System Pvt. Ltd.',
    address: '',
    gstNumber: '',
    invoicePrefix: 'INV-',
    financialYear: '2025-2026',
    theme: 'Light',
};
