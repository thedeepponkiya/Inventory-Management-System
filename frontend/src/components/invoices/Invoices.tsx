import { useMemo, useState } from 'react';
import { Button } from 'primereact/button';
import { MultiSelect } from 'primereact/multiselect';
import { HiOutlineArrowDownTray, HiOutlineEye, HiOutlinePrinter } from 'react-icons/hi2';
import FilterBar, { type FilterField } from '../../common/commonComponents/filterBar/FilterBar';
import DataTable from '../../common/commonComponents/dataTable/DataTable';
import { invoiceMockData, type Invoice } from '../../mockData/invoiceData';
import { DEFAULT_DATA_TYPE_VALUE } from '../../common/constants/commonConstant';
import { getInvoicesColumns, getActionBodyTemplate, invoicesAllColumnKeys as allColumns } from '../../common/commonFunctions/CommonUtilities';
import './Invoices.css';

const Invoices = () => {
    const [filters, setFilters] = useState<Record<string, unknown>>({ partyName: DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING });
    const [visibleColumns, setVisibleColumns] = useState<string[]>(allColumns);

    const filterFields: FilterField[] = [
        { key: 'partyName', type: 'search', label: 'Customer / Supplier', placeholder: 'Search customer / supplier' },
    ];

    const filteredInvoices = useMemo(() => {
        const partyName = (filters.partyName as string)?.toLowerCase() ?? DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING;
        return invoiceMockData.filter((inv) => {
            return !partyName || inv.partyName.toLowerCase().includes(partyName);
        });
    }, [filters]);

    const columns = getInvoicesColumns(visibleColumns);

    const actionTemplate = getActionBodyTemplate<Invoice>({ icons: [{ icon: HiOutlineEye }, { icon: HiOutlinePrinter }] });

    return (
        <div className="invoices-page">

            <FilterBar
                fields={filterFields}
                values={filters}
                onChange={(key, value) => setFilters((prev) => ({ ...prev, [key]: value }))}
                onReset={() => setFilters({ partyName: DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING })}
                actions={
                    <>
                        <Button label="Export" icon={<HiOutlineArrowDownTray className="mr-2" />} outlined size="small" />
                        <MultiSelect
                            value={visibleColumns}
                            onChange={(e) => setVisibleColumns(e.value)}
                            options={allColumns}
                            placeholder="Column Settings"
                            className="invoices-column-settings"
                            display="comma"
                            maxSelectedLabels={0}
                            selectedItemsLabel="Column Settings ({0})"
                        />
                    </>
                }
            />

            <DataTable value={filteredInvoices} columns={columns} actionBodyTemplate={actionTemplate} />
        </div>
    );
};
export default Invoices;
