import { ConfirmDialog } from 'primereact/confirmdialog';
import './App.css';
import AppContextProvider from './context/AppContext';
import AuthContextProvider from './context/AuthContext';
import DataContextProvider from './context/DataContext';
import Router from './routers/routers';

function App() {
  return (
    <AppContextProvider>
      <AuthContextProvider>
        <DataContextProvider>
          <ConfirmDialog />
          <Router></Router>
        </DataContextProvider>
      </AuthContextProvider>
    </AppContextProvider>
  )
}

export default App
