import axios from 'axios';

// Hardcoded base URL, matching every existing services/*.ts file in this app (no .env/
// import.meta.env usage exists anywhere in this frontend today).
const crmAxiosClient = axios.create({
    baseURL: 'http://localhost:5000/api/v1/crm',
    headers: { 'Content-Type': 'application/json' },
});

// Backend envelope is always {status, message, data}. Axios already rejects on non-2xx, so
// this just surfaces the backend's own message (400/409/404 body) instead of axios's
// generic "Request failed with status code 4xx" text.
crmAxiosClient.interceptors.response.use(
    (response) => response,
    (error) => {
        const message = error?.response?.data?.message ?? error.message ?? 'Something went wrong';
        return Promise.reject(new Error(message));
    },
);

export default crmAxiosClient;
