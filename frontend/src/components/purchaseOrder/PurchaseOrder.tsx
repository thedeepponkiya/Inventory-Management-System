import { useContext, useMemo, useRef, useState } from 'react';
import { Button } from 'primereact/button';
import { Toast } from 'primereact/toast';
import { useNavigate } from 'react-router-dom';
import { HiOutlinePlus, HiOutlineArrowDownTray, HiOutlineTrash, HiOutlineArrowPath } from 'react-icons/hi2';
import FilterBar, { type FilterField } from '../../common/commonComponents/filterBar/FilterBar';
import DataTable from '../../common/commonComponents/dataTable/DataTable';
import { AppContext } from '../../context/AppContextDefinition';
import { useDateFormatContext } from '../../context/DateFormatContextDefinition';
import { useCompanyLogoContext } from '../../context/CompanyLogoContextDefinition';
import { useCompanySettingsContext } from '../../context/CompanySettingsContextDefinition';
import { deletePurchaseOrder, type PurchaseOrder as PurchaseOrderType } from '../../services/purchaseOrderService';
import type { Vendor } from '../../services/vendorService';
import { DEFAULT_DATA_TYPE_VALUE } from '../../common/constants/commonConstant';
import { getPurchaseOrderColumns, getActionBodyTemplate } from '../../common/commonFunctions/CommonUtilities';
import { useBulkDelete } from '../../common/commonFunctions/useBulkDelete';
import { exportPurchaseOrderPdf } from '../../common/commonFunctions/purchaseOrderPdf';
import './PurchaseOrder.css';

const PurchaseOrder = () => {
    const navigate = useNavigate();
    const { vendors, purchaseOrders, purchaseOrdersLoading, fetchPurchaseOrders } = useContext(AppContext);
    const { dateFormat } = useDateFormatContext();
    const { companyLogo } = useCompanyLogoContext();
    const { companyName, address } = useCompanySettingsContext();
    const toast = useRef<Toast>(DEFAULT_DATA_TYPE_VALUE.NULL);
    const [filters, setFilters] = useState<Record<string, unknown>>({ search: DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING });

    const filterFields: FilterField[] = [
        { key: 'search', type: 'search', label: 'Search', placeholder: 'Search by PO no. / vendor' },
    ];

    const filteredPurchaseOrders = useMemo(() => {
        const search = (filters.search as string)?.toLowerCase() ?? DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING;
        return (purchaseOrders as PurchaseOrderType[]).filter((po) => {
            return !search || po.poNo.toLowerCase().includes(search) || po.vendorName.toLowerCase().includes(search);
        });
    }, [purchaseOrders, filters]);

    const columns = getPurchaseOrderColumns(dateFormat, (po) => navigate(`/purchase-order/${po.id}`));

    const actionTemplate = getActionBodyTemplate<PurchaseOrderType>({
        icons: [{
            icon: HiOutlineArrowDownTray,
            title: 'Export PDF',
            onClick: (po) => exportPurchaseOrderPdf(po, (vendors as Vendor[]).find((v) => v.id === po.vendorId), companyLogo, { companyName, address }),
        }],
    });

    const { selectedRows, setSelectedRows, handleBulkDelete, bulkDeleting } = useBulkDelete<PurchaseOrderType>({
        getId: (row) => row.id,
        deleteOne: deletePurchaseOrder,
        onDeleted: fetchPurchaseOrders,
        toast,
        entityNamePlural: 'purchase orders',
    });

    return (
        <div className="purchase-order-page">
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
                        <Button label="Add Purchase Order" icon={<HiOutlinePlus className="mr-2" />} onClick={() => navigate('/purchase-order/new')} outlined />
                    </>
                }
                trailingActions={
                    <Button icon={<HiOutlineArrowPath />} outlined size="small" onClick={fetchPurchaseOrders} loading={purchaseOrdersLoading} aria-label="Refresh" title="Refresh" />
                }
            />

            <DataTable
                value={filteredPurchaseOrders}
                columns={columns}
                loading={purchaseOrdersLoading}
                actionBodyTemplate={actionTemplate}
                selectable
                selection={selectedRows}
                onSelectionChange={setSelectedRows}
            />
        </div>
    );
};
export default PurchaseOrder;
