import { createContext, useContext } from 'react';
import { DEFAULT_DATA_TYPE_VALUE } from '../common/constants/commonConstant';
import type { DateFormatOption } from '../common/commonFunctions/dateFormat';

// Split out from DateFormatContext.tsx so that file can export only the Provider component -
// exporting non-components (this context object, the hook/loader below) alongside a
// component breaks React Fast Refresh, forcing a full page reload on every edit instead
// of a hot swap. Mirrors ThemeContextDefinition.ts's structure.
const STORAGE_KEY = 'inventory-app:dateFormat';

export interface DateFormatContextValue {
    dateFormat: DateFormatOption;
    setDateFormat: (option: DateFormatOption) => void;
}

export function loadDateFormatFromStorage(): DateFormatOption {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        return stored === 'short' || stored === 'medium' || stored === 'long' ? stored : 'medium';
    } catch {
        return 'medium';
    }
}

export const DateFormatContext = createContext<DateFormatContextValue | null>(DEFAULT_DATA_TYPE_VALUE.NULL);

export function useDateFormatContext(): DateFormatContextValue {
    const ctx = useContext(DateFormatContext);
    if (!ctx) throw new Error('useDateFormatContext must be used within a DateFormatContextProvider');
    return ctx;
}
