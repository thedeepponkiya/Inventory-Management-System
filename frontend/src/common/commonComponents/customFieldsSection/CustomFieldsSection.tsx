import { useEffect, useState } from 'react';
import { InputText } from 'primereact/inputtext';
import { InputTextarea } from 'primereact/inputtextarea';
import { InputNumber } from 'primereact/inputnumber';
import { Calendar } from 'primereact/calendar';
import { Dropdown } from 'primereact/dropdown';
import { Checkbox } from 'primereact/checkbox';
import { getCustomFieldDefinitions, type CustomFieldDefinition } from '../../../services/customFieldService';
import './CustomFieldsSection.css';

export type CustomFieldValues = Record<string, unknown>;

interface CustomFieldsSectionProps {
    // Which form this is (see customFieldEntities.util.js's whitelist on the backend - must
    // match one of those keys exactly).
    entityKey: string;
    // Keyed by each field's real column name (definition.columnName), not its label - the
    // same shape the entity's create/update payload sends back as `customFields`.
    values: CustomFieldValues;
    onChange: (columnName: string, value: unknown) => void;
    disabled?: boolean;
}

// Dropped into any form's Add/Edit dialog - fetches whatever custom fields a Developer Admin
// has defined for this entityKey and renders one input per field, wired straight into the
// same customFields object the entity's create/update call sends to the backend (see
// customField.service.js's saveValues). Renders nothing at all (not even an empty section)
// when the entity has no custom fields defined yet, so forms nobody has customized look
// exactly as they did before this feature existed.
const CustomFieldsSection = ({ entityKey, values, onChange, disabled }: CustomFieldsSectionProps) => {
    const [definitions, setDefinitions] = useState<CustomFieldDefinition[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;
        getCustomFieldDefinitions(entityKey)
            .then((data) => { if (!cancelled) setDefinitions(data); })
            .catch(() => { if (!cancelled) setDefinitions([]); })
            .finally(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
    }, [entityKey]);

    if (loading || definitions.length === 0) return null;

    const renderInput = (def: CustomFieldDefinition) => {
        const value = values[def.columnName];
        switch (def.fieldType) {
            case 'textarea':
                return <InputTextarea value={(value as string) ?? ''} onChange={(e) => onChange(def.columnName, e.target.value)} rows={3} disabled={disabled} />;
            case 'number':
                return <InputNumber value={(value as number) ?? null} onValueChange={(e) => onChange(def.columnName, e.value)} disabled={disabled} />;
            case 'date':
                return (
                    <Calendar
                        value={value ? new Date(value as string) : null}
                        onChange={(e) => onChange(def.columnName, e.value ? (e.value as Date).toISOString().slice(0, 10) : null)}
                        dateFormat="dd M yy"
                        disabled={disabled}
                    />
                );
            case 'dropdown':
                return (
                    <Dropdown
                        value={value ?? null}
                        options={(def.options ?? []).map((opt) => ({ label: opt, value: opt }))}
                        onChange={(e) => onChange(def.columnName, e.value)}
                        placeholder="Select"
                        showClear
                        disabled={disabled}
                    />
                );
            case 'checkbox':
                return <Checkbox checked={Boolean(value)} onChange={(e) => onChange(def.columnName, e.checked ?? false)} disabled={disabled} />;
            case 'text':
            default:
                return <InputText value={(value as string) ?? ''} onChange={(e) => onChange(def.columnName, e.target.value)} disabled={disabled} />;
        }
    };

    return (
        <div className="custom-fields-section">
            <div className="custom-fields-section-title">Custom Fields</div>
            <div className="custom-fields-grid">
                {definitions.map((def) => (
                    <div className={`custom-fields-field${def.fieldType === 'checkbox' ? ' custom-fields-field--checkbox' : ''}`} key={def.id}>
                        {def.fieldType === 'checkbox' ? (
                            <label className="custom-fields-checkbox-label">
                                {renderInput(def)}
                                <span>{def.label}{def.required && <span className="custom-fields-required">*</span>}</span>
                            </label>
                        ) : (
                            <>
                                <label className="custom-fields-label">{def.label}{def.required && <span className="custom-fields-required">*</span>}</label>
                                {renderInput(def)}
                            </>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};
export default CustomFieldsSection;
