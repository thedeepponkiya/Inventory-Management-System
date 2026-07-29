import { useMemo, useState } from 'react';
import FilterBar, { type FilterField } from '../../common/commonComponents/filterBar/FilterBar';
import DataTable from '../../common/commonComponents/dataTable/DataTable';
import { useDataContext } from '../../context/DataContext';
import { DEFAULT_DATA_TYPE_VALUE } from '../../common/constants/commonConstant';
import { getTransactionsColumns } from '../../common/commonFunctions/CommonUtilities';
import './Transactions.css';

const Transactions = () => {
    const { transactions } = useDataContext();
    const [filters, setFilters] = useState<Record<string, unknown>>({ type: DEFAULT_DATA_TYPE_VALUE.NULL, referenceNo: DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING, locationName: DEFAULT_DATA_TYPE_VALUE.NULL, search: DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING });

    const filterFields: FilterField[] = [
        { key: 'search', type: 'search', label: 'Search', placeholder: 'Search SKU, Kit, or Remarks' },
    ];

    const filteredTransactions = useMemo(() => {
        const type = filters.type as string | null;
        const locationName = filters.locationName as string | null;
        const referenceNo = (filters.referenceNo as string)?.toLowerCase() ?? DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING;
        const search = (filters.search as string)?.toLowerCase() ?? DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING;
        return transactions.data.filter((tx) => {
            const matchesType = !type || tx.type === type;
            const matchesLocation = !locationName || tx.locationName === locationName;
            const matchesRef = !referenceNo || tx.referenceNo.toLowerCase().includes(referenceNo);
            const matchesSearch = !search || tx.itemName.toLowerCase().includes(search) || tx.remarks.toLowerCase().includes(search);
            return matchesType && matchesLocation && matchesRef && matchesSearch;
        });
    }, [transactions.data, filters]);

    const columns = getTransactionsColumns();

    return (
        <div className="transactions-page">
            <FilterBar
                fields={filterFields}
                values={filters}
                onChange={(key, value) => setFilters((prev) => ({ ...prev, [key]: value }))}
                onReset={() => setFilters({ type: DEFAULT_DATA_TYPE_VALUE.NULL, referenceNo: DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING, locationName: DEFAULT_DATA_TYPE_VALUE.NULL, search: DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING })}
            />

            <DataTable value={filteredTransactions} columns={columns} loading={transactions.loading} />
        </div>
    );
};
export default Transactions;
