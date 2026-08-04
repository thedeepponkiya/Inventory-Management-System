import { useContext, useMemo, useRef, useState } from 'react';
import { Button } from 'primereact/button';
import { Toast } from 'primereact/toast';
import { confirmDialog } from 'primereact/confirmdialog';
import { useNavigate } from 'react-router-dom';
import { HiOutlinePlus, HiOutlineArrowDownTray } from 'react-icons/hi2';
import FilterBar, { type FilterField } from '../../common/commonComponents/filterBar/FilterBar';
import DataTable from '../../common/commonComponents/dataTable/DataTable';
import { AppContext } from '../../context/AppContextDefinition';
import { useDateFormatContext } from '../../context/DateFormatContextDefinition';
import { deletePurchaseOrder, type PurchaseOrder as PurchaseOrderType } from '../../services/purchaseOrderService';
import type { Vendor } from '../../services/vendorService';
import { DEFAULT_DATA_TYPE_VALUE } from '../../common/constants/commonConstant';
import { getPurchaseOrderColumns, getActionBodyTemplate } from '../../common/commonFunctions/CommonUtilities';
import { showToast } from '../../common/commonFunctions/commonFunction';
import { exportPurchaseOrderPdf } from '../../common/commonFunctions/purchaseOrderPdf';
import './PurchaseOrder.css';

const PurchaseOrder = () => {
    const navigate = useNavigate();
    const { vendors, purchaseOrders, purchaseOrdersLoading, fetchPurchaseOrders } = useContext(AppContext);
    const { dateFormat } = useDateFormatContext();
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

    const handleDelete = (po: PurchaseOrderType) => {
        confirmDialog({
            message: `Delete purchase order "${po.poNo}"? This cannot be undone.`,
            header: 'Delete Purchase Order',
            icon: 'pi pi-exclamation-triangle',
            acceptClassName: 'p-button-danger',
            accept: async () => {
                try {
                    await deletePurchaseOrder(po.id);
                    fetchPurchaseOrders();
                    showToast(toast, 'success', 'Deleted', 'Purchase order deleted successfully');
                } catch (err) {
                    showToast(toast, 'error', 'Error', err instanceof Error ? err.message : 'Something went wrong');
                }
            },
        });
    };

    const columns = getPurchaseOrderColumns(dateFormat);

    const actionTemplate = getActionBodyTemplate<PurchaseOrderType>({
        onEdit: (po) => navigate(`/purchase-order/${po.id}`),
        onDelete: handleDelete,
        icons: [{
            icon: HiOutlineArrowDownTray,
            title: 'Export PDF',
            onClick: (po) => exportPurchaseOrderPdf(po, (vendors as Vendor[]).find((v) => v.id === po.vendorId)),
        }],
    });

    return (
        <div className="purchase-order-page">
            <Toast ref={toast} />

            <FilterBar
                fields={filterFields}
                values={filters}
                onChange={(key, value) => setFilters((prev) => ({ ...prev, [key]: value }))}
                onReset={() => setFilters({ search: DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING })}
                actions={<Button label="Add Purchase Order" icon={<HiOutlinePlus className="mr-2" />} onClick={() => navigate('/purchase-order/new')} outlined />}
            />

            <DataTable value={filteredPurchaseOrders} columns={columns} loading={purchaseOrdersLoading} actionBodyTemplate={actionTemplate} />
        </div>
    );
};
export default PurchaseOrder;
