import { useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Dropdown, type DropdownProps } from 'primereact/dropdown';
import { Dialog } from 'primereact/dialog';
import {
    HiOutlinePlus, HiOutlineFolder, HiOutlineTag, HiOutlineScale, HiOutlineMapPin,
    HiOutlineBuildingStorefront, HiOutlineUserCircle,
} from 'react-icons/hi2';
import DialogHeader from '../dialogHeader/DialogHeader';
import Category from '../../../components/category/Category';
import ProductType from '../../../components/productType/ProductType';
import Unit from '../../../components/unit/Unit';
import Locations from '../../../components/locations/Locations';
import Vendor from '../../../components/vendor/Vendor';
import Customer from '../../../components/customer/Customer';
import { DEFAULT_DATA_TYPE_VALUE } from '../../constants/commonConstant';
import './QuickAddDropdown.css';

export type QuickAddType = 'category' | 'productType' | 'unit' | 'location' | 'vendor' | 'customer';

const QUICK_ADD_CONFIG: Record<QuickAddType, { title: string; icon: typeof HiOutlineFolder; Page: typeof Category }> = {
    category: { title: 'Category', icon: HiOutlineFolder, Page: Category },
    productType: { title: 'Product Type', icon: HiOutlineTag, Page: ProductType },
    unit: { title: 'Unit', icon: HiOutlineScale, Page: Unit },
    location: { title: 'Location', icon: HiOutlineMapPin, Page: Locations },
    vendor: { title: 'Vendor', icon: HiOutlineBuildingStorefront, Page: Vendor },
    customer: { title: 'Customer', icon: HiOutlineUserCircle, Page: Customer },
};

interface QuickAddDropdownProps extends DropdownProps {
    quickAddType: QuickAddType;
}

// The installed PrimeReact typings for `filterTemplate` only declare `filterOptions` on the
// callback's argument (a `@deprecated` narrower shape) - the actual runtime object (see
// dropdown.esm.js's `createFilter`) also includes the already-built default search input as
// `element`, which is what lets this render PrimeReact's own filter box unmodified plus a
// button next to it instead of reimplementing filtering. Both fields are typed optional/unknown
// so this stays structurally assignable to the narrower declared parameter type.
interface DropdownFilterTemplateOptions {
    filterOptions?: unknown;
    element?: ReactNode;
}

// Wraps PrimeReact's Dropdown with a "+" button next to its search box (via filterTemplate,
// reusing PrimeReact's own default filter input/icons via `element` rather than
// reimplementing search) that opens the matching master-data page (Category/ProductType/
// Unit/Locations/Vendor/Customer) inside a Dialog. Those pages are already bare, props-free
// components reading/writing through AppContext's shared state, so mounting one here needs no
// changes to it - saving a new item there updates AppContext's shared array, which this same
// Dropdown's `options` (built from that same array by the caller) picks up automatically on
// its next render, without any extra refetch wiring.
const QuickAddDropdown = ({ quickAddType, ...dropdownProps }: QuickAddDropdownProps) => {
    const dropdownRef = useRef<Dropdown>(DEFAULT_DATA_TYPE_VALUE.NULL);
    const [manageOpen, setManageOpen] = useState(DEFAULT_DATA_TYPE_VALUE.FALSE);
    const config = QUICK_ADD_CONFIG[quickAddType];

    const openManageDialog = () => {
        dropdownRef.current?.hide();
        setManageOpen(DEFAULT_DATA_TYPE_VALUE.TRUE);
    };

    return (
        <>
            <Dropdown
                {...dropdownProps}
                ref={dropdownRef}
                filter
                filterTemplate={(options: DropdownFilterTemplateOptions) => (
                    <div className="quick-add-dropdown-filter-row">
                        {options.element}
                        <button
                            type="button"
                            className="quick-add-dropdown-btn"
                            title={`Add new ${config.title}`}
                            aria-label={`Add new ${config.title}`}
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={openManageDialog}
                        >
                            <HiOutlinePlus size={16} />
                        </button>
                    </div>
                )}
            />

            <Dialog
                visible={manageOpen}
                onHide={() => setManageOpen(DEFAULT_DATA_TYPE_VALUE.FALSE)}
                header={<DialogHeader icon={config.icon} title={`Manage ${config.title}`} />}
                className="quick-add-manage-dialog"
                style={{ width: '900px', maxWidth: '95vw', height: '80vh' }}
            >
                {/* Conditional mount (not just visible={manageOpen}) so the page's own local
                    state (search text, pagination, any in-progress form) starts fresh every
                    time this reopens, rather than surviving stale across opens. .quick-add-
                    embedded-page (see QuickAddDropdown.css) hides the page's own FilterBar
                    quick-action nav links (navigating away doesn't make sense inside a modal)
                    and moves its "Add" button to sit after Search instead of before it. */}
                {manageOpen && (
                    <div className="quick-add-embedded-page">
                        <config.Page />
                    </div>
                )}
            </Dialog>
        </>
    );
};
export default QuickAddDropdown;
