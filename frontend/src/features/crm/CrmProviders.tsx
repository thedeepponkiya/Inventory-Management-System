import { QueryClientProvider } from '@tanstack/react-query';
import { Outlet } from 'react-router-dom';
import crmQueryClient from './crmQueryClient';

// Local provider boundary for the whole /crm route subtree - App.tsx's existing provider
// tree is untouched. Every CRM page added under the /crm parent route automatically gets
// this shared query client with no per-page boilerplate.
const CrmProviders = () => (
    <QueryClientProvider client={crmQueryClient}>
        <Outlet />
    </QueryClientProvider>
);
export default CrmProviders;
