import { ConfirmDialog } from 'primereact/confirmdialog';
import './App.css';
import AppContextProvider from './context/AppContext';
import AuthContextProvider from './context/AuthContext';
import ThemeContextProvider from './context/ThemeContext';
import AccentColorContextProvider from './context/AccentColorContext';
import SidebarColorContextProvider from './context/SidebarColorContext';
import DateFormatContextProvider from './context/DateFormatContext';
import CompanyLogoContextProvider from './context/CompanyLogoContext';
import CompanySettingsContextProvider from './context/CompanySettingsContext';
import Router from './routers/routers';

function App() {
  return (
    <ThemeContextProvider>
      <AccentColorContextProvider>
        <SidebarColorContextProvider>
          <DateFormatContextProvider>
            <CompanyLogoContextProvider>
              <CompanySettingsContextProvider>
                {/* Auth wraps AppContext (not the other way around) so AppContext can read
                    isAuthenticated and only fire its data fetches once a token actually exists -
                    see AppContext.tsx's fetch-all effect. */}
                <AuthContextProvider>
                  <AppContextProvider>
                    <ConfirmDialog />
                    <Router></Router>
                  </AppContextProvider>
                </AuthContextProvider>
              </CompanySettingsContextProvider>
            </CompanyLogoContextProvider>
          </DateFormatContextProvider>
        </SidebarColorContextProvider>
      </AccentColorContextProvider>
    </ThemeContextProvider>
  )
}

export default App
