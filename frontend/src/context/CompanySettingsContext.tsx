import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { CompanySettingsContext, loadCompanySettingsFromStorage, type CompanySettings } from './CompanySettingsContextDefinition';

const STORAGE_KEY = 'inventory-app:companySettings';

function saveCompanySettingsToStorage(settings: CompanySettings): void {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {
        // Storage quota exceeded or unavailable (e.g. private browsing) - the settings just
        // won't survive a refresh, which is an acceptable fallback.
    }
}

const CompanySettingsContextProvider = ({ children }: { children: ReactNode }) => {
    const [settings, setSettings] = useState<CompanySettings>(loadCompanySettingsFromStorage);

    useEffect(() => {
        saveCompanySettingsToStorage(settings);
    }, [settings]);

    const setCompanyName = (companyName: string) => setSettings((prev) => ({ ...prev, companyName }));
    const setAddress = (address: string) => setSettings((prev) => ({ ...prev, address }));

    return (
        <CompanySettingsContext.Provider value={{ ...settings, setCompanyName, setAddress }}>
            {children}
        </CompanySettingsContext.Provider>
    );
};
export default CompanySettingsContextProvider;
