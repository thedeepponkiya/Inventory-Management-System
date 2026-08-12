// Meta's field_data uses form-author-chosen field names (e.g. "full_name", "your_name",
// a custom label), not a standardized schema - matched case-insensitively against a small
// alias table. Anything that doesn't match is not discarded: the caller attaches it to the
// lead as a note instead, so no submitted data is silently lost.
const FIELD_ALIASES = {
  name: ['full_name', 'name', 'your_name', 'full name'],
  email: ['email', 'work_email', 'email_address'],
  phone: ['phone_number', 'phone', 'contact_number', 'mobile', 'mobile_number'],
  company: ['company_name', 'company', 'organization'],
};

function findAlias(fieldName) {
  const normalized = fieldName.trim().toLowerCase();
  return Object.keys(FIELD_ALIASES).find((key) => FIELD_ALIASES[key].includes(normalized));
}

// `fieldData` is Meta's raw array: [{ name: 'full_name', values: ['Rahul Patel'] }, ...]
// Returns { mapped: { name, email, phone, company }, unmapped: [{ name, value }] }.
function mapLeadFields(fieldData) {
  const mapped = { name: null, email: null, phone: null, company: null };
  const unmapped = [];

  for (const field of fieldData || []) {
    const value = field.values?.[0] ?? null;
    const alias = findAlias(field.name || '');
    if (alias && !mapped[alias]) {
      mapped[alias] = value;
    } else {
      unmapped.push({ name: field.name, value });
    }
  }

  return { mapped, unmapped };
}

function formatUnmappedNote(unmapped) {
  if (!unmapped.length) return null;
  const lines = unmapped.map((field) => `${field.name}: ${field.value ?? '—'}`);
  return `Additional fields submitted on this Meta lead form:\n${lines.join('\n')}`;
}

module.exports = { mapLeadFields, formatUnmappedNote };
