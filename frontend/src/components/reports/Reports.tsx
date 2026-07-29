import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { HiOutlineArrowDownTray, HiOutlineCube, HiOutlineDocumentText, HiOutlineSquares2X2, HiOutlineMapPin } from 'react-icons/hi2';
import FilterBar, { type FilterField } from '../../common/commonComponents/filterBar/FilterBar';
import DataTable from '../../common/commonComponents/dataTable/DataTable';
import { useDataContext } from '../../context/DataContext';
import { DEFAULT_DATA_TYPE_VALUE } from '../../common/constants/commonConstant';
import { getReportsColumns } from '../../common/commonFunctions/CommonUtilities';
import './Reports.css';

const categoryIcons: Record<string, React.ComponentType<{ size?: number }>> = {
    'Stock Reports': HiOutlineCube,
    'Transaction Reports': HiOutlineArrowDownTray,
    'Invoice Reports': HiOutlineDocumentText,
    'Kit Reports': HiOutlineSquares2X2,
    'Location Reports': HiOutlineMapPin,
};

const Reports = () => {
    const navigate = useNavigate();
    const { reports, locations } = useDataContext();
    const [filters, setFilters] = useState<Record<string, unknown>>({ locationName: DEFAULT_DATA_TYPE_VALUE.NULL, reportType: DEFAULT_DATA_TYPE_VALUE.NULL });

    const filterFields: FilterField[] = [
        {
            key: 'locationName',
            type: 'select',
            label: 'Location',
            placeholder: 'All Locations',
            options: locations.data.map((l) => ({ label: l.name, value: l.name })),
        },
        {
            key: 'reportType',
            type: 'select',
            label: 'Report Type',
            placeholder: 'All Report Types',
            options: reports.data.categories.map((c) => ({ label: c.label, value: c.label })),
        },
    ];

    const columns = getReportsColumns();

    return (
        <div className="reports-page">
            <FilterBar
                fields={filterFields}
                values={filters}
                onChange={(key, value) => setFilters((prev) => ({ ...prev, [key]: value }))}
                onReset={() => setFilters({ locationName: DEFAULT_DATA_TYPE_VALUE.NULL, reportType: DEFAULT_DATA_TYPE_VALUE.NULL })}
            />

            <h2 className="reports-section-title">Report Categories</h2>
            <div className="reports-category-grid">
                {reports.data.categories.map((category) => {
                    const Icon = categoryIcons[category.label] ?? HiOutlineCube;
                    return (
                        <div className="reports-category-card" key={category.id} onClick={() => navigate(category.path)}>
                            <div className="reports-category-icon"><Icon size={22} /></div>
                            <div className="reports-category-title">{category.label}</div>
                            <div className="reports-category-desc">{category.description}</div>
                            <div className="reports-category-footer">
                                <span>{category.count} Reports</span>
                                <span>&rarr;</span>
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="reports-recent-header">
                <h2 className="reports-section-title">Recent Reports</h2>
            </div>
            <DataTable value={reports.data.recent} columns={columns} rows={5} loading={reports.loading} />
        </div>
    );
};
export default Reports;
