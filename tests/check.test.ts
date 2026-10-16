import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { check } from "../src/check.js";

describe("check()", () => {
  test("returns string value", () => {
    const env = check(
      { FOO: { type: "string", required: true } },
      { env: { FOO: "bar" } },
    );
    assert.equal(env.FOO, "bar");
  });

  test("returns default when var is missing", () => {
    const env = check({ PORT: { type: "number", default: 3000 } }, { env: {} });
    assert.equal(env.PORT, 3000);
  });

  test("coerces number", () => {
    const env = check(
      { PORT: { type: "number", required: true } },
      { env: { PORT: "8080" } },
    );
    assert.equal(env.PORT, 8080);
  });

  test("rejects whitespace-only and non-finite numbers", () => {
    for (const v of ["  ", "Infinity", "-Infinity", "abc"]) {
      assert.throws(
        () =>
          check(
            { N: { type: "number", required: true } },
            { env: { N: v } },
          ),
        /must be a finite number/,
        `expected "${v}" to be rejected`,
      );
    }
  });

  test("coerces boolean true variants", () => {
    for (const v of ["true", "1", "yes", "on", "TRUE"]) {
      const env = check(
        { FLAG: { type: "boolean", required: true } },
        { env: { FLAG: v } },
      );
      assert.equal(env.FLAG, true, `expected true for "${v}"`);
    }
  });

  test("coerces boolean false variants", () => {
    for (const v of ["false", "0", "no", "off", "Off"]) {
      const env = check(
        { FLAG: { type: "boolean", required: true } },
        { env: { FLAG: v } },
      );
      assert.equal(env.FLAG, false, `expected false for "${v}"`);
    }
  });

  test("rejects invalid boolean", () => {
    assert.throws(
      () =>
        check(
          { FLAG: { type: "boolean", required: true } },
          { env: { FLAG: "maybe" } },
        ),
      /must be a boolean/,
    );
  });

  test("validates URL", () => {
    const env = check(
      { URL: { type: "url", required: true } },
      { env: { URL: "https://example.com" } },
    );
    assert.equal(env.URL, "https://example.com");
  });

  test("rejects invalid URL", () => {
    assert.throws(
      () =>
        check(
          { URL: { type: "url", required: true } },
          { env: { URL: "not-a-url" } },
        ),
      /must be a valid URL/,
    );
  });

  test("validates enum", () => {
    const env = check(
      {
        NODE_ENV: {
          type: "enum",
          values: ["dev", "prod"] as const,
          required: true,
        },
      },
      { env: { NODE_ENV: "prod" } },
    );
    assert.equal(env.NODE_ENV, "prod");
  });

  test("rejects invalid enum value", () => {
    assert.throws(
      () =>
        check(
          {
            NODE_ENV: {
              type: "enum",
              values: ["dev", "prod"] as const,
              required: true,
            },
          },
          { env: { NODE_ENV: "staging" } },
        ),
      /must be one of \[dev, prod\]/,
    );
  });

  test("parses JSON", () => {
    const env = check(
      { CONFIG: { type: "json", required: true } },
      { env: { CONFIG: '{"x":1}' } },
    );
    assert.deepEqual(env.CONFIG, { x: 1 });
  });

  test("rejects invalid JSON", () => {
    assert.throws(
      () =>
        check(
          { CONFIG: { type: "json", required: true } },
          { env: { CONFIG: "{nope" } },
        ),
      /must be valid JSON/,
    );
  });

  test("treats empty string as missing", () => {
    const env = check(
      { HOST: { type: "string", default: "localhost" } },
      { env: { HOST: "" } },
    );
    assert.equal(env.HOST, "localhost");
  });

  test("optional missing field is undefined", () => {
    const env = check({ X: { type: "string" } }, { env: {} });
    assert.equal(env.X, undefined);
  });

  test("throws with all errors at once", () => {
    assert.throws(
      () =>
        check(
          {
            A: { type: "string", required: true },
            B: { type: "number", required: true },
          },
          { env: {} },
        ),
      (e: Error) =>
        e.message.includes("2 environment variables") &&
        e.message.includes('"A"') &&
        e.message.includes('"B"'),
    );
  });

  test("calls custom onError handler", () => {
    let received: string | undefined;
    assert.throws(
      () =>
        check(
          { X: { type: "string", required: true } },
          {
            env: {},
            onError: (errors) => {
              received = errors[0]?.key;
              throw new Error("handled");
            },
          },
        ),
      /handled/,
    );
    assert.equal(received, "X");
  });

  test("still throws when onError returns instead of throwing", () => {
    let called = false;
    assert.throws(
      () =>
        check(
          { X: { type: "string", required: true } },
          {
            env: {},
            // Simulates a JS caller (or a cast) violating the `never` contract.
            onError: (() => {
              called = true;
            }) as unknown as (errors: unknown) => never,
          },
        ),
      /Missing required variable "X"/,
    );
    assert.ok(called);
  });

  test("masks secret values in errors", () => {
    assert.throws(
      () =>
        check(
          { API_KEY: { type: "url", required: true, secret: true } },
          { env: { API_KEY: "not-a-url" } },
        ),
      (e: Error) => !e.message.includes("not-a-url"),
    );
  });

  test("validates number min/max", () => {
    assert.throws(
      () =>
        check(
          { N: { type: "number", required: true, min: 1, max: 10 } },
          { env: { N: "99" } },
        ),
      /must be ≤ 10/,
    );
    assert.throws(
      () =>
        check(
          { N: { type: "number", required: true, min: 1, max: 10 } },
          { env: { N: "0" } },
        ),
      /must be ≥ 1/,
    );
  });

  test("masks secret values in number range errors", () => {
    assert.throws(
      () =>
        check(
          { N: { type: "number", required: true, max: 10, secret: true } },
          { env: { N: "12345" } },
        ),
      (e: Error) => !e.message.includes("12345"),
    );
  });

  test("validates string pattern", () => {
    assert.throws(
      () =>
        check(
          { SLUG: { type: "string", required: true, pattern: /^[a-z]+$/ } },
          { env: { SLUG: "UPPER" } },
        ),
      /does not match pattern/,
    );
  });

  test("does not leak secret value on pattern mismatch", () => {
    assert.throws(
      () =>
        check(
          {
            TOKEN: {
              type: "string",
              required: true,
              secret: true,
              pattern: /^sk_/,
            },
          },
          { env: { TOKEN: "hunter2" } },
        ),
      (e: Error) => !e.message.includes("hunter2"),
    );
  });

  test("requiredIn throws when environment matches", () => {
    assert.throws(
      () =>
        check(
          { DATABASE_URL: { type: "string", requiredIn: ["production"] } },
          { env: {}, environment: "production" },
        ),
      /Missing required variable "DATABASE_URL"/,
    );
  });

  test("requiredIn does not throw when environment doesn't match", () => {
    const env = check(
      { DATABASE_URL: { type: "string", requiredIn: ["production"] } },
      { env: {}, environment: "development" },
    );
    assert.equal(env.DATABASE_URL, undefined);
  });

  test("custom validate hook rejects value", () => {
    assert.throws(
      () =>
        check(
          {
            PORT: {
              type: "number",
              required: true,
              validate: (n) => (n % 2 === 0 ? true : "must be even"),
            },
          },
          { env: { PORT: "3001" } },
        ),
      /"PORT" must be even/,
    );
  });

  test("custom validate hook accepts value", () => {
    const env = check(
      {
        PORT: {
          type: "number",
          required: true,
          validate: (n) => (n % 2 === 0 ? true : "must be even"),
        },
      },
      { env: { PORT: "3002" } },
    );
    assert.equal(env.PORT, 3002);
  });

  test("custom validate error reports JSON values readably", () => {
    let value: string | undefined;
    assert.throws(
      () =>
        check(
          { CONF: { type: "json", required: true, validate: () => "bad" } },
          {
            env: { CONF: '{"a":1}' },
            onError: (errors) => {
              value = errors[0]?.value;
              throw new Error("handled");
            },
          },
        ),
      /handled/,
    );
    assert.equal(value, '{"a":1}');
  });

  test("coerces array with default delimiter", () => {
    const env = check(
      { ORIGINS: { type: "array", required: true } },
      { env: { ORIGINS: "a.com, b.com,c.com" } },
    );
    assert.deepEqual(env.ORIGINS, ["a.com", "b.com", "c.com"]);
  });

  test("coerces array with custom delimiter", () => {
    const env = check(
      { ORIGINS: { type: "array", required: true, delimiter: "|" } },
      { env: { ORIGINS: "a.com|b.com" } },
    );
    assert.deepEqual(env.ORIGINS, ["a.com", "b.com"]);
  });
});
