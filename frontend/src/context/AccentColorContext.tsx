import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import {
    AccentColorContext, getAccentHex, loadAccentColorFromStorage, type AccentColorKey,
} from './AccentColorContextDefinition';

const STORAGE_KEY = 'inventory-app:accent-color';

function saveAccentColorToStorage(key: AccentColorKey): void {
    try {
        localStorage.setItem(STORAGE_KEY, key);
    } catch {
        // Storage quota exceeded or unavailable (e.g. private browsing) - the
        // preference just won't survive a refresh, which is an acceptable fallback.
    }
}

const AccentColorContextProvider = ({ children }: { children: ReactNode }) => {
    const [accentColor, setAccentColorState] = useState<AccentColorKey>(loadAccentColorFromStorage);

    // --accent-primary (index.css) is what every "brand blue" surface across the app derives
    // from via color-mix() - see themeOverrides.css and index.css's own comments. Setting it
    // as an inline style on <html> wins the cascade over every stylesheet-level declaration.
    useEffect(() => {
        document.documentElement.style.setProperty('--accent-primary', getAccentHex(accentColor));
        saveAccentColorToStorage(accentColor);
    }, [accentColor]);

    const setAccentColor = (key: AccentColorKey) => setAccentColorState(key);

    return (
        <AccentColorContext.Provider value={{ accentColor, accentColorHex: getAccentHex(accentColor), setAccentColor }}>
            {children}
        </AccentColorContext.Provider>
    );
};
export default AccentColorContextProvider;
