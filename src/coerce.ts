import type { FieldDef, ValidationError } from "./types.js";

const DECIMAL = /^\s*[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?\s*$/;

/**
 * "localhost:3000" or "db.internal:5432" parse as URLs whose scheme is the
 * host name. Catch that common mistake of leaving out the scheme.
 */
const HOST_PORT_WITHOUT_SCHEME = /^(?:localhost|[^:/?#]*\.[^:/?#]*):\d+(?:[/?#]|$)/i;

type Outcome =
  | { value: unknown; error?: never }
  | { value?: never; error: ValidationError };

function makeError(
  key: string,
  message: string,
  value?: string,
): ValidationError {
  if (value !== undefined) return { key, message, value };
  return { key, message };
}

function formatValue(value: unknown): string {
  if (typeof value === "string") return value;
  // String() keeps NaN and Infinity readable; JSON.stringify turns them into "null".
  if (typeof value === "number") return String(value);
  return JSON.stringify(value);
}

/**
 * `RegExp.prototype.test` advances `lastIndex` on global and sticky regexes,
 * so repeated calls would alternate between pass and fail. Test a stateless
 * copy instead, leaving the caller's regex untouched.
 */
function matches(pattern: RegExp, value: string): boolean {
  if (!pattern.global && !pattern.sticky) return pattern.test(value);
  return new RegExp(pattern.source, pattern.flags.replace(/[gy]/g, "")).test(
    value,
  );
}

function runCustomValidate(
  key: string,
  value: unknown,
  field: FieldDef,
): Outcome {
  if (!("validate" in field) || !field.validate) return { value };
  const isSecret = "secret" in field && field.secret === true;
  const fail = (message: string) => ({
    error: makeError(
      key,
      `"${key}" ${message}`,
      isSecret ? undefined : formatValue(value),
    ),
  });
  let result: true | string;
  try {
    result = (field.validate as (v: unknown) => true | string)(value);
  } catch (err) {
    // A throwing hook must not abort aggregation of the other fields.
    return fail(
      `validate threw: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
  if (result === true) return { value };
  // A JS hook may return false or undefined; never print those as a message.
  if (typeof result !== "string" || result === "") {
    return fail("failed custom validation");
  }
  return fail(result);
}

function isRequiredNow(field: FieldDef, environment: string | undefined): boolean {
  if (field.required === true) return true;
  if (field.requiredIn && environment && field.requiredIn.includes(environment)) {
    return true;
  }
  return false;
}

/**
 * Turns a raw env string into the field's type. Only failures to parse the
 * string are reported here; constraints are checked by `checkConstraints`.
 */
function coerce(key: string, raw: string, field: FieldDef): Outcome {
  const isSecret = "secret" in field && field.secret === true;

  switch (field.type) {
    case "string":
    case "url":
    case "enum":
      return { value: raw };

    case "array": {
      const delimiter = field.delimiter ?? ",";
      const items = raw
        .split(delimiter)
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
      return { value: items };
    }

    case "number":
      // Number() also accepts "", "0x1F", "0b11", "0o7" and "Infinity".
      // Only plain decimal notation (optionally with an exponent) is a number
      // here; anything else becomes NaN and is rejected by checkConstraints.
      return { value: DECIMAL.test(raw) ? Number(raw) : NaN };

    case "boolean": {
      // Trim like number does, so "true " from a hand-edited .env still parses.
      const lower = raw.trim().toLowerCase();
      if (["true", "1", "yes", "on"].includes(lower)) return { value: true };
      if (["false", "0", "no", "off"].includes(lower)) return { value: false };
      return {
        error: makeError(
          key,
          `"${key}" must be a boolean (true/false/1/0/yes/no/on/off, got "${raw}")`,
          raw,
        ),
      };
    }

    case "json": {
      try {
        return { value: JSON.parse(raw) as unknown };
      } catch {
        return {
          error: makeError(
            key,
            `"${key}" must be valid JSON`,
            isSecret ? undefined : raw,
          ),
        };
      }
    }

    default: {
      const _exhaustive: never = field;
      return _exhaustive;
    }
  }
}

/**
 * Checks a typed value against the field's constraints, then runs the custom
 * `validate` hook. Used for both coerced env values and schema defaults.
 * `shown` is the value as it should appear in error output.
 */
function checkConstraints(
  key: string,
  value: unknown,
  field: FieldDef,
  shown: string,
): Outcome {
  const isSecret = "secret" in field && field.secret === true;

  switch (field.type) {
    case "string": {
      if (field.pattern && !matches(field.pattern, value as string)) {
        return {
          error: makeError(
            key,
            `"${key}" does not match pattern ${field.pattern}`,
            isSecret ? undefined : shown,
          ),
        };
      }
      break;
    }

    case "number": {
      const n = value as number;
      // Rejects NaN (unparseable input) as well as Infinity.
      if (!Number.isFinite(n)) {
        return {
          error: makeError(
            key,
            `"${key}" must be a finite number (got "${isSecret ? "***" : shown}")`,
            isSecret ? undefined : shown,
          ),
        };
      }
      if (field.min !== undefined && n < field.min) {
        return {
          error: makeError(
            key,
            `"${key}" must be ≥ ${field.min}${isSecret ? "" : ` (got ${n})`}`,
          ),
        };
      }
      if (field.max !== undefined && n > field.max) {
        return {
          error: makeError(
            key,
            `"${key}" must be ≤ ${field.max}${isSecret ? "" : ` (got ${n})`}`,
          ),
        };
      }
      break;
    }

    case "url": {
      try {
        if (HOST_PORT_WITHOUT_SCHEME.test(value as string)) {
          throw new TypeError("missing scheme");
        }
        new (globalThis as unknown as { URL: new (s: string) => unknown }).URL(
          value as string,
        );
      } catch {
        return {
          error: makeError(
            key,
            `"${key}" must be a valid URL (got "${isSecret ? "***" : shown}")`,
            isSecret ? undefined : shown,
          ),
        };
      }
      break;
    }

    case "enum": {
      if (!field.values.includes(value as string)) {
        return {
          error: makeError(
            key,
            `"${key}" must be one of [${field.values.join(", ")}] (got "${shown}")`,
            shown,
          ),
        };
      }
      break;
    }
  }

  return runCustomValidate(key, value, field);
}

/** Missing value: fall back to the default, validated like any value. */
function resolveMissing(
  key: string,
  field: FieldDef,
  environment: string | undefined,
): Outcome {
  if ("default" in field && field.default !== undefined) {
    const outcome = checkConstraints(
      key,
      field.default,
      field,
      formatValue(field.default),
    );
    if (outcome.error) {
      outcome.error.message += " (default value)";
    }
    return outcome;
  }
  if (isRequiredNow(field, environment)) {
    return { error: makeError(key, `Missing required variable "${key}"`) };
  }
  return { value: undefined };
}

export function coerceAndValidate(
  key: string,
  raw: string | undefined,
  field: FieldDef,
  environment?: string,
): Outcome {
  if (raw === undefined || raw === "") {
    return resolveMissing(key, field, environment);
  }

  // ── Provided value: coerce, then validate ──────────────────────────────────
  const coerced = coerce(key, raw, field);
  if (coerced.error) return coerced;
  // "," or " , " yields no items: treat it like an empty value.
  if (field.type === "array" && (coerced.value as string[]).length === 0) {
    return resolveMissing(key, field, environment);
  }
  return checkConstraints(key, coerced.value, field, raw);
}
