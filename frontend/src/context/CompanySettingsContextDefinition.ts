import { createContext, useContext } from 'react';
import { DEFAULT_DATA_TYPE_VALUE } from '../common/constants/commonConstant';
import { settingsMockData } from '../mockData/settingsData';

// Split out from CompanySettingsContext.tsx so that file can export only the Provider
// component - exporting non-components alongside a component breaks React Fast Refresh.
// Mirrors CompanyLogoContextDefinition.ts's structure.
const STORAGE_KEY = 'inventory-app:companySettings';

export interface CompanySettings {
    companyName: string;
    address: string;
}

export interface CompanySettingsContextValue extends CompanySettings {
    setCompanyName: (value: string) => void;
    setAddress: (value: string) => void;
}

export function loadCompanySettingsFromStorage(): CompanySettings {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (!stored) return { companyName: settingsMockData.companyName, address: settingsMockData.address };
        const parsed = JSON.parse(stored);
        return {
            companyName: typeof parsed.companyName === 'string' ? parsed.companyName : settingsMockData.companyName,
            address: typeof parsed.address === 'string' ? parsed.address : settingsMockData.address,
        };
    } catch {
        return { companyName: settingsMockData.companyName, address: settingsMockData.address };
    }
}

export const CompanySettingsContext = createContext<CompanySettingsContextValue | null>(DEFAULT_DATA_TYPE_VALUE.NULL);

export function useCompanySettingsContext(): CompanySettingsContextValue {
    const ctx = useContext(CompanySettingsContext);
    if (!ctx) throw new Error('useCompanySettingsContext must be used within a CompanySettingsContextProvider');
    return ctx;
}
