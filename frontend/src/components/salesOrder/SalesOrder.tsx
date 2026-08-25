import { useContext, useMemo, useRef, useState } from 'react';
import { Button } from 'primereact/button';
import { Toast } from 'primereact/toast';
import { useNavigate } from 'react-router-dom';
import { HiOutlinePlus, HiOutlineTrash, HiOutlineArrowPath } from 'react-icons/hi2';
import { FaRegFilePdf } from 'react-icons/fa6';
import FilterBar, { type FilterField } from '../../common/commonComponents/filterBar/FilterBar';
import DataTable, { type DataTableHandle } from '../../common/commonComponents/dataTable/DataTable';
import { AppContext } from '../../context/AppContextDefinition';
import { useDateFormatContext } from '../../context/DateFormatContextDefinition';
import { useCompanyLogoContext } from '../../context/CompanyLogoContextDefinition';
import { useCompanySettingsContext } from '../../context/CompanySettingsContextDefinition';
import { deleteSalesOrder, type SalesOrder as SalesOrderType } from '../../services/salesOrderService';
import { DEFAULT_DATA_TYPE_VALUE } from '../../common/constants/commonConstant';
import { getSalesOrderColumns, getActionBodyTemplate } from '../../common/commonFunctions/CommonUtilities';
import { useBulkDelete } from '../../common/commonFunctions/useBulkDelete';
import { exportSalesOrderPdf } from '../../common/commonFunctions/salesOrderPdf';
import { useCustomFieldColumns } from '../../common/commonFunctions/useCustomFieldColumns';
import './SalesOrder.css';

const SalesOrder = () => {
    const navigate = useNavigate();
    const { salesOrders, salesOrdersLoading, fetchSalesOrders, users } = useContext(AppContext);
    const { dateFormat } = useDateFormatContext();
    const { companyLogo } = useCompanyLogoContext();
    const { companyName, address } = useCompanySettingsContext();
    const toast = useRef<Toast>(DEFAULT_DATA_TYPE_VALUE.NULL);
    const dataTableRef = useRef<DataTableHandle>(null);
    const [filters, setFilters] = useState<Record<string, unknown>>({ search: DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING });

    const filterFields: FilterField[] = [
        { key: 'search', type: 'search', label: 'Search', placeholder: 'Search by SO no. / customer' },
    ];

    const filteredSalesOrders = useMemo(() => {
        const search = (filters.search as string)?.toLowerCase() ?? DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING;
        return (salesOrders as SalesOrderType[]).filter((so) => {
            return !search || so.soNo.toLowerCase().includes(search) || so.customerName.toLowerCase().includes(search);
        });
    }, [salesOrders, filters]);

    const customFieldColumns = useCustomFieldColumns<SalesOrderType>('salesOrder');
    const columns = [...getSalesOrderColumns(dateFormat, users, (so) => navigate(`/sales-order/${so.id}`)), ...customFieldColumns];

    const actionTemplate = getActionBodyTemplate<SalesOrderType>({
        icons: [{
            icon: FaRegFilePdf,
            title: 'Export PDF',
            onClick: (so) => exportSalesOrderPdf(so, companyLogo, { companyName, address }),
        }],
    });

    const { selectedRows, setSelectedRows, handleBulkDelete, bulkDeleting } = useBulkDelete<SalesOrderType>({
        getId: (row) => row.id,
        deleteOne: deleteSalesOrder,
        onDeleted: fetchSalesOrders,
        toast,
        entityNamePlural: 'sales orders',
    });

    return (
        <div className="sales-order-page">
            <Toast ref={toast} />

            <FilterBar
                fields={filterFields}
                values={filters}
                onChange={(key, value) => setFilters((prev) => ({ ...prev, [key]: value }))}
                onReset={() => {
                    setFilters({ search: DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING });
                    dataTableRef.current?.clearFilters();
                }}
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
                        <Button className="filter-bar-add-btn" label="Add Sales Order" icon={<HiOutlinePlus className="mr-2" />} onClick={() => navigate('/sales-order/new')} outlined />
                    </>
                }
                trailingActions={
                    <Button className="filter-bar-refresh-btn" icon={<HiOutlineArrowPath />} outlined size="small" onClick={fetchSalesOrders} loading={salesOrdersLoading} aria-label="Refresh" title="Refresh" />
                }
            />

            <DataTable
                ref={dataTableRef}
                value={filteredSalesOrders}
                columns={columns}
                loading={salesOrdersLoading}
                actionBodyTemplate={actionTemplate}
                selectable
                selection={selectedRows}
                onSelectionChange={setSelectedRows}
            />
        </div>
    );
};
export default SalesOrder;
