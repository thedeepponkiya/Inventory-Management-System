import { ConfirmDialog } from 'primereact/confirmdialog';
import './App.css';
import AppContextProvider from './context/AppContext';
import DataContextProvider from './context/DataContext';
import Router from './routers/routers';

function App() {
  return (
    <AppContextProvider>
      <DataContextProvider>
        <ConfirmDialog />
        <Router></Router>
      </DataContextProvider>
    </AppContextProvider>
  )
}

export default App