import { useMemo, useState } from 'react';
import { HiOutlineEye } from 'react-icons/hi2';
import FilterBar, { type FilterField } from '../../common/commonComponents/filterBar/FilterBar';
import DataTable from '../../common/commonComponents/dataTable/DataTable';
import { transactionMockData, type Transaction } from '../../mockData/transactionData';
import { DEFAULT_DATA_TYPE_VALUE } from '../../common/constants/commonConstant';
import { getTransactionsColumns, getActionBodyTemplate } from '../../common/commonFunctions/CommonUtilities';
import './Transactions.css';

const Transactions = () => {
    const [filters, setFilters] = useState<Record<string, unknown>>({ type: DEFAULT_DATA_TYPE_VALUE.NULL, referenceNo: DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING, locationName: DEFAULT_DATA_TYPE_VALUE.NULL, search: DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING });

    const filterFields: FilterField[] = [
        { key: 'search', type: 'search', label: 'Search', placeholder: 'Search SKU, Kit, or Remarks' },
    ];

    const filteredTransactions = useMemo(() => {
        const type = filters.type as string | null;
        const locationName = filters.locationName as string | null;
        const referenceNo = (filters.referenceNo as string)?.toLowerCase() ?? DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING;
        const search = (filters.search as string)?.toLowerCase() ?? DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING;
        return transactionMockData.filter((tx) => {
            const matchesType = !type || tx.type === type;
            const matchesLocation = !locationName || tx.locationName === locationName;
            const matchesRef = !referenceNo || tx.referenceNo.toLowerCase().includes(referenceNo);
            const matchesSearch = !search || tx.itemName.toLowerCase().includes(search) || tx.remarks.toLowerCase().includes(search);
            return matchesType && matchesLocation && matchesRef && matchesSearch;
        });
    }, [filters]);

    const columns = getTransactionsColumns();

    const actionTemplate = getActionBodyTemplate<Transaction>({ icons: [{ icon: HiOutlineEye }] });

    return (
        <div className="transactions-page">
            <FilterBar
                fields={filterFields}
                values={filters}
                onChange={(key, value) => setFilters((prev) => ({ ...prev, [key]: value }))}
                onReset={() => setFilters({ type: DEFAULT_DATA_TYPE_VALUE.NULL, referenceNo: DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING, locationName: DEFAULT_DATA_TYPE_VALUE.NULL, search: DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING })}
            />

            <DataTable value={filteredTransactions} columns={columns} actionBodyTemplate={actionTemplate} />
        </div>
    );
};
export default Transactions;
