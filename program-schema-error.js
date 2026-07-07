const MISSING_SCHEMA_CODES = new Set([
  "42P01", // undefined table or view
  "42703", // undefined column
  "42883", // undefined function / RPC
  "3F000", // invalid schema
  "PGRST200", // missing embedded relationship
  "PGRST202", // function missing from the schema cache
  "PGRST204", // column missing from the schema cache
  "PGRST205", // table missing from the schema cache
]);

export function isMissingProgramSchemaError(error) {
  if (!error || Array.isArray(error)) return false;
  if (MISSING_SCHEMA_CODES.has(String(error.code || ""))) return true;

  const message = [error.message, error.details, error.hint].filter(Boolean).join(" ");
  return /(?:relation|table|view|column|function|rpc)\b[^.]*\b(?:does not exist|not found|missing from the schema cache)|could not find\b[^.]*\b(?:table|column|function|relationship)\b[^.]*\bschema cache/i.test(message);
}
