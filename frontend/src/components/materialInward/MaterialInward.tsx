import { useContext, useMemo, useRef, useState } from 'react';
import { Button } from 'primereact/button';
import { Toast } from 'primereact/toast';
import { HiOutlinePlus, HiOutlineTrash, HiOutlineArrowPath } from 'react-icons/hi2';
import FilterBar, { type FilterField } from '../../common/commonComponents/filterBar/FilterBar';
import DataTable, { type DataTableHandle } from '../../common/commonComponents/dataTable/DataTable';
import { AppContext } from '../../context/AppContextDefinition';
import { useDateFormatContext } from '../../context/DateFormatContextDefinition';
import { deleteMaterialInward, type MaterialInward as MaterialInwardType } from '../../services/materialInwardService';
import { DEFAULT_DATA_TYPE_VALUE } from '../../common/constants/commonConstant';
import { getMaterialInwardColumns } from '../../common/commonFunctions/CommonUtilities';
import { useBulkDelete } from '../../common/commonFunctions/useBulkDelete';
import { useCustomFieldColumns } from '../../common/commonFunctions/useCustomFieldColumns';
import MaterialInwardForm from './MaterialInwardForm';
import './MaterialInward.css';

const MaterialInward = () => {
    const { materialInwards, materialInwardsLoading, fetchMaterialInwards, users } = useContext(AppContext);
    const { dateFormat } = useDateFormatContext();
    const toast = useRef<Toast>(DEFAULT_DATA_TYPE_VALUE.NULL);
    const dataTableRef = useRef<DataTableHandle>(null);
    const [filters, setFilters] = useState<Record<string, unknown>>({ search: DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING });
    const [dialogVisible, setDialogVisible] = useState(DEFAULT_DATA_TYPE_VALUE.FALSE);
    const [editingId, setEditingId] = useState<number | null>(DEFAULT_DATA_TYPE_VALUE.NULL);

    const filterFields: FilterField[] = [
        { key: 'search', type: 'search', label: 'Search', placeholder: 'Search by inward no. / vendor' },
    ];

    const filteredMaterialInwards = useMemo(() => {
        const search = (filters.search as string)?.toLowerCase() ?? DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING;
        return (materialInwards as MaterialInwardType[]).filter((mi) => {
            return !search || mi.inwardNo.toLowerCase().includes(search) || mi.vendorName.toLowerCase().includes(search);
        });
    }, [materialInwards, filters]);

    const openAddDialog = () => {
        setEditingId(DEFAULT_DATA_TYPE_VALUE.NULL);
        setDialogVisible(DEFAULT_DATA_TYPE_VALUE.TRUE);
    };

    const openEditDialog = (mi: MaterialInwardType) => {
        setEditingId(mi.id);
        setDialogVisible(DEFAULT_DATA_TYPE_VALUE.TRUE);
    };

    const customFieldColumns = useCustomFieldColumns<MaterialInwardType>('materialInward');
    const columns = [...getMaterialInwardColumns(dateFormat, users, openEditDialog), ...customFieldColumns];

    const { selectedRows, setSelectedRows, handleBulkDelete, bulkDeleting } = useBulkDelete<MaterialInwardType>({
        getId: (row) => row.id,
        deleteOne: deleteMaterialInward,
        onDeleted: fetchMaterialInwards,
        toast,
        entityNamePlural: 'material inwards',
    });

    return (
        <div className="material-inward-page">
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
                        <Button className="filter-bar-add-btn" label="Create" icon={<HiOutlinePlus className="mr-2" />} onClick={openAddDialog} size="small" outlined />
                    </>
                }
                trailingActions={
                    <Button className="filter-bar-refresh-btn" icon={<HiOutlineArrowPath />} outlined size="small" onClick={fetchMaterialInwards} loading={materialInwardsLoading} aria-label="Refresh" title="Refresh" />
                }
            />

            <DataTable
                ref={dataTableRef}
                value={filteredMaterialInwards}
                columns={columns}
                loading={materialInwardsLoading}
                selectable
                selection={selectedRows}
                onSelectionChange={setSelectedRows}
            />

            {dialogVisible && <MaterialInwardForm editingId={editingId} onHide={() => setDialogVisible(DEFAULT_DATA_TYPE_VALUE.FALSE)} />}
        </div>
    );
};
export default MaterialInward;
