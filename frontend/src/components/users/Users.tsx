import { useMemo, useRef, useState } from 'react';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { Dropdown } from 'primereact/dropdown';
import { InputSwitch } from 'primereact/inputswitch';
import { Dialog } from 'primereact/dialog';
import { Toast } from 'primereact/toast';
import { confirmDialog } from 'primereact/confirmdialog';
import { HiOutlinePlus, HiOutlineCheckCircle } from 'react-icons/hi2';
import PageHeader from '../../common/commonComponents/pageHeader/PageHeader';
import FilterBar, { type FilterField } from '../../common/commonComponents/filterBar/FilterBar';
import DataTable from '../../common/commonComponents/dataTable/DataTable';
import { userMockData, type User } from '../../mockData/userData';
import { DEFAULT_DATA_TYPE_VALUE } from '../../common/constants/commonConstant';
import { getUsersColumns, getActionBodyTemplate } from '../../common/commonFunctions/CommonUtilities';
import { showToast } from '../../common/commonFunctions/commonFunction';
import './Users.css';

const roles: User['role'][] = ['Administrator', 'Store Manager', 'Warehouse Staff', 'Accountant'];

const emptyForm: Omit<User, 'id'> = { name: DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING, email: DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING, role: 'Warehouse Staff', status: 'Active' };

const Users = () => {
    const toast = useRef<Toast>(DEFAULT_DATA_TYPE_VALUE.NULL);
    const [users, setUsers] = useState<User[]>(userMockData);
    const [filters, setFilters] = useState<Record<string, unknown>>({ search: DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING, role: DEFAULT_DATA_TYPE_VALUE.NULL, status: DEFAULT_DATA_TYPE_VALUE.NULL });
    const [panelVisible, setPanelVisible] = useState(DEFAULT_DATA_TYPE_VALUE.FALSE);
    const [form, setForm] = useState(emptyForm);
    const [editingId, setEditingId] = useState<string | null>(DEFAULT_DATA_TYPE_VALUE.NULL);

    const filterFields: FilterField[] = [
        { key: 'search', type: 'search', label: 'Search', placeholder: 'Search by name / email' },
        { key: 'role', type: 'select', label: 'Role', placeholder: 'All Roles', options: roles.map((r) => ({ label: r, value: r })) },
        {
            key: 'status',
            type: 'select',
            label: 'Status',
            placeholder: 'All Status',
            options: [
                { label: 'Active', value: 'Active' },
                { label: 'Inactive', value: 'Inactive' },
            ],
        },
    ];

    const filteredUsers = useMemo(() => {
        const search = (filters.search as string)?.toLowerCase() ?? DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING;
        const role = filters.role as string | null;
        const status = filters.status as string | null;
        return users.filter((user) => {
            const matchesSearch = !search || user.name.toLowerCase().includes(search) || user.email.toLowerCase().includes(search);
            const matchesRole = !role || user.role === role;
            const matchesStatus = !status || user.status === status;
            return matchesSearch && matchesRole && matchesStatus;
        });
    }, [users, filters]);

    const openAddDialog = () => {
        setEditingId(DEFAULT_DATA_TYPE_VALUE.NULL);
        setForm(emptyForm);
        setPanelVisible(DEFAULT_DATA_TYPE_VALUE.TRUE);
    };

    const openEditDialog = (user: User) => {
        setEditingId(user.id);
        setForm({
            name: user.name,
            email: user.email,
            role: user.role,
            status: user.status,
        });
        setPanelVisible(DEFAULT_DATA_TYPE_VALUE.TRUE);
    };

    const handleDelete = (user: User) => {
        confirmDialog({
            message: `Delete user "${user.name}"? This cannot be undone.`,
            header: 'Delete User',
            icon: 'pi pi-exclamation-triangle',
            acceptClassName: 'p-button-danger',
            accept: () => {
                setUsers((prev) => prev.filter((item) => item.id !== user.id));
                showToast(toast, 'success', 'Deleted', 'User deleted successfully');
            },
        });
    };

    const handleSave = () => {
        if (editingId) {
            setUsers((prev) => prev.map((user) => (user.id === editingId ? { ...user, ...form } : user)));
            showToast(toast, 'success', 'Updated', 'User updated successfully');
        } else {
            const nextId = `USR-${String(users.length + 1).padStart(3, '0')}`;
            setUsers((prev) => [...prev, { id: nextId, ...form }]);
            showToast(toast, 'success', 'Created', 'User created successfully');
        }
        setForm(emptyForm);
        setEditingId(DEFAULT_DATA_TYPE_VALUE.NULL);
        setPanelVisible(DEFAULT_DATA_TYPE_VALUE.FALSE);
    };

    const columns = getUsersColumns();

    // toast.current is only read inside handleDelete's own click callback, never during render
    // eslint-disable-next-line react-hooks/refs
    const actionTemplate = getActionBodyTemplate<User>({ onEdit: openEditDialog, onDelete: handleDelete });

    return (
        <div className="users-page">
            <Toast ref={toast} />

            <PageHeader actions={<Button label="Add User" icon={<HiOutlinePlus className="mr-2" />} onClick={openAddDialog} outlined />} />

            <FilterBar
                fields={filterFields}
                values={filters}
                onChange={(key, value) => setFilters((prev) => ({ ...prev, [key]: value }))}
                onReset={() => setFilters({ search: DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING, role: DEFAULT_DATA_TYPE_VALUE.NULL, status: DEFAULT_DATA_TYPE_VALUE.NULL })}
            />

            <DataTable value={filteredUsers} columns={columns} actionBodyTemplate={actionTemplate} />

            <Dialog
                visible={panelVisible}
                onHide={() => setPanelVisible(DEFAULT_DATA_TYPE_VALUE.FALSE)}
                header={editingId ? 'Edit User' : 'Add New User'}
                style={{ width: '480px' }}
                footer={
                    <>
                        <Button label="Cancel" outlined onClick={() => setPanelVisible(DEFAULT_DATA_TYPE_VALUE.FALSE)} />
                        <Button label="Save" icon={<HiOutlineCheckCircle className="mr-2" />} onClick={handleSave} />
                    </>
                }
            >
                <div className="dialog-form-body">
                    <div className="form-field">
                        <label>Name</label>
                        <InputText value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Enter full name" />
                    </div>
                    <div className="form-field">
                        <label>Email</label>
                        <InputText value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="Enter email address" />
                    </div>
                    <div className="form-field">
                        <label>Role</label>
                        <Dropdown value={form.role} onChange={(e) => setForm({ ...form, role: e.value })} options={roles} placeholder="Select role" />
                    </div>
                    <div className="form-field form-field--row">
                        <label>Status</label>
                        <InputSwitch checked={form.status === 'Active'} onChange={(e) => setForm({ ...form, status: e.value ? 'Active' : 'Inactive' })} />
                    </div>
                </div>
            </Dialog>
        </div>
    );
};
export default Users;
