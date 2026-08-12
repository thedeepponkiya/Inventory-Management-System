import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { Dropdown } from 'primereact/dropdown';
import { InputSwitch } from 'primereact/inputswitch';
import { Dialog } from 'primereact/dialog';
import { HiOutlineCheckCircle } from 'react-icons/hi2';
import { SOURCE_TYPE_OPTIONS, type CrmSource, type CrmSourcePayload } from '../types/source.types';

const emptyForm: CrmSourcePayload = { name: '', type: 'Manual', status: 'Active' };

interface SourceFormDialogProps {
    visible: boolean;
    editing: CrmSource | null;
    onHide: () => void;
    onSave: (payload: CrmSourcePayload) => void;
}

const SourceFormDialog = ({ visible, editing, onHide, onSave }: SourceFormDialogProps) => {
    const { control, handleSubmit, reset, formState: { errors } } = useForm<CrmSourcePayload>({ defaultValues: emptyForm });

    useEffect(() => {
        if (visible) {
            reset(editing ? { name: editing.name, type: editing.type, status: editing.status } : emptyForm);
        }
    }, [visible, editing, reset]);

    const submit = handleSubmit((payload) => onSave(payload));

    return (
        <Dialog
            visible={visible}
            onHide={onHide}
            header={editing ? 'Edit Source' : 'Add New Source'}
            style={{ width: '440px' }}
            footer={
                <>
                    <Button label="Cancel" outlined onClick={onHide} />
                    <Button label="Save" icon={<HiOutlineCheckCircle className="mr-2" />} onClick={submit} />
                </>
            }
        >
            <div className="dialog-form-body">
                <div className="form-field">
                    <label>Source Name *</label>
                    <Controller
                        control={control}
                        name="name"
                        rules={{ required: true }}
                        render={({ field }) => <InputText {...field} placeholder="Enter source name" />}
                    />
                    {errors.name && <small style={{ color: 'var(--accent-danger-text)' }}>Source name is required</small>}
                </div>
                <div className="form-field">
                    <label>Type</label>
                    <Controller
                        control={control}
                        name="type"
                        render={({ field }) => <Dropdown {...field} options={SOURCE_TYPE_OPTIONS} onChange={(e) => field.onChange(e.value)} placeholder="Select type" />}
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
export default SourceFormDialog;
