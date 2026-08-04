import { ConfirmDialog } from 'primereact/confirmdialog';
import './App.css';
import AppContextProvider from './context/AppContext';
import AuthContextProvider from './context/AuthContext';
import ThemeContextProvider from './context/ThemeContext';
import DateFormatContextProvider from './context/DateFormatContext';
import Router from './routers/routers';

function App() {
  return (
    <ThemeContextProvider>
      <DateFormatContextProvider>
        <AppContextProvider>
          <AuthContextProvider>
            <ConfirmDialog />
            <Router></Router>
          </AuthContextProvider>
        </AppContextProvider>
      </DateFormatContextProvider>
    </ThemeContextProvider>
  )
}

export default App
