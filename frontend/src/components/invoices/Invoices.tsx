import { useContext, useMemo, useRef, useState } from 'react';
import { Button } from 'primereact/button';
import { Toast } from 'primereact/toast';
import { useNavigate } from 'react-router-dom';
import { HiOutlinePlus, HiOutlineTrash, HiOutlineArrowPath } from 'react-icons/hi2';
import FilterBar, { type FilterField } from '../../common/commonComponents/filterBar/FilterBar';
import DataTable from '../../common/commonComponents/dataTable/DataTable';
import { AppContext } from '../../context/AppContextDefinition';
import { useDateFormatContext } from '../../context/DateFormatContextDefinition';
import { deleteInvoice, type Invoice } from '../../services/invoiceService';
import { DEFAULT_DATA_TYPE_VALUE } from '../../common/constants/commonConstant';
import { getInvoiceColumns } from '../../common/commonFunctions/CommonUtilities';
import { useBulkDelete } from '../../common/commonFunctions/useBulkDelete';
import './Invoices.css';

const Invoices = () => {
    const navigate = useNavigate();
    const { invoices, invoicesLoading, fetchInvoices } = useContext(AppContext);
    const { dateFormat } = useDateFormatContext();
    const toast = useRef<Toast>(DEFAULT_DATA_TYPE_VALUE.NULL);
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

    const columns = getInvoiceColumns(dateFormat, (invoice) => navigate(`/invoices/${invoice.id}`));

    const { selectedRows, setSelectedRows, handleBulkDelete, bulkDeleting } = useBulkDelete<Invoice>({
        getId: (row) => row.id,
        deleteOne: deleteInvoice,
        onDeleted: fetchInvoices,
        toast,
        entityNamePlural: 'invoices',
    });

    return (
        <div className="invoices-page">
            <Toast ref={toast} />

            <FilterBar
                fields={filterFields}
                values={filters}
                onChange={(key, value) => setFilters((prev) => ({ ...prev, [key]: value }))}
                onReset={() => setFilters({ search: DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING })}
                actions={
                    <>
                        {selectedRows.length > 0 && (
                            <Button
                                label={`Delete (${selectedRows.length})`}
                                icon={<HiOutlineTrash className="mr-2" />}
                                onClick={handleBulkDelete}
                                loading={bulkDeleting}
                                severity="danger"
                                outlined
                            />
                        )}
                        <Button label="Create" icon={<HiOutlinePlus className="mr-2" />} onClick={() => navigate('/invoices/new')} size="small" outlined />
                    </>
                }
                trailingActions={
                    <Button icon={<HiOutlineArrowPath />} outlined size="small" onClick={fetchInvoices} loading={invoicesLoading} aria-label="Refresh" title="Refresh" />
                }
            />

            <DataTable
                value={filteredInvoices}
                columns={columns}
                loading={invoicesLoading}
                selectable
                selection={selectedRows}
                onSelectionChange={setSelectedRows}
            />
        </div>
    );
};
export default Invoices;
