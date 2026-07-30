import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { HiOutlineArrowDownTray, HiOutlineCube, HiOutlineDocumentText, HiOutlineSquares2X2, HiOutlineMapPin, HiOutlineArrowDownOnSquare, HiOutlineEnvelope } from 'react-icons/hi2';
import FilterBar, { type FilterField } from '../../common/commonComponents/filterBar/FilterBar';
import DataTable from '../../common/commonComponents/dataTable/DataTable';
import { reportCategoriesMockData, recentReportsMockData, type RecentReport } from '../../mockData/reportData';
import { locationMockData } from '../../mockData/locationData';
import { DEFAULT_DATA_TYPE_VALUE } from '../../common/constants/commonConstant';
import { getReportsColumns, getActionBodyTemplate } from '../../common/commonFunctions/CommonUtilities';
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
    const [filters, setFilters] = useState<Record<string, unknown>>({ locationName: DEFAULT_DATA_TYPE_VALUE.NULL, reportType: DEFAULT_DATA_TYPE_VALUE.NULL });

    const filterFields: FilterField[] = [
        {
            key: 'locationName',
            type: 'select',
            label: 'Location',
            placeholder: 'All Locations',
            options: locationMockData.map((l) => ({ label: l.name, value: l.name })),
        },
        {
            key: 'reportType',
            type: 'select',
            label: 'Report Type',
            placeholder: 'All Report Types',
            options: reportCategoriesMockData.map((c) => ({ label: c.label, value: c.label })),
        },
    ];

    const columns = getReportsColumns();

    const actionTemplate = getActionBodyTemplate<RecentReport>({ icons: [{ icon: HiOutlineArrowDownOnSquare }, { icon: HiOutlineEnvelope }] });

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
                {reportCategoriesMockData.map((category) => {
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
            <DataTable value={recentReportsMockData} columns={columns} actionBodyTemplate={actionTemplate} rows={5} />
        </div>
    );
};
export default Reports;
