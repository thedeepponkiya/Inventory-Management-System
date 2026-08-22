import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import {
    SidebarColorContext, getSidebarColorHex, isSidebarColorLight, loadSidebarColorFromStorage, type SidebarColorKey,
} from './SidebarColorContextDefinition';

const STORAGE_KEY = 'inventory-app:sidebar-color';

function saveSidebarColorToStorage(key: SidebarColorKey): void {
    try {
        localStorage.setItem(STORAGE_KEY, key);
    } catch {
        // Storage quota exceeded or unavailable (e.g. private browsing) - the
        // preference just won't survive a refresh, which is an acceptable fallback.
    }
}

const SidebarColorContextProvider = ({ children }: { children: ReactNode }) => {
    const [sidebarColor, setSidebarColorState] = useState<SidebarColorKey>(loadSidebarColorFromStorage);

    // --sidebar-bg (index.css) is what the sidebar rail/flyout and Developer Admin's own
    // side-menu all derive their background from (see SideBarNavigation.css/DeveloperAdmin.css).
    // Setting it as an inline style on <html> wins the cascade over the stylesheet default.
    // data-sidebar-theme flags the one light preset so SideBarNavigation.css can swap its
    // (otherwise hardcoded-for-dark) text/icon/border colors and logo treatment - see the
    // [data-sidebar-theme="light"] block there.
    useEffect(() => {
        document.documentElement.style.setProperty('--sidebar-bg', getSidebarColorHex(sidebarColor));
        document.documentElement.setAttribute('data-sidebar-theme', isSidebarColorLight(sidebarColor) ? 'light' : 'dark');
        saveSidebarColorToStorage(sidebarColor);
    }, [sidebarColor]);

    const setSidebarColor = (key: SidebarColorKey) => setSidebarColorState(key);

    return (
        <SidebarColorContext.Provider value={{ sidebarColor, sidebarColorHex: getSidebarColorHex(sidebarColor), setSidebarColor }}>
            {children}
        </SidebarColorContext.Provider>
    );
};
export default SidebarColorContextProvider;
