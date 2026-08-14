import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { Dropdown } from 'primereact/dropdown';
import { Dialog } from 'primereact/dialog';
import { HiOutlineCheckCircle } from 'react-icons/hi2';
import type { CrmStage, CrmStagePayload, CrmStageOutcome } from '../types/stage.types';

const outcomeOptions: { label: string; value: CrmStageOutcome }[] = [
    { label: 'Open', value: 'open' },
    { label: 'Won', value: 'won' },
    { label: 'Lost', value: 'lost' },
];

const swatches = ['#64748B', '#2563eb', '#16a34a', '#ea580c', '#dc2626', '#7c3aed', '#0891b2', '#ca8a04'];

interface StageFormDialogProps {
    visible: boolean;
    editing: CrmStage | null;
    nextSortOrder: number;
    onHide: () => void;
    onSave: (payload: Partial<CrmStagePayload>) => void;
}

const StageFormDialog = ({ visible, editing, nextSortOrder, onHide, onSave }: StageFormDialogProps) => {
    const { control, handleSubmit, reset, formState: { errors } } = useForm<CrmStagePayload>({
        defaultValues: { name: '', sortOrder: nextSortOrder, color: swatches[0], isClosed: false, outcome: 'open', status: 'Active' },
    });

    useEffect(() => {
        if (visible) {
            reset(
                editing
                    ? { name: editing.name, sortOrder: editing.sortOrder, color: editing.color, isClosed: editing.isClosed, outcome: editing.outcome, status: editing.status }
                    : { name: '', sortOrder: nextSortOrder, color: swatches[0], isClosed: false, outcome: 'open', status: 'Active' },
            );
        }
    }, [visible, editing, nextSortOrder, reset]);

    const submit = handleSubmit((payload) => onSave({ ...payload, isClosed: payload.outcome !== 'open' }));

    return (
        <Dialog
            visible={visible}
            onHide={onHide}
            header={editing ? 'Edit Stage' : 'Add New Stage'}
            style={{ width: '440px', maxWidth: '95vw' }}
            footer={
                <>
                    <Button label="Cancel" outlined onClick={onHide} />
                    <Button label="Save" icon={<HiOutlineCheckCircle className="mr-2" />} onClick={submit} />
                </>
            }
        >
            <div className="dialog-form-body">
                <div className="form-field">
                    <label>Stage Name *</label>
                    <Controller
                        control={control}
                        name="name"
                        rules={{ required: true }}
                        render={({ field }) => <InputText {...field} placeholder="Enter stage name" />}
                    />
                    {errors.name && <small style={{ color: 'var(--accent-danger-text)' }}>Stage name is required</small>}
                </div>
                <div className="form-field">
                    <label>Outcome</label>
                    <Controller
                        control={control}
                        name="outcome"
                        render={({ field }) => <Dropdown {...field} options={outcomeOptions} onChange={(e) => field.onChange(e.value)} />}
                    />
                </div>
                <div className="form-field">
                    <label>Color</label>
                    <Controller
                        control={control}
                        name="color"
                        render={({ field }) => (
                            <div style={{ display: 'flex', gap: '8px' }}>
                                {swatches.map((swatch) => (
                                    <button
                                        key={swatch}
                                        type="button"
                                        onClick={() => field.onChange(swatch)}
                                        style={{
                                            width: 24,
                                            height: 24,
                                            borderRadius: '50%',
                                            background: swatch,
                                            border: field.value === swatch ? '2px solid var(--text-primary)' : '2px solid transparent',
                                            cursor: 'pointer',
                                        }}
                                    />
                                ))}
                            </div>
                        )}
                    />
                </div>
            </div>
        </Dialog>
    );
};
export default StageFormDialog;
