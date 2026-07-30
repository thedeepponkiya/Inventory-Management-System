import { ConfirmDialog } from 'primereact/confirmdialog';
import './App.css';
import AppContextProvider from './context/AppContext';
import AuthContextProvider from './context/AuthContext';
import Router from './routers/routers';

function App() {
  return (
    <AppContextProvider>
      <AuthContextProvider>
        <ConfirmDialog />
        <Router></Router>
      </AuthContextProvider>
    </AppContextProvider>
  )
}

export default App
