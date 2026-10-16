import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { generateExample } from "../src/generate.js";

describe("generateExample()", () => {
  test("includes all keys", () => {
    const out = generateExample({
      DATABASE_URL: { type: "url", required: true },
      PORT: { type: "number", default: 3000 },
    });
    assert.match(out, /^DATABASE_URL=https:\/\/example\.com$/m);
    assert.match(out, /^PORT=3000$/m);
  });

  test("leaves secret values blank", () => {
    const out = generateExample({
      API_KEY: { type: "string", required: true, secret: true },
    });
    assert.match(out, /^API_KEY=$/m);
    assert.doesNotMatch(out, /your_api_key/);
  });

  test("includes description as comment", () => {
    const out = generateExample({
      PORT: { type: "number", default: 3000, description: "HTTP server port" },
    });
    assert.match(out, /^# HTTP server port$/m);
  });

  test("annotates type and constraints", () => {
    const out = generateExample({
      WORKERS: { type: "number", required: true, min: 1, max: 32 },
    });
    assert.match(out, /^# required, type: number, min: 1, max: 32$/m);
  });

  test("uses first enum value as placeholder", () => {
    const out = generateExample({
      LEVEL: { type: "enum", values: ["info", "debug"] as const },
    });
    assert.match(out, /^LEVEL=info$/m);
  });
});
