import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';

// Swapped between PrimeReact's bundled light/dark theme stylesheets so Dropdowns,
// Dialogs, Calendars, DataTables etc. flip along with the rest of the app - see
// index.html's <link id="prime-theme-link">, which this context points at runtime.
import lightThemeUrl from 'primereact/resources/themes/lara-light-blue/theme.css?url';
import darkThemeUrl from 'primereact/resources/themes/lara-dark-blue/theme.css?url';
import { ThemeContext, loadThemeFromStorage, type Theme } from './ThemeContextDefinition';

const STORAGE_KEY = 'inventory-app:theme';

function saveThemeToStorage(theme: Theme): void {
    try {
        localStorage.setItem(STORAGE_KEY, theme);
    } catch {
        // Storage quota exceeded or unavailable (e.g. private browsing) - the
        // preference just won't survive a refresh, which is an acceptable fallback.
    }
}

const ThemeContextProvider = ({ children }: { children: ReactNode }) => {
    const [theme, setThemeState] = useState<Theme>(loadThemeFromStorage);

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
        const primeThemeLink = document.getElementById('prime-theme-link') as HTMLLinkElement | null;
        if (primeThemeLink) {
            primeThemeLink.href = theme === 'dark' ? darkThemeUrl : lightThemeUrl;
        }
        saveThemeToStorage(theme);
    }, [theme]);

    const setTheme = (next: Theme) => setThemeState(next);
    const toggleTheme = () => setThemeState((prev) => (prev === 'light' ? 'dark' : 'light'));

    return <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>{children}</ThemeContext.Provider>;
};
export default ThemeContextProvider;
