import { useEffect, useState } from 'react';
import { getCustomFieldDefinitions, type CustomFieldDefinition } from '../../services/customFieldService';
import type { ColumnConfig } from '../commonComponents/dataTable/DataTable';

// Renders one custom field's stored value plainly - dropdown/text/textarea are already
// strings, number/date come back from Postgres as strings too (this app's usual
// NUMERIC-comes-back-as-a-string situation), checkbox is the one type that needs a real
// yes/no label instead of the raw boolean.
function renderCustomFieldValue(value: unknown, fieldType: CustomFieldDefinition['fieldType']): string {
    if (value === null || value === undefined || value === '') return '—';
    if (fieldType === 'checkbox') return value ? 'Yes' : 'No';
    return String(value);
}

// Appends one DataTable column per custom field currently defined for `entityKey`, reading
// each value from the row's own `customFields` object (see bomService.ts's normalizeBom for
// how that gets populated) rather than a real property of T - every entity's row type already
// declares `customFields: Record<string, unknown>`, so `field: 'customFields'` is always a
// valid Extract<keyof T, string> regardless of which entity this is used for; `key` (the
// field's own column name) is what actually distinguishes one custom-field column from
// another sharing that same `field`. Not sortable/filterable - these are admin-defined,
// open-ended values, not part of the entity's own indexed/typed schema.
export function useCustomFieldColumns<T extends { customFields: Record<string, unknown> }>(entityKey: string): ColumnConfig<T>[] {
    const [definitions, setDefinitions] = useState<CustomFieldDefinition[]>([]);

    useEffect(() => {
        let cancelled = false;
        getCustomFieldDefinitions(entityKey)
            .then((data) => { if (!cancelled) setDefinitions(data); })
            .catch(() => { if (!cancelled) setDefinitions([]); });
        return () => { cancelled = true; };
    }, [entityKey]);

    return definitions.map((def) => ({
        field: 'customFields' as const,
        key: def.columnName,
        header: def.label,
        sortable: false,
        filter: false,
        body: (row: T) => renderCustomFieldValue(row.customFields[def.columnName], def.fieldType),
    })) as ColumnConfig<T>[];
}
