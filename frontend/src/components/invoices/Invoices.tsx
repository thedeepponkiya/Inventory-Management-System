import { useContext, useMemo, useState } from 'react';
import { Button } from 'primereact/button';
import { useNavigate } from 'react-router-dom';
import { HiOutlinePlus } from 'react-icons/hi2';
import FilterBar, { type FilterField } from '../../common/commonComponents/filterBar/FilterBar';
import DataTable from '../../common/commonComponents/dataTable/DataTable';
import { AppContext } from '../../context/AppContextDefinition';
import { type Invoice } from '../../services/invoiceService';
import { DEFAULT_DATA_TYPE_VALUE } from '../../common/constants/commonConstant';
import { getInvoiceColumns, getActionBodyTemplate } from '../../common/commonFunctions/CommonUtilities';
import './Invoices.css';

const Invoices = () => {
    const navigate = useNavigate();
    const { invoices, invoicesLoading } = useContext(AppContext);
    const [filters, setFilters] = useState<Record<string, unknown>>({ search: DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING });

    const filterFields: FilterField[] = [
        { key: 'search', type: 'search', label: 'Search', placeholder: 'Search by invoice no. / customer-supplier' },
    ];

    const filteredInvoices = useMemo(() => {
        const search = (filters.search as string)?.toLowerCase() ?? DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING;
        return (invoices as Invoice[]).filter((invoice) => {
            return (
                !search ||
                invoice.invoiceNo.toLowerCase().includes(search) ||
                (invoice.customerSupplier ?? DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING).toLowerCase().includes(search)
            );
        });
    }, [invoices, filters]);

    const columns = getInvoiceColumns();

    const actionTemplate = getActionBodyTemplate<Invoice>({
        onEdit: (invoice) => navigate(`/invoices/${invoice.id}`),
    });

    return (
        <div className="invoices-page">
            <FilterBar
                fields={filterFields}
                values={filters}
                onChange={(key, value) => setFilters((prev) => ({ ...prev, [key]: value }))}
                onReset={() => setFilters({ search: DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING })}
                actions={<Button label="Create" icon={<HiOutlinePlus className="mr-2" />} onClick={() => navigate('/invoices/new')} size="small" outlined />}
            />

            <DataTable value={filteredInvoices} columns={columns} loading={invoicesLoading} actionBodyTemplate={actionTemplate} />
        </div>
    );
};
export default Invoices;
