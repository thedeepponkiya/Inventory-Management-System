import { useEffect, useState } from 'react';
import { getBuiltInFields } from '../../services/customFieldService';

// Fetches whatever label overrides Developer Admin has set for this entity's built-in fields
// (see CustomFieldsPanel.tsx's "Built-in Fields" section) and returns a small `label(fieldKey,
// defaultLabel)` lookup - every form wired up to this (see Bom.tsx / getBomColumns) calls it
// wherever it would otherwise show a hardcoded header/label string, falling back to that same
// hardcoded string when there's no override yet (covers both "nothing's been overridden" and
// "the fetch hasn't resolved yet", so nothing ever renders blank while loading).
export function useFieldLabels(entityKey: string) {
    const [labels, setLabels] = useState<Record<string, string>>({});

    useEffect(() => {
        let cancelled = false;
        getBuiltInFields(entityKey)
            .then((fields) => {
                if (cancelled) return;
                const map: Record<string, string> = {};
                fields.forEach((f) => { map[f.fieldKey] = f.label; });
                setLabels(map);
            })
            .catch(() => { /* falls back to hardcoded defaults - see label() below */ });
        return () => { cancelled = true; };
    }, [entityKey]);

    const label = (fieldKey: string, defaultLabel: string): string => labels[fieldKey] ?? defaultLabel;
    return { label };
}
