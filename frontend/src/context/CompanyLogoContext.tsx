import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { DEFAULT_DATA_TYPE_VALUE } from '../common/constants/commonConstant';
import { CompanyLogoContext, loadCompanyLogoFromStorage } from './CompanyLogoContextDefinition';

const STORAGE_KEY = 'inventory-app:companyLogo';

function saveCompanyLogoToStorage(dataUrl: string | null): void {
    try {
        if (dataUrl) {
            localStorage.setItem(STORAGE_KEY, dataUrl);
        } else {
            localStorage.removeItem(STORAGE_KEY);
        }
    } catch {
        // Storage quota exceeded or unavailable (e.g. private browsing) - the logo just
        // won't survive a refresh, which is an acceptable fallback.
    }
}

const CompanyLogoContextProvider = ({ children }: { children: ReactNode }) => {
    const [companyLogo, setCompanyLogoState] = useState<string | null>(loadCompanyLogoFromStorage);

    useEffect(() => {
        saveCompanyLogoToStorage(companyLogo);
    }, [companyLogo]);

    const setCompanyLogo = (dataUrl: string | null) => setCompanyLogoState(dataUrl ?? DEFAULT_DATA_TYPE_VALUE.NULL);

    return <CompanyLogoContext.Provider value={{ companyLogo, setCompanyLogo }}>{children}</CompanyLogoContext.Provider>;
};
export default CompanyLogoContextProvider;
