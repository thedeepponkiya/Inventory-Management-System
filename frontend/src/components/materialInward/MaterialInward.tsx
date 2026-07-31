import { useContext, useMemo, useState } from 'react';
import { Button } from 'primereact/button';
import { useNavigate } from 'react-router-dom';
import { HiOutlinePlus } from 'react-icons/hi2';
import FilterBar, { type FilterField } from '../../common/commonComponents/filterBar/FilterBar';
import DataTable from '../../common/commonComponents/dataTable/DataTable';
import { AppContext } from '../../context/AppContextDefinition';
import { type MaterialInward as MaterialInwardType } from '../../services/materialInwardService';
import { DEFAULT_DATA_TYPE_VALUE } from '../../common/constants/commonConstant';
import { getMaterialInwardColumns, getActionBodyTemplate } from '../../common/commonFunctions/CommonUtilities';
import './MaterialInward.css';

const MaterialInward = () => {
    const navigate = useNavigate();
    const { materialInwards, materialInwardsLoading } = useContext(AppContext);
    const [filters, setFilters] = useState<Record<string, unknown>>({ search: DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING });

    const filterFields: FilterField[] = [
        { key: 'search', type: 'search', label: 'Search', placeholder: 'Search by inward no. / vendor' },
    ];

    const filteredMaterialInwards = useMemo(() => {
        const search = (filters.search as string)?.toLowerCase() ?? DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING;
        return (materialInwards as MaterialInwardType[]).filter((mi) => {
            return !search || mi.inwardNo.toLowerCase().includes(search) || mi.vendorName.toLowerCase().includes(search);
        });
    }, [materialInwards, filters]);

    const columns = getMaterialInwardColumns();

    const actionTemplate = getActionBodyTemplate<MaterialInwardType>({
        onEdit: (mi) => navigate(`/material-inward/${mi.id}`),
    });

    return (
        <div className="material-inward-page">
            <FilterBar
                fields={filterFields}
                values={filters}
                onChange={(key, value) => setFilters((prev) => ({ ...prev, [key]: value }))}
                onReset={() => setFilters({ search: DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING })}
                actions={<Button label="Create" icon={<HiOutlinePlus className="mr-2" />} onClick={() => navigate('/material-inward/new')} size="small" outlined />}
            />

            <DataTable value={filteredMaterialInwards} columns={columns} loading={materialInwardsLoading} actionBodyTemplate={actionTemplate} />
        </div>
    );
};
export default MaterialInward;
