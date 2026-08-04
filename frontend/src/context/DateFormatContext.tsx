import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import type { DateFormatOption } from '../common/commonFunctions/dateFormat';
import { DateFormatContext, loadDateFormatFromStorage } from './DateFormatContextDefinition';

const STORAGE_KEY = 'inventory-app:dateFormat';

function saveDateFormatToStorage(option: DateFormatOption): void {
    try {
        localStorage.setItem(STORAGE_KEY, option);
    } catch {
        // Storage quota exceeded or unavailable (e.g. private browsing) - the
        // preference just won't survive a refresh, which is an acceptable fallback.
    }
}

const DateFormatContextProvider = ({ children }: { children: ReactNode }) => {
    const [dateFormat, setDateFormatState] = useState<DateFormatOption>(loadDateFormatFromStorage);

    useEffect(() => {
        saveDateFormatToStorage(dateFormat);
    }, [dateFormat]);

    const setDateFormat = (option: DateFormatOption) => setDateFormatState(option);

    return <DateFormatContext.Provider value={{ dateFormat, setDateFormat }}>{children}</DateFormatContext.Provider>;
};
export default DateFormatContextProvider;
