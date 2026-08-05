import { ConfirmDialog } from 'primereact/confirmdialog';
import './App.css';
import AppContextProvider from './context/AppContext';
import AuthContextProvider from './context/AuthContext';
import ThemeContextProvider from './context/ThemeContext';
import DateFormatContextProvider from './context/DateFormatContext';
import CompanyLogoContextProvider from './context/CompanyLogoContext';
import CompanySettingsContextProvider from './context/CompanySettingsContext';
import Router from './routers/routers';

function App() {
  return (
    <ThemeContextProvider>
      <DateFormatContextProvider>
        <CompanyLogoContextProvider>
          <CompanySettingsContextProvider>
            <AppContextProvider>
              <AuthContextProvider>
                <ConfirmDialog />
                <Router></Router>
              </AuthContextProvider>
            </AppContextProvider>
          </CompanySettingsContextProvider>
        </CompanyLogoContextProvider>
      </DateFormatContextProvider>
    </ThemeContextProvider>
  )
}

export default App
