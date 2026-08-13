import { useContext, useMemo, useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { Password } from 'primereact/password';
import { Dropdown } from 'primereact/dropdown';
import { InputSwitch } from 'primereact/inputswitch';
import { Dialog } from 'primereact/dialog';
import { Toast } from 'primereact/toast';
import {
    HiOutlinePlus,
    HiOutlineCheckCircle,
    HiOutlineUser,
    HiOutlineCamera,
    HiOutlineArrowUpTray,
    HiOutlineShieldCheck,
    HiOutlineUserGroup,
    HiOutlineBuildingOffice2,
    HiOutlineLockClosed,
    HiOutlinePhone,
    HiOutlineEnvelope,
    HiOutlineTrash,
    HiOutlineArrowPath,
} from 'react-icons/hi2';
import FilterBar, { type FilterField } from '../../common/commonComponents/filterBar/FilterBar';
import DataTable from '../../common/commonComponents/dataTable/DataTable';
import { AppContext } from '../../context/AppContextDefinition';
import { useDateFormatContext } from '../../context/DateFormatContextDefinition';
import { createUser, updateUser, deleteUser, uploadUserImage, type User, type UserPayload } from '../../services/userService';
import { DEFAULT_DATA_TYPE_VALUE } from '../../common/constants/commonConstant';
import { getUsersColumns, ROLE_OPTIONS, DEPARTMENT_OPTIONS } from '../../common/commonFunctions/CommonUtilities';
import { showToast, resolveImageUrl } from '../../common/commonFunctions/commonFunction';
import { useBulkDelete } from '../../common/commonFunctions/useBulkDelete';
import './Users.css';

interface UserFormState {
    fullName: string;
    email: string;
    phone: string;
    password: string;
    roleId: string | null;
    departmentId: string | null;
    profileImage: string | null;
    status: 'Active' | 'Inactive';
}

const emptyForm: UserFormState = {
    fullName: DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING,
    email: DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING,
    phone: DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING,
    password: DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING,
    roleId: DEFAULT_DATA_TYPE_VALUE.NULL,
    departmentId: DEFAULT_DATA_TYPE_VALUE.NULL,
    profileImage: DEFAULT_DATA_TYPE_VALUE.NULL,
    status: 'Active',
};

const Users = () => {
    const { users, usersLoading, fetchUsers } = useContext(AppContext);
    const { dateFormat } = useDateFormatContext();
    const toast = useRef<Toast>(DEFAULT_DATA_TYPE_VALUE.NULL);
    const [filters, setFilters] = useState<Record<string, unknown>>({ search: DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING, roleId: DEFAULT_DATA_TYPE_VALUE.NULL, status: DEFAULT_DATA_TYPE_VALUE.NULL });
    const [panelVisible, setPanelVisible] = useState(DEFAULT_DATA_TYPE_VALUE.FALSE);
    const [form, setForm] = useState<UserFormState>(emptyForm);
    const [editingId, setEditingId] = useState<number | null>(DEFAULT_DATA_TYPE_VALUE.NULL);
    const [uploadingImage, setUploadingImage] = useState(DEFAULT_DATA_TYPE_VALUE.FALSE);

    const filterFields: FilterField[] = [
        { key: 'search', type: 'search', label: 'Search', placeholder: 'Search by name / email / user code' },
    ];

    const filteredUsers = useMemo(() => {
        const search = (filters.search as string)?.toLowerCase() ?? DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING;
        const roleId = filters.roleId as string | null;
        const status = filters.status as string | null;
        return (users as User[]).filter((user) => {
            const matchesSearch = !search
                || user.fullName.toLowerCase().includes(search)
                || user.email.toLowerCase().includes(search)
                || user.userCode.toLowerCase().includes(search);
            const matchesRole = !roleId || user.roleId === roleId;
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
            fullName: user.fullName,
            email: user.email,
            phone: user.phone ?? DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING,
            password: DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING,
            roleId: user.roleId,
            departmentId: user.departmentId,
            profileImage: user.profileImage,
            status: user.status,
        });
        setPanelVisible(DEFAULT_DATA_TYPE_VALUE.TRUE);
    };

    const handleImageSelect = async (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploadingImage(DEFAULT_DATA_TYPE_VALUE.TRUE);
        try {
            const path = await uploadUserImage(file);
            setForm((prev) => ({ ...prev, profileImage: path }));
        } catch (err) {
            showToast(toast, 'error', 'Error', err instanceof Error ? err.message : 'Image upload failed');
        } finally {
            setUploadingImage(DEFAULT_DATA_TYPE_VALUE.FALSE);
            e.target.value = DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING;
        }
    };

    const handleSave = async () => {
        try {
            const payload: UserPayload = {
                fullName: form.fullName,
                email: form.email,
                phone: form.phone || null,
                roleId: form.roleId,
                departmentId: form.departmentId,
                profileImage: form.profileImage,
                status: form.status,
            };
            // Password is only sent when the field is actually filled in - on create it's
            // required, on edit leaving it blank keeps the existing password unchanged.
            if (form.password) {
                payload.password = form.password;
            }

            if (editingId) {
                await updateUser(editingId, payload);
                showToast(toast, 'success', 'Updated', 'User updated successfully');
            } else {
                if (!form.password) {
                    showToast(toast, 'error', 'Error', 'Password is required');
                    return;
                }
                await createUser(payload);
                showToast(toast, 'success', 'Created', 'User created successfully');
            }
            fetchUsers();
            setForm(emptyForm);
            setEditingId(DEFAULT_DATA_TYPE_VALUE.NULL);
            setPanelVisible(DEFAULT_DATA_TYPE_VALUE.FALSE);
        } catch (err) {
            showToast(toast, 'error', 'Error', err instanceof Error ? err.message : 'Something went wrong');
        }
    };

    const columns = getUsersColumns(dateFormat, openEditDialog);

    const { selectedRows, setSelectedRows, handleBulkDelete, bulkDeleting } = useBulkDelete<User>({
        getId: (row) => row.id,
        deleteOne: deleteUser,
        onDeleted: fetchUsers,
        toast,
        entityNamePlural: 'users',
    });

    return (
        <div className="users-page">
            <Toast ref={toast} />

            <FilterBar
                fields={filterFields}
                values={filters}
                onChange={(key, value) => setFilters((prev) => ({ ...prev, [key]: value }))}
                onReset={() => setFilters({ search: DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING, roleId: DEFAULT_DATA_TYPE_VALUE.NULL, status: DEFAULT_DATA_TYPE_VALUE.NULL })}
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
                        <Button className="filter-bar-add-btn" label="Add User" icon={<HiOutlinePlus className="mr-2" />} onClick={openAddDialog} outlined />
                    </>
                }
                trailingActions={
                    <Button className="filter-bar-refresh-btn" icon={<HiOutlineArrowPath />} outlined size="small" onClick={fetchUsers} loading={usersLoading} aria-label="Refresh" title="Refresh" />
                }
            />

            <DataTable
                value={filteredUsers}
                columns={columns}
                loading={usersLoading}
                selectable
                selection={selectedRows}
                onSelectionChange={setSelectedRows}
            />

            <Dialog
                visible={panelVisible}
                onHide={() => setPanelVisible(DEFAULT_DATA_TYPE_VALUE.FALSE)}
                header={editingId ? 'Edit User' : 'Add New User'}
                className="user-form-dialog"
                style={{ width: '900px', maxWidth: '95vw' }}
                footer={
                    <>
                        <Button label="Cancel" outlined onClick={() => setPanelVisible(DEFAULT_DATA_TYPE_VALUE.FALSE)} />
                        <Button label="Save User" icon={<HiOutlineCheckCircle className="mr-2" />} onClick={handleSave} />
                    </>
                }
            >
                <div className="user-form-body">
                    <div className="user-form-left">
                        <div className="user-form-section-title">Profile Image</div>
                        <div className="user-form-section-subtitle">Add a profile picture for the user</div>

                        <label className="user-form-avatar-picker">
                            {form.profileImage ? (
                                <img src={resolveImageUrl(form.profileImage)} alt="Selected user" />
                            ) : (
                                <span className="user-form-avatar-placeholder"><HiOutlineUser size={40} /></span>
                            )}
                            <span className="user-form-avatar-camera-badge"><HiOutlineCamera size={13} /></span>
                            <input type="file" accept="image/*" hidden onChange={handleImageSelect} disabled={uploadingImage} />
                        </label>
                        <div className="user-form-avatar-helper">JPG, PNG or WEBP. Max size 2MB.</div>

                        <label className="user-form-upload-btn">
                            <HiOutlineArrowUpTray size={14} />
                            {uploadingImage ? 'Uploading...' : 'Upload Image'}
                            <input type="file" accept="image/*" hidden onChange={handleImageSelect} disabled={uploadingImage} />
                        </label>
                    </div>

                    <div className="user-form-right">
                        <div className="user-form-row">
                            <div className="user-form-field">
                                <label className="user-form-label">Full Name <span className="user-form-required">*</span></label>
                                <div className="user-form-input-icon-wrapper">
                                    <HiOutlineUser className="user-form-input-icon" size={15} />
                                    <InputText
                                        className="user-form-input user-form-input--icon"
                                        value={form.fullName}
                                        onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                                        placeholder="Enter full name"
                                    />
                                </div>
                            </div>
                            <div className="user-form-field">
                                <label className="user-form-label">Email Address <span className="user-form-required">*</span></label>
                                <div className="user-form-input-icon-wrapper">
                                    <HiOutlineEnvelope className="user-form-input-icon" size={15} />
                                    <InputText
                                        className="user-form-input user-form-input--icon"
                                        value={form.email}
                                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                                        placeholder="Enter email address"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="user-form-row">
                            <div className="user-form-field">
                                <label className="user-form-label">Phone Number</label>
                                <div className="user-form-input-icon-wrapper">
                                    <HiOutlinePhone className="user-form-input-icon" size={15} />
                                    <InputText
                                        className="user-form-input user-form-input--icon"
                                        value={form.phone}
                                        onChange={(e) => setForm({ ...form, phone: e.target.value })}
                                        placeholder="Enter phone number"
                                    />
                                </div>
                            </div>
                            <div className="user-form-field">
                                <label className="user-form-label">Password {!editingId && <span className="user-form-required">*</span>}</label>
                                <div className="user-form-input-icon-wrapper">
                                    <HiOutlineLockClosed className="user-form-input-icon" size={15} />
                                    <Password
                                        className="user-form-input user-form-input--icon user-form-password"
                                        value={form.password}
                                        onChange={(e) => setForm({ ...form, password: e.target.value })}
                                        placeholder={editingId ? 'Leave blank to keep current password' : 'Enter password'}
                                        toggleMask
                                        feedback={false}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="user-form-row">
                            <div className="user-form-field">
                                <label className="user-form-label">Role <span className="user-form-required">*</span></label>
                                <Dropdown
                                    value={form.roleId}
                                    onChange={(e) => setForm({ ...form, roleId: e.value })}
                                    options={ROLE_OPTIONS}
                                    placeholder="Select role"
                                    showClear
                                    className="user-form-dropdown"
                                    valueTemplate={(option, props) => option ? (
                                        <span className="user-form-dropdown-value"><HiOutlineShieldCheck size={15} />{option}</span>
                                    ) : props.placeholder}
                                />
                            </div>
                            <div className="user-form-field">
                                <label className="user-form-label">Department <span className="user-form-required">*</span></label>
                                <Dropdown
                                    value={form.departmentId}
                                    onChange={(e) => setForm({ ...form, departmentId: e.value })}
                                    options={DEPARTMENT_OPTIONS}
                                    placeholder="Select department"
                                    showClear
                                    className="user-form-dropdown"
                                    valueTemplate={(option, props) => option ? (
                                        <span className="user-form-dropdown-value"><HiOutlineBuildingOffice2 size={15} />{option}</span>
                                    ) : props.placeholder}
                                />
                            </div>
                        </div>

                        <div className="user-form-row user-form-row--single">
                            <div className="user-form-field user-form-field--status">
                                <label className="user-form-label">Status</label>
                                <div className="user-form-status-toggle">
                                    <span className={form.status === 'Active' ? 'user-form-status-active' : 'user-form-status-inactive'}>{form.status}</span>
                                    <InputSwitch checked={form.status === 'Active'} onChange={(e) => setForm({ ...form, status: e.value ? 'Active' : 'Inactive' })} />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="user-form-feature-strip">
                    <div className="user-form-feature">
                        <span className="user-form-feature-icon"><HiOutlineShieldCheck size={20} /></span>
                        <div>
                            <div className="user-form-feature-title">Secure Access</div>
                            <div className="user-form-feature-text">User will get access based on role and permissions.</div>
                        </div>
                    </div>
                    <div className="user-form-feature">
                        <span className="user-form-feature-icon"><HiOutlineUserGroup size={20} /></span>
                        <div>
                            <div className="user-form-feature-title">Team Collaboration</div>
                            <div className="user-form-feature-text">Add users and assign them to departments.</div>
                        </div>
                    </div>
                </div>
            </Dialog>
        </div>
    );
};
export default Users;
