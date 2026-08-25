// Closed whitelist mapping a custom field's `fieldType` to the exact, hardcoded SQL column
// type it creates - customField.service.js only ever interpolates one of these fixed strings
// into an ALTER TABLE statement, never a type derived from user input. Also carries the JS
// coercion each type needs when a value comes in from a form (Postgres driver already returns
// NUMERIC as a string and DATE as a JS Date, so both directions need care) and a param binder
// hint (dropdown/text/textarea bind as plain strings; number/checkbox need their own coercion).
const FIELD_TYPES = {
  text: { sql: 'VARCHAR(255)', label: 'Text' },
  textarea: { sql: 'TEXT', label: 'Long Text' },
  number: { sql: 'NUMERIC(14,2)', label: 'Number' },
  date: { sql: 'DATE', label: 'Date' },
  dropdown: { sql: 'VARCHAR(100)', label: 'Dropdown' },
  checkbox: { sql: 'BOOLEAN NOT NULL DEFAULT false', label: 'Checkbox' },
};

function isValidFieldType(fieldType) {
  return Object.prototype.hasOwnProperty.call(FIELD_TYPES, fieldType);
}

function sqlTypeFor(fieldType) {
  return FIELD_TYPES[fieldType]?.sql ?? null;
}

// Coerces a raw request-body value to what the column actually expects, so e.g. a number
// field never gets a bare string handed to a NUMERIC column and a checkbox always ends up a
// real boolean regardless of what the frontend happened to send.
function coerceValue(fieldType, rawValue) {
  if (rawValue === null || rawValue === undefined || rawValue === '') return null;
  switch (fieldType) {
    case 'number': {
      const n = Number(rawValue);
      return Number.isFinite(n) ? n : null;
    }
    case 'checkbox':
      return Boolean(rawValue);
    default:
      return rawValue;
  }
}

module.exports = { FIELD_TYPES, isValidFieldType, sqlTypeFor, coerceValue };
