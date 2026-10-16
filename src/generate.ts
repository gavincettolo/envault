import type { Schema, FieldDef } from "./types.js";

function placeholderFor(key: string, field: FieldDef): string {
  if (field.default !== undefined) {
    switch (field.type) {
      case "json":
        return JSON.stringify(field.default);
      case "array":
        return field.default.join(field.delimiter ?? ",");
      default:
        return String(field.default);
    }
  }
  switch (field.type) {
    case "string":
      return `your_${key.toLowerCase()}`;
    case "number":
      return "0";
    case "boolean":
      return "false";
    case "url":
      return "https://example.com";
    case "enum":
      return field.values[0] ?? "";
    case "json":
      return "{}";
    case "array":
      return "";
  }
}

/**
 * Quotes a value so dotenv reads it back unchanged. Unquoted, dotenv drops
 * everything from `#` (inline comment), trims surrounding whitespace, strips
 * one surrounding pair of quotes, and stops at a line break.
 */
function quoteValue(value: string): string {
  if (!/[#\r\n]|^\s|\s$|^['"`]/.test(value)) return value;

  // Double quotes are the only style where dotenv expands \n and \r, so they
  // can carry line breaks on one line. They would also turn a literal
  // backslash-n already in the value into a line break, so avoid that case.
  const doubleOk = !value.includes('"') && !/\\[nr]/.test(value);
  const doubleQuoted = `"${value.replace(/\r/g, "\\r").replace(/\n/g, "\\n")}"`;
  const hasLineBreak = /[\r\n]/.test(value);

  if (hasLineBreak && doubleOk) return doubleQuoted;
  // Single quotes and backticks are literal, so prefer them otherwise.
  if (!value.includes("'")) return `'${value}'`;
  if (doubleOk) return doubleQuoted;
  if (!value.includes("`")) return `\`${value}\``;
  // The value contains every quote character: dotenv has no escape for that.
  return doubleQuoted;
}

function commentFor(field: FieldDef): string[] {
  const lines: string[] = [];
  if ("description" in field && field.description) {
    for (const line of field.description.split(/\r?\n/)) {
      lines.push(`# ${line}`.trimEnd());
    }
  }
  const meta: string[] = [];
  if ("required" in field && field.required) meta.push("required");
  if ("requiredIn" in field && field.requiredIn?.length) {
    meta.push(`required in: ${field.requiredIn.join(" | ")}`);
  }
  if ("secret" in field && field.secret) meta.push("secret");
  if ("type" in field) meta.push(`type: ${field.type}`);
  if ("values" in field) meta.push(`values: ${field.values.join(" | ")}`);
  if ("min" in field && field.min !== undefined) meta.push(`min: ${field.min}`);
  if ("max" in field && field.max !== undefined) meta.push(`max: ${field.max}`);
  if ("delimiter" in field && field.delimiter) {
    meta.push(`delimiter: "${field.delimiter}"`);
  }
  if (meta.length) lines.push(`# ${meta.join(", ")}`);
  return lines;
}

/**
 * Generates the content of a .env.example file from a schema.
 * Each variable is annotated with its type, constraints, and description.
 */
export function generateExample(schema: Schema): string {
  const sections: string[] = [];

  for (const [key, field] of Object.entries(schema)) {
    const comments = commentFor(field);
    const placeholder = placeholderFor(key, field);
    const isSecret = "secret" in field && field.secret;
    const value = isSecret ? "" : quoteValue(placeholder);

    sections.push([...comments, `${key}=${value}`].join("\n"));
  }

  return sections.join("\n\n") + "\n";
}
