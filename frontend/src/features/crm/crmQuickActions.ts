import { HiOutlineClipboardDocumentList, HiOutlineUsers } from 'react-icons/hi2';
import type { FilterBarQuickAction } from '../../common/commonComponents/filterBar/FilterBar';

// Shared across every CRM page's FilterBar so they link to CRM pages instead of FilterBar's
// default Inventory-focused quick actions (Inventories/Purchase Order/etc, which make no
// sense inside the CRM module).
export const crmQuickActions: FilterBarQuickAction[] = [
    { label: 'Leads', path: '/crm/leads', icon: HiOutlineUsers },
    { label: 'Follow Ups', path: '/crm/followups', icon: HiOutlineClipboardDocumentList },
];
