import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { InputNumber } from 'primereact/inputnumber';
import { Dropdown } from 'primereact/dropdown';
import { Calendar } from 'primereact/calendar';
import { InputSwitch } from 'primereact/inputswitch';
import { Dialog } from 'primereact/dialog';
import { HiOutlineCheckCircle } from 'react-icons/hi2';
import { useSourcesQuery } from '../hooks/useSourcesQuery';
import type { CrmCampaign, CrmCampaignPayload } from '../types/campaign.types';

const emptyForm: CrmCampaignPayload = { name: '', sourceId: null, startDate: null, endDate: null, budget: 0, status: 'Active' };

interface CampaignFormDialogProps {
    visible: boolean;
    editing: CrmCampaign | null;
    onHide: () => void;
    onSave: (payload: CrmCampaignPayload) => void;
}

const toDate = (value: string | null): Date | null => (value ? new Date(value) : null);
const toDateString = (value: Date | null): string | null => (value ? value.toISOString().slice(0, 10) : null);

const CampaignFormDialog = ({ visible, editing, onHide, onSave }: CampaignFormDialogProps) => {
    const { data: sources = [] } = useSourcesQuery();
    const { control, handleSubmit, reset, formState: { errors } } = useForm<CrmCampaignPayload>({ defaultValues: emptyForm });

    useEffect(() => {
        if (visible) {
            reset(editing ? {
                name: editing.name,
                sourceId: editing.sourceId,
                startDate: editing.startDate,
                endDate: editing.endDate,
                budget: editing.budget,
                status: editing.status,
            } : emptyForm);
        }
    }, [visible, editing, reset]);

    const submit = handleSubmit((payload) => onSave(payload));

    return (
        <Dialog
            visible={visible}
            onHide={onHide}
            header={editing ? 'Edit Campaign' : 'Add New Campaign'}
            style={{ width: '480px', maxWidth: '95vw' }}
            footer={
                <>
                    <Button label="Cancel" outlined onClick={onHide} />
                    <Button label="Save" icon={<HiOutlineCheckCircle className="mr-2" />} onClick={submit} />
                </>
            }
        >
            <div className="dialog-form-body">
                <div className="form-field">
                    <label>Campaign Name *</label>
                    <Controller
                        control={control}
                        name="name"
                        rules={{ required: true }}
                        render={({ field }) => <InputText {...field} placeholder="Enter campaign name" />}
                    />
                    {errors.name && <small style={{ color: 'var(--accent-danger-text)' }}>Campaign name is required</small>}
                </div>
                <div className="form-field">
                    <label>Source</label>
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
                            />
                        )}
                    />
                </div>
                <div className="form-field">
                    <label>Start Date</label>
                    <Controller
                        control={control}
                        name="startDate"
                        render={({ field }) => (
                            <Calendar
                                value={toDate(field.value)}
                                onChange={(e) => field.onChange(toDateString(e.value ?? null))}
                                dateFormat="dd M yy"
                                placeholder="Select start date"
                                showIcon
                            />
                        )}
                    />
                </div>
                <div className="form-field">
                    <label>End Date</label>
                    <Controller
                        control={control}
                        name="endDate"
                        render={({ field }) => (
                            <Calendar
                                value={toDate(field.value)}
                                onChange={(e) => field.onChange(toDateString(e.value ?? null))}
                                dateFormat="dd M yy"
                                placeholder="Select end date"
                                showIcon
                            />
                        )}
                    />
                </div>
                <div className="form-field">
                    <label>Budget</label>
                    <Controller
                        control={control}
                        name="budget"
                        render={({ field }) => (
                            <InputNumber value={field.value} onValueChange={(e) => field.onChange(e.value ?? 0)} mode="decimal" minFractionDigits={2} />
                        )}
                    />
                </div>
                <div className="form-field form-field--row">
                    <label>Status</label>
                    <Controller
                        control={control}
                        name="status"
                        render={({ field }) => (
                            <InputSwitch checked={field.value === 'Active'} onChange={(e) => field.onChange(e.value ? 'Active' : 'Inactive')} />
                        )}
                    />
                </div>
            </div>
        </Dialog>
    );
};
export default CampaignFormDialog;
