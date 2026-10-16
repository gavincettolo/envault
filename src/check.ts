import type {
  Schema,
  Env,
  CheckOptions,
  ValidationError,
  FieldDef,
} from "./types.js";
import { coerceAndValidate } from "./coerce.js";

export function check<const S extends Schema>(
  schema: S,
  options: CheckOptions = {},
): Env<S> {
  const source =
    options.env ??
    (globalThis as { process?: { env: Record<string, string | undefined> } })
      .process?.env ??
    {};
  const errors: ValidationError[] = [];
  const result: Record<string, unknown> = {};

  for (const key of Object.keys(schema)) {
    const field = schema[key] as FieldDef;
    // Only own properties: a plain-object `env` would otherwise expose
    // inherited members such as `constructor` or `toString`.
    const raw = Object.prototype.hasOwnProperty.call(source, key)
      ? source[key]
      : undefined;

    const outcome = coerceAndValidate(key, raw, field, options.environment);

    if ("error" in outcome) {
      errors.push(outcome.error);
    } else {
      // defineProperty, not assignment: a "__proto__" key would otherwise
      // replace the result's prototype instead of becoming a property.
      Object.defineProperty(result, key, {
        value: outcome.value,
        enumerable: true,
        writable: true,
        configurable: true,
      });
    }
  }

  if (errors.length > 0) {
    // onError is typed `=> never`, but a JS caller may return normally.
    // Fall through to the default throw so a partial result never escapes.
    options.onError?.(errors);
    const lines = errors.map((e) => `  ✗ ${e.message}`);
    throw new Error(
      `envault: ${errors.length} environment variable${errors.length > 1 ? "s" : ""} failed validation:\n\n${lines.join("\n")}\n`,
    );
  }

  // Env<S> is readonly; freeze so the runtime matches the type.
  return Object.freeze(result) as Env<S>;
}
