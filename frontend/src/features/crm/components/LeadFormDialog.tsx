import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { InputNumber } from 'primereact/inputnumber';
import { InputTextarea } from 'primereact/inputtextarea';
import { Dropdown } from 'primereact/dropdown';
import { InputSwitch } from 'primereact/inputswitch';
import { Dialog } from 'primereact/dialog';
import {
    HiOutlineBuildingOffice2,
    HiOutlineCheckCircle,
    HiOutlineCurrencyRupee,
    HiOutlineDocumentText,
    HiOutlineEnvelope,
    HiOutlinePhone,
    HiOutlineUser,
} from 'react-icons/hi2';
import { useStagesQuery } from '../hooks/useStagesQuery';
import { useSourcesQuery } from '../hooks/useSourcesQuery';
import { useCampaignsQuery } from '../hooks/useCampaignsQuery';
import { useAssignableUsersQuery } from '../hooks/useLeadsQuery';
import { getNextLeadCode } from '../api/leads.api';
import type { CrmLead, CrmLeadPayload } from '../types/lead.types';
import './LeadFormDialog.css';

const emptyForm: CrmLeadPayload = {
    name: '',
    phone: null,
    email: null,
    company: null,
    stageId: null,
    sourceId: null,
    campaignId: null,
    assignedTo: null,
    value: 0,
    status: 'Active',
    priority: 'Medium',
    isStarred: false,
};

const priorityColors: Record<CrmLeadPayload['priority'], { text: string; bg: string }> = {
    High: { text: 'var(--accent-danger-text)', bg: 'var(--accent-danger-bg)' },
    Medium: { text: '#92600a', bg: '#fdf1d3' },
    Low: { text: '#1d4ed8', bg: '#dbeafe' },
};

interface LeadFormDialogProps {
    visible: boolean;
    editing: CrmLead | null;
    onHide: () => void;
    // `notes` is the dialog's own Notes textarea (see below) - not a field on CrmLeadPayload
    // itself. Notes are a separate feature (their own tab in the Lead Detail Drawer); the
    // caller is responsible for creating an actual note against the saved lead's id if this
    // is non-empty, reusing the existing Notes create endpoint rather than this dialog
    // needing its own note-creation logic.
    onSave: (payload: CrmLeadPayload, notes: string) => void;
    // Set when opened from a specific Kanban column's "+ Add" button, so the new lead
    // defaults into that column instead of the lowest-sortOrder stage.
    defaultStageId?: string;
}

const LeadFormDialog = ({ visible, editing, onHide, onSave, defaultStageId }: LeadFormDialogProps) => {
    const { data: stages = [] } = useStagesQuery();
    const { data: sources = [] } = useSourcesQuery();
    const { data: campaigns = [] } = useCampaignsQuery();
    const { data: users = [] } = useAssignableUsersQuery();
    const [previewLeadCode, setPreviewLeadCode] = useState('');
    const [notes, setNotes] = useState('');

    const { control, handleSubmit, reset, formState: { errors } } = useForm<CrmLeadPayload>({ defaultValues: emptyForm });

    // Clears the Notes textarea whenever the dialog transitions from hidden to visible -
    // adjusting state during render (React's documented alternative to a setState-in-effect)
    // rather than inside the effect below, since that effect's own job is syncing
    // react-hook-form's state and fetching the next lead code, not managing this plain
    // useState value.
    const [wasVisible, setWasVisible] = useState(visible);
    if (visible !== wasVisible) {
        setWasVisible(visible);
        if (visible) setNotes('');
    }

    useEffect(() => {
        if (!visible) return;

        if (editing) {
            reset({
                name: editing.name,
                phone: editing.phone,
                email: editing.email,
                company: editing.company,
                stageId: editing.stageId,
                sourceId: editing.sourceId,
                campaignId: editing.campaignId,
                assignedTo: editing.assignedTo,
                value: editing.value,
                status: editing.status,
                priority: editing.priority,
                isStarred: editing.isStarred,
            });
        } else {
            // Default to the passed-in column's stage (when opened from the Kanban board),
            // otherwise the lowest-sortOrder stage ("New Lead") as a UX nicety - stageId
            // stays nullable in the schema regardless.
            const fallbackStageId = stages.length > 0 ? [...stages].sort((a, b) => a.sortOrder - b.sortOrder)[0].id : null;
            reset({ ...emptyForm, stageId: defaultStageId ?? fallbackStageId });
            getNextLeadCode().then(setPreviewLeadCode).catch(() => setPreviewLeadCode(''));
        }
    }, [visible, editing, stages, reset, defaultStageId]);

    const submit = handleSubmit((payload) => onSave(payload, notes.trim()));

    return (
        <Dialog
            visible={visible}
            onHide={onHide}
            header={editing ? 'Edit Lead' : 'Add New Lead'}
            className="lead-form-dialog"
            style={{ width: '640px', maxWidth: '95vw' }}
            footer={
                <div className="lead-form-footer">
                    <Button label="Cancel" outlined onClick={onHide} />
                    <Button label="Save Lead" icon={<HiOutlineCheckCircle className="mr-2" />} onClick={submit} />
                </div>
            }
        >
            <div className="lead-form-grid">
                <div className="lead-form-row">
                    <div className="lead-form-field">
                        <label className="lead-form-label">Lead Code</label>
                        <InputText className="lead-form-input" value={editing ? editing.leadCode : (previewLeadCode || 'Generating...')} disabled />
                        <span className="lead-form-helper">Auto-generated unique lead code</span>
                    </div>
                    <div className="lead-form-field">
                        <label className="lead-form-label">Name <span className="lead-form-required">*</span></label>
                        <div className="lead-form-input-icon-wrapper">
                            <HiOutlineUser className="lead-form-input-icon" size={15} />
                            <Controller
                                control={control}
                                name="name"
                                rules={{ required: true }}
                                render={({ field }) => <InputText {...field} value={field.value ?? ''} className="lead-form-input lead-form-input--icon" placeholder="Enter lead name" />}
                            />
                        </div>
                        {errors.name && <span className="lead-form-error">Name is required</span>}
                    </div>
                </div>

                <div className="lead-form-row">
                    <div className="lead-form-field">
                        <label className="lead-form-label">Phone</label>
                        <div className="lead-form-input-icon-wrapper">
                            <HiOutlinePhone className="lead-form-input-icon" size={15} />
                            <Controller
                                control={control}
                                name="phone"
                                render={({ field }) => <InputText {...field} value={field.value ?? ''} className="lead-form-input lead-form-input--icon" placeholder="Enter phone number" />}
                            />
                        </div>
                    </div>
                    <div className="lead-form-field">
                        <label className="lead-form-label">Email</label>
                        <div className="lead-form-input-icon-wrapper">
                            <HiOutlineEnvelope className="lead-form-input-icon" size={15} />
                            <Controller
                                control={control}
                                name="email"
                                render={({ field }) => <InputText {...field} value={field.value ?? ''} className="lead-form-input lead-form-input--icon" placeholder="Enter email address" />}
                            />
                        </div>
                    </div>
                </div>

                <div className="lead-form-row lead-form-row--single">
                    <div className="lead-form-field">
                        <label className="lead-form-label">Company</label>
                        <div className="lead-form-input-icon-wrapper">
                            <HiOutlineBuildingOffice2 className="lead-form-input-icon" size={15} />
                            <Controller
                                control={control}
                                name="company"
                                render={({ field }) => <InputText {...field} value={field.value ?? ''} className="lead-form-input lead-form-input--icon" placeholder="Enter company name" />}
                            />
                        </div>
                    </div>
                </div>

                <div className="lead-form-row">
                    <div className="lead-form-field">
                        <label className="lead-form-label">Stage</label>
                        <Controller
                            control={control}
                            name="stageId"
                            render={({ field }) => (
                                <Dropdown
                                    {...field}
                                    options={stages.map((s) => ({ label: s.name, value: s.id }))}
                                    onChange={(e) => field.onChange(e.value)}
                                    placeholder="Select stage"
                                    showClear
                                    className="lead-form-dropdown"
                                />
                            )}
                        />
                    </div>
                    <div className="lead-form-field">
                        <label className="lead-form-label">Source</label>
                        <Controller
                            control={control}
                            name="sourceId"
                            render={({ field }) => (
                                <Dropdown
                                    {...field}
                                    options={sources.map((s) => ({ label: s.name, value: s.id }))}
                                    onChange={(e) => field.onChange(e.value)}
                                    placeholder="Select source"
                                    showClear
                                    className="lead-form-dropdown"
                                />
                            )}
                        />
                    </div>
                </div>

                <div className="lead-form-row">
                    <div className="lead-form-field">
                        <label className="lead-form-label">Campaign</label>
                        <Controller
                            control={control}
                            name="campaignId"
                            render={({ field }) => (
                                <Dropdown
                                    {...field}
                                    options={campaigns.map((c) => ({ label: c.name, value: c.id }))}
                                    onChange={(e) => field.onChange(e.value)}
                                    placeholder="Select campaign"
                                    showClear
                                    className="lead-form-dropdown"
                                />
                            )}
                        />
                    </div>
                    <div className="lead-form-field">
                        <label className="lead-form-label">Assigned To</label>
                        <Controller
                            control={control}
                            name="assignedTo"
                            render={({ field }) => (
                                <Dropdown
                                    {...field}
                                    options={users.map((u) => ({ label: u.userName, value: u.id }))}
                                    onChange={(e) => field.onChange(e.value)}
                                    placeholder="Select user"
                                    showClear
                                    className="lead-form-dropdown"
                                />
                            )}
                        />
                    </div>
                </div>

                <div className="lead-form-divider"><span>Additional Information</span></div>

                <div className="lead-form-row lead-form-row--triple">
                    <div className="lead-form-field">
                        <label className="lead-form-label">Value</label>
                        <div className="lead-form-input-icon-wrapper">
                            <HiOutlineCurrencyRupee className="lead-form-input-icon" size={15} />
                            <Controller
                                control={control}
                                name="value"
                                render={({ field }) => (
                                    <InputNumber value={field.value} onValueChange={(e) => field.onChange(e.value ?? 0)} mode="decimal" minFractionDigits={2} className="lead-form-input-number lead-form-input--icon" placeholder="Enter value" />
                                )}
                            />
                        </div>
                        <span className="lead-form-helper">Expected deal value</span>
                    </div>
                    <div className="lead-form-field">
                        <label className="lead-form-label">Priority</label>
                        <Controller
                            control={control}
                            name="priority"
                            render={({ field }) => {
                                const colors = priorityColors[field.value];
                                return (
                                    <Dropdown
                                        {...field}
                                        options={[
                                            { label: 'High', value: 'High' },
                                            { label: 'Medium', value: 'Medium' },
                                            { label: 'Low', value: 'Low' },
                                        ]}
                                        onChange={(e) => field.onChange(e.value)}
                                        className="lead-form-dropdown lead-form-priority-dropdown"
                                        style={{ color: colors.text, background: colors.bg }}
                                    />
                                );
                            }}
                        />
                        <span className="lead-form-helper">Set lead priority</span>
                    </div>
                    <div className="lead-form-field">
                        <label className="lead-form-label">Status</label>
                        <Controller
                            control={control}
                            name="status"
                            render={({ field }) => (
                                <div className="lead-form-status-toggle">
                                    <InputSwitch checked={field.value === 'Active'} onChange={(e) => field.onChange(e.value ? 'Active' : 'Archived')} />
                                    <span className={field.value === 'Active' ? 'lead-form-status-active' : 'lead-form-status-archived'}>{field.value}</span>
                                </div>
                            )}
                        />
                        <span className="lead-form-helper">Toggle lead status</span>
                    </div>
                </div>

                <div className="lead-form-row lead-form-row--single">
                    <div className="lead-form-field">
                        <label className="lead-form-label">Notes</label>
                        <div className="lead-form-input-icon-wrapper lead-form-input-icon-wrapper--textarea">
                            <HiOutlineDocumentText className="lead-form-input-icon lead-form-input-icon--textarea" size={15} />
                            <InputTextarea
                                value={notes}
                                onChange={(e) => setNotes(e.target.value.slice(0, 500))}
                                rows={3}
                                maxLength={500}
                                className="lead-form-textarea lead-form-input--icon"
                                placeholder="Enter notes about this lead (optional)"
                            />
                            <span className="lead-form-char-count">{notes.length}/500</span>
                        </div>
                        <span className="lead-form-helper">Add any additional notes or details about this lead</span>
                    </div>
                </div>
            </div>
        </Dialog>
    );
};
export default LeadFormDialog;
