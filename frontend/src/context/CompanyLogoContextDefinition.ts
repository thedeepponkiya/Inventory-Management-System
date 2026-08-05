import { createContext, useContext } from 'react';
import { DEFAULT_DATA_TYPE_VALUE } from '../common/constants/commonConstant';

// Split out from CompanyLogoContext.tsx so that file can export only the Provider component -
// exporting non-components (this context object, the hook/loader below) alongside a
// component breaks React Fast Refresh. Mirrors DateFormatContextDefinition.ts's structure.
const STORAGE_KEY = 'inventory-app:companyLogo';

export interface CompanyLogoContextValue {
    companyLogo: string | null;
    setCompanyLogo: (dataUrl: string | null) => void;
}

// Stored as a base64 data: URL (not a blob: URL) - data URLs survive a page reload via
// localStorage and can be embedded directly into a jsPDF document via doc.addImage(),
// whereas blob: URLs are revoked/invalidated once the originating session/tab context is gone.
export function loadCompanyLogoFromStorage(): string | null {
    try {
        return localStorage.getItem(STORAGE_KEY);
    } catch {
        return DEFAULT_DATA_TYPE_VALUE.NULL;
    }
}

export const CompanyLogoContext = createContext<CompanyLogoContextValue | null>(DEFAULT_DATA_TYPE_VALUE.NULL);

export function useCompanyLogoContext(): CompanyLogoContextValue {
    const ctx = useContext(CompanyLogoContext);
    if (!ctx) throw new Error('useCompanyLogoContext must be used within a CompanyLogoContextProvider');
    return ctx;
}
