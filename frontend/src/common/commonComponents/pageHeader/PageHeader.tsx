import { NavLink } from 'react-router-dom';
import './PageHeader.css';

export interface Breadcrumb {
    label: string;
    path?: string;
}

interface PageHeaderProps {
    breadcrumb?: Breadcrumb[];
    actions?: React.ReactNode;
}

const PageHeader = ({ breadcrumb, actions }: PageHeaderProps) => {
    if (!breadcrumb?.length && !actions) return null;

    return (
        <div className="page-header">
            {breadcrumb && breadcrumb.length > 0 && (
                <div className="page-header-breadcrumb">
                    {breadcrumb.map((crumb, index) => (
                        <span key={crumb.label} className="page-header-breadcrumb-item">
                            {crumb.path ? <NavLink to={crumb.path}>{crumb.label}</NavLink> : <span>{crumb.label}</span>}
                            {index < breadcrumb.length - 1 && <span className="page-header-breadcrumb-sep">/</span>}
                        </span>
                    ))}
                </div>
            )}
            {actions && <div className="page-header-actions">{actions}</div>}
        </div>
    );
};

export default PageHeader;
