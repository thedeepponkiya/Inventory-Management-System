import { ConfirmDialog } from 'primereact/confirmdialog';
import './App.css';
import AppContextProvider from './context/AppContext';
import AuthContextProvider from './context/AuthContext';
import ThemeContextProvider from './context/ThemeContext';
import Router from './routers/routers';

function App() {
  return (
    <ThemeContextProvider>
      <AppContextProvider>
        <AuthContextProvider>
          <ConfirmDialog />
          <Router></Router>
        </AuthContextProvider>
      </AppContextProvider>
    </ThemeContextProvider>
  )
}

export default App
