import { QueryClient } from '@tanstack/react-query';

// Module-level singleton, created once at import time - NOT inside a component (e.g. via
// useState(() => new QueryClient())), since CrmProviders could remount across navigation
// and a component-local instance would reset the cache every time.
const crmQueryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 5000,
            retry: 1,
        },
    },
});

export default crmQueryClient;
