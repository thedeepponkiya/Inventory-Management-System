import { useEffect, useRef, useState } from 'react';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { Dropdown } from 'primereact/dropdown';
import { InputText } from 'primereact/inputtext';
import { InputSwitch } from 'primereact/inputswitch';
import { Toast } from 'primereact/toast';
import {
    HiOutlineWrenchScrewdriver,
    HiOutlinePlus,
    HiOutlinePencilSquare,
    HiOutlineTrash,
    HiOutlineXMark,
    HiOutlineArrowUturnLeft,
} from 'react-icons/hi2';
import {
    getCustomFieldEntities,
    getCustomFieldDefinitions,
    createCustomField,
    updateCustomField,
    deleteCustomField,
    getBuiltInFields,
    setBuiltInFieldLabel,
    resetBuiltInFieldLabel,
    type CustomFieldEntity,
    type CustomFieldTypeOption,
    type CustomFieldDefinition,
    type CustomFieldType,
    type BuiltInField,
} from '../../../services/customFieldService';
import { showToast } from '../../commonFunctions/commonFunction';
import { DEFAULT_DATA_TYPE_VALUE } from '../../constants/commonConstant';
import CommonDataTable, { type ColumnConfig } from '../dataTable/DataTable';
import StatusBadge from '../statusBadge/StatusBadge';
import './CustomFieldsPanel.css';

const DELETE_CONFIRM_PHRASE = 'DELETE FIELD';

interface FieldFormState {
    label: string;
    fieldType: CustomFieldType;
    required: boolean;
    active: boolean;
    options: string[];
    optionDraft: string;
}

const emptyForm: FieldFormState = { label: '', fieldType: 'text', required: false, active: true, options: [], optionDraft: '' };

// Developer Admin's Custom Fields feature - pick a form/entity on the left, manage its fields
// on the right. Every write here runs real ALTER TABLE DDL server-side (see
// customField.service.js) - Add/Edit are low-risk (add a column / metadata-only edit), but
// Delete permanently drops the real column and everything entered in it, hence its own typed
// confirm step, same pattern as Database Reset/Update.
const CustomFieldsPanel = () => {
    const toast = useRef<Toast>(DEFAULT_DATA_TYPE_VALUE.NULL);
    const [entities, setEntities] = useState<CustomFieldEntity[]>([]);
    const [fieldTypes, setFieldTypes] = useState<CustomFieldTypeOption[]>([]);
    const [selectedEntity, setSelectedEntity] = useState<string>('');
    const [definitions, setDefinitions] = useState<CustomFieldDefinition[]>([]);
    const [loading, setLoading] = useState(DEFAULT_DATA_TYPE_VALUE.TRUE);

    const [dialogVisible, setDialogVisible] = useState(DEFAULT_DATA_TYPE_VALUE.FALSE);
    const [editing, setEditing] = useState<CustomFieldDefinition | null>(null);
    const [form, setForm] = useState<FieldFormState>(emptyForm);
    const [saving, setSaving] = useState(DEFAULT_DATA_TYPE_VALUE.FALSE);

    const [deleteTarget, setDeleteTarget] = useState<CustomFieldDefinition | null>(null);
    const [deleteConfirmText, setDeleteConfirmText] = useState('');
    const [deleting, setDeleting] = useState(DEFAULT_DATA_TYPE_VALUE.FALSE);

    const [builtInFields, setBuiltInFields] = useState<BuiltInField[]>([]);
    const [renameTarget, setRenameTarget] = useState<BuiltInField | null>(null);
    const [renameLabel, setRenameLabel] = useState('');
    const [renaming, setRenaming] = useState(DEFAULT_DATA_TYPE_VALUE.FALSE);

    useEffect(() => {
        getCustomFieldEntities()
            .then((data) => {
                setEntities(data.entities);
                setFieldTypes(data.fieldTypes);
                setSelectedEntity(data.entities[0]?.key ?? '');
            })
            .catch((err) => showToast(toast, 'error', 'Error', err instanceof Error ? err.message : 'Failed to load form list'));
    }, []);

    // `loading` only ever gates the very first render (its initial value is already `true`,
    // matching RolePermissionsPanel's own pattern) - switching entities or refetching after a
    // save/delete just replaces `definitions` directly, so the previous entity's list stays
    // visible for the brief moment until the new one arrives instead of flashing an empty
    // state in between.
    const fetchDefinitions = (entityKey: string) => {
        // includeInactive: true - Developer Admin needs to see (and be able to re-enable)
        // fields that have been switched off too, unlike the real forms consuming these
        // definitions, which only ever fetch active ones (see getCustomFieldDefinitions).
        getCustomFieldDefinitions(entityKey, true)
            .then(setDefinitions)
            .catch((err) => showToast(toast, 'error', 'Error', err instanceof Error ? err.message : 'Failed to load fields'))
            .finally(() => setLoading(DEFAULT_DATA_TYPE_VALUE.FALSE));
    };

    const fetchBuiltInFields = (entityKey: string) => {
        getBuiltInFields(entityKey)
            .then(setBuiltInFields)
            .catch(() => setBuiltInFields([]));
    };

    useEffect(() => {
        if (selectedEntity) {
            fetchDefinitions(selectedEntity);
            fetchBuiltInFields(selectedEntity);
        }
    }, [selectedEntity]);

    const openRenameDialog = (field: BuiltInField) => {
        setRenameTarget(field);
        setRenameLabel(field.label);
    };

    const handleRename = async () => {
        if (!renameTarget || !renameLabel.trim()) return;
        setRenaming(DEFAULT_DATA_TYPE_VALUE.TRUE);
        try {
            const updated = await setBuiltInFieldLabel(renameTarget.entityKey, renameTarget.fieldKey, renameLabel.trim());
            setBuiltInFields(updated);
            showToast(toast, 'success', 'Renamed', 'Field label updated successfully');
            setRenameTarget(null);
        } catch (err) {
            showToast(toast, 'error', 'Error', err instanceof Error ? err.message : 'Failed to rename field');
        } finally {
            setRenaming(DEFAULT_DATA_TYPE_VALUE.FALSE);
        }
    };

    const handleResetLabel = async (field: BuiltInField) => {
        try {
            const updated = await resetBuiltInFieldLabel(field.entityKey, field.fieldKey);
            setBuiltInFields(updated);
            showToast(toast, 'success', 'Reset', `"${field.defaultLabel}" restored to its default label`);
        } catch (err) {
            showToast(toast, 'error', 'Error', err instanceof Error ? err.message : 'Failed to reset field label');
        }
    };

    const openAddDialog = () => {
        setEditing(null);
        setForm(emptyForm);
        setDialogVisible(DEFAULT_DATA_TYPE_VALUE.TRUE);
    };

    const openEditDialog = (def: CustomFieldDefinition) => {
        setEditing(def);
        setForm({ label: def.label, fieldType: def.fieldType, required: def.required, active: def.active, options: def.options ?? [], optionDraft: '' });
        setDialogVisible(DEFAULT_DATA_TYPE_VALUE.TRUE);
    };

    const addOption = () => {
        const value = form.optionDraft.trim();
        if (!value || form.options.includes(value)) return;
        setForm((prev) => ({ ...prev, options: [...prev.options, value], optionDraft: '' }));
    };

    const removeOption = (value: string) => {
        setForm((prev) => ({ ...prev, options: prev.options.filter((o) => o !== value) }));
    };

    const handleSave = async () => {
        if (!form.label.trim()) {
            showToast(toast, 'error', 'Error', 'Label is required');
            return;
        }
        if (form.fieldType === 'dropdown' && form.options.length === 0) {
            showToast(toast, 'error', 'Error', 'Add at least one option for a dropdown field');
            return;
        }
        setSaving(DEFAULT_DATA_TYPE_VALUE.TRUE);
        try {
            if (editing) {
                await updateCustomField(editing.id, { label: form.label, options: form.options, required: form.required, active: form.active });
                showToast(toast, 'success', 'Updated', 'Custom field updated successfully');
            } else {
                await createCustomField({ entityKey: selectedEntity, label: form.label, fieldType: form.fieldType, options: form.options, required: form.required, active: form.active });
                showToast(toast, 'success', 'Created', 'Custom field created successfully');
            }
            setDialogVisible(DEFAULT_DATA_TYPE_VALUE.FALSE);
            fetchDefinitions(selectedEntity);
        } catch (err) {
            showToast(toast, 'error', 'Error', err instanceof Error ? err.message : 'Failed to save custom field');
        } finally {
            setSaving(DEFAULT_DATA_TYPE_VALUE.FALSE);
        }
    };

    const openDeleteConfirm = (def: CustomFieldDefinition) => {
        setDeleteTarget(def);
        setDeleteConfirmText('');
    };

    const handleDelete = async () => {
        if (!deleteTarget || deleteConfirmText !== DELETE_CONFIRM_PHRASE) return;
        setDeleting(DEFAULT_DATA_TYPE_VALUE.TRUE);
        try {
            await deleteCustomField(deleteTarget.id, deleteConfirmText);
            showToast(toast, 'success', 'Deleted', 'Custom field deleted successfully');
            setDeleteTarget(null);
            fetchDefinitions(selectedEntity);
        } catch (err) {
            showToast(toast, 'error', 'Error', err instanceof Error ? err.message : 'Failed to delete custom field');
        } finally {
            setDeleting(DEFAULT_DATA_TYPE_VALUE.FALSE);
        }
    };

    const selectedEntityLabel = entities.find((e) => e.key === selectedEntity)?.label ?? '';

    // A single merged row shape so built-in fields (rename-only) and custom fields (full
    // CRUD) can share one DataTable instead of two separate ones - `kind` decides which set
    // of columns/actions apply to that row, `builtIn`/`custom` carry the original record
    // through to those renderers so nothing about either feature's own logic has to change.
    interface FieldRow {
        rowKey: string;
        kind: 'builtin' | 'custom';
        label: string;
        builtIn?: BuiltInField;
        custom?: CustomFieldDefinition;
    }

    const fieldRows: FieldRow[] = [
        ...builtInFields.map((field): FieldRow => ({ rowKey: `builtin:${field.fieldKey}`, kind: 'builtin', label: field.label, builtIn: field })),
        ...definitions.map((def): FieldRow => ({ rowKey: `custom:${def.id}`, kind: 'custom', label: def.label, custom: def })),
    ];

    const fieldColumns: ColumnConfig<FieldRow>[] = [
        {
            field: 'label',
            header: 'Field',
            body: (row) => (
                <span className="custom-fields-list-row-label">
                    {row.label}
                    {row.kind === 'builtin' && row.builtIn?.isOverridden && <span className="custom-fields-renamed-badge">Renamed</span>}
                </span>
            ),
        },
        {
            field: 'kind',
            header: 'Type',
            body: (row) => (row.kind === 'builtin'
                ? <span className="custom-fields-type-badge">Built-in</span>
                : (fieldTypes.find((t) => t.key === row.custom?.fieldType)?.label ?? row.custom?.fieldType)),
        },
        {
            field: 'rowKey',
            header: 'Required',
            key: 'required',
            // Built-in fields are core columns the app always relies on - "required" isn't a
            // toggleable concept for them the way it is for a custom field, so there's nothing
            // meaningful to show beyond a dash.
            body: (row) => (row.kind === 'custom'
                ? <StatusBadge label={row.custom?.required ? 'Required' : 'Optional'} variant={row.custom?.required ? 'warning' : 'neutral'} />
                : '-'),
        },
        {
            field: 'rowKey',
            header: 'Active',
            key: 'active',
            // Built-in fields can't be switched off (see builtInFields.util.js) - they're
            // effectively always active, unlike a custom field which Developer Admin can
            // toggle off without deleting it (see the Active field in Add/Edit Custom Field).
            body: (row) => (row.kind === 'custom'
                ? <StatusBadge label={row.custom?.active === false ? 'Inactive' : 'Active'} variant={row.custom?.active === false ? 'danger' : 'success'} />
                : <StatusBadge label="Always" variant="neutral" />),
        },
        {
            field: 'rowKey',
            header: 'Details',
            key: 'details',
            body: (row) => (row.kind === 'builtin'
                ? (row.builtIn?.isOverridden ? <span className="custom-fields-list-row-meta">Default: {row.builtIn.defaultLabel}</span> : '-')
                : <code>{row.custom?.columnName}</code>),
        },
    ];

    const fieldActions = (row: FieldRow) => {
        if (row.kind === 'builtin' && row.builtIn) {
            const field = row.builtIn;
            return (
                <div className="custom-fields-list-row-actions">
                    <HiOutlinePencilSquare size={16} title="Rename" onClick={() => openRenameDialog(field)} />
                    {field.isOverridden && (
                        <HiOutlineArrowUturnLeft size={16} title="Reset to default" onClick={() => handleResetLabel(field)} />
                    )}
                </div>
            );
        }
        if (row.kind === 'custom' && row.custom) {
            const def = row.custom;
            return (
                <div className="custom-fields-list-row-actions">
                    <HiOutlinePencilSquare size={16} title="Edit" onClick={() => openEditDialog(def)} />
                    <HiOutlineTrash size={16} color="var(--accent-danger-text)" title="Delete" onClick={() => openDeleteConfirm(def)} />
                </div>
            );
        }
        return null;
    };

    return (
        <div className="custom-fields-panel">
            <Toast ref={toast} />

            <div className="custom-fields-panel-header">
                <span className="custom-fields-panel-header-icon"><HiOutlineWrenchScrewdriver size={20} /></span>
                <div className="custom-fields-panel-header-text">
                    <h2>Custom Fields</h2>
                    <p>Add, edit, or delete fields on any form - each field is a real database column.</p>
                </div>
                <div className="custom-fields-form-select">
                    <label>Select Form</label>
                    <Dropdown
                        value={selectedEntity}
                        options={entities.map((entity) => ({ label: entity.label, value: entity.key }))}
                        onChange={(e) => setSelectedEntity(e.value)}
                        placeholder="Choose a form"
                        className="custom-fields-form-dropdown"
                    />
                </div>
            </div>

            <div className="custom-fields-panel-body">
                <div className="custom-fields-panel-main">
                    <div className="custom-fields-panel-main-header">
                        <div>
                            <h3>{selectedEntityLabel} Fields</h3>
                            <p>
                                {builtInFields.length} built-in field{builtInFields.length === 1 ? '' : 's'} (rename only) ·{' '}
                                {definitions.length} custom field{definitions.length === 1 ? '' : 's'} defined.
                            </p>
                        </div>
                        <Button label="Add Field" icon={<HiOutlinePlus className="mr-2" />} onClick={openAddDialog} outlined disabled={!selectedEntity} />
                    </div>

                    <CommonDataTable<FieldRow>
                        value={fieldRows}
                        columns={fieldColumns}
                        actionBodyTemplate={fieldActions}
                        dataKey="rowKey"
                        loading={loading}
                        paginator={false}
                        sortable={false}
                        filterable={false}
                        emptyMessage="No fields found for this form."
                    />
                </div>
            </div>

            <Dialog
                visible={dialogVisible}
                onHide={() => setDialogVisible(DEFAULT_DATA_TYPE_VALUE.FALSE)}
                header={editing ? 'Edit Custom Field' : 'Add Custom Field'}
                style={{ width: '420px', maxWidth: '95vw' }}
            >
                <div className="dialog-form-body">
                    <div className="form-field">
                        <label>Label <span className="custom-fields-required">*</span></label>
                        <InputText value={form.label} onChange={(e) => setForm((prev) => ({ ...prev, label: e.target.value }))} placeholder="e.g. Warranty Period" />
                        <small className="custom-fields-hint">Enter a descriptive name for this field.</small>
                    </div>
                    <div className="form-field">
                        <label>Field Type <span className="custom-fields-required">*</span></label>
                        <Dropdown
                            value={form.fieldType}
                            options={fieldTypes.map((t) => ({ label: t.label, value: t.key }))}
                            onChange={(e) => setForm((prev) => ({ ...prev, fieldType: e.value }))}
                            disabled={!!editing}
                        />
                        <small className="custom-fields-hint">
                            {editing ? "Field type can't be changed after creation - delete and recreate instead." : 'Select the type of data this field will store.'}
                        </small>
                    </div>
                    {form.fieldType === 'dropdown' && (
                        <div className="form-field">
                            <label>Options</label>
                            <div className="custom-fields-option-input-row">
                                <InputText
                                    value={form.optionDraft}
                                    onChange={(e) => setForm((prev) => ({ ...prev, optionDraft: e.target.value }))}
                                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addOption(); } }}
                                    placeholder="Type an option and press Enter"
                                />
                                <Button label="Add" outlined onClick={addOption} />
                            </div>
                            <div className="custom-fields-option-chips">
                                {form.options.map((opt) => (
                                    <span className="custom-fields-option-chip" key={opt}>
                                        {opt}
                                        <HiOutlineXMark size={14} onClick={() => removeOption(opt)} />
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                    <div className="custom-fields-toggle-row">
                        <div className="custom-fields-toggle-row-text">
                            <label>Required</label>
                            <p>Mark this field as mandatory.</p>
                        </div>
                        <InputSwitch checked={form.required} onChange={(e) => setForm((prev) => ({ ...prev, required: e.value }))} />
                    </div>
                    <div className="custom-fields-toggle-row">
                        <div className="custom-fields-toggle-row-text">
                            <label>Active</label>
                            <p>Enable this field for use.</p>
                        </div>
                        <InputSwitch checked={form.active} onChange={(e) => setForm((prev) => ({ ...prev, active: e.value }))} />
                    </div>
                </div>
                <div className="dialog-form-actions">
                    <Button label="Cancel" outlined onClick={() => setDialogVisible(DEFAULT_DATA_TYPE_VALUE.FALSE)} disabled={saving} />
                    <Button label={editing ? 'Save Changes' : 'Add Field'} onClick={handleSave} loading={saving} />
                </div>
            </Dialog>

            <Dialog
                visible={!!renameTarget}
                onHide={() => setRenameTarget(null)}
                header="Rename Field"
                style={{ width: '380px', maxWidth: '95vw' }}
            >
                <div className="dialog-form-body">
                    <div className="form-field">
                        <label>Label</label>
                        <InputText value={renameLabel} onChange={(e) => setRenameLabel(e.target.value)} placeholder={renameTarget?.defaultLabel} />
                    </div>
                </div>
                <div className="dialog-form-actions">
                    <Button label="Cancel" outlined onClick={() => setRenameTarget(null)} disabled={renaming} />
                    <Button label="Save" onClick={handleRename} loading={renaming} disabled={!renameLabel.trim()} />
                </div>
            </Dialog>

            <Dialog
                visible={!!deleteTarget}
                onHide={() => setDeleteTarget(null)}
                header="Delete Custom Field"
                style={{ width: '420px', maxWidth: '95vw' }}
            >
                <p>
                    Delete the field <strong>{deleteTarget?.label}</strong>? This permanently removes its database column
                    (<code>{deleteTarget?.columnName}</code>) and any data already entered in it. A full database backup is taken first.
                </p>
                <p>Type <strong>{DELETE_CONFIRM_PHRASE}</strong> below to confirm.</p>
                <InputText
                    value={deleteConfirmText}
                    onChange={(e) => setDeleteConfirmText(e.target.value)}
                    placeholder={DELETE_CONFIRM_PHRASE}
                    className="custom-fields-confirm-input"
                />
                <div className="dialog-form-actions">
                    <Button label="Cancel" outlined onClick={() => setDeleteTarget(null)} disabled={deleting} />
                    <Button
                        label="Delete Field"
                        className="p-button-danger"
                        onClick={handleDelete}
                        loading={deleting}
                        disabled={deleteConfirmText !== DELETE_CONFIRM_PHRASE}
                    />
                </div>
            </Dialog>
        </div>
    );
};
export default CustomFieldsPanel;
