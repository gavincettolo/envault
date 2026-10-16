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

  test("serializes JSON defaults instead of [object Object]", () => {
    const out = generateExample({
      FLAGS: { type: "json", default: { beta: true } },
    });
    assert.match(out, /^FLAGS={"beta":true}$/m);
  });

  test("joins array defaults with the field delimiter", () => {
    const out = generateExample({
      TAGS: { type: "array", default: ["a", "b"], delimiter: "|" },
      HOSTS: { type: "array", default: ["x", "y"] },
    });
    assert.match(out, /^TAGS=a\|b$/m);
    assert.match(out, /^HOSTS=x,y$/m);
  });

  test("leaves values that need no quoting unquoted", () => {
    const out = generateExample({
      A: { type: "string", default: "plain-value" },
      B: { type: "string", default: `it's "fine"` },
      C: { type: "string", default: "x=y" },
    });
    assert.match(out, /^A=plain-value$/m);
    assert.match(out, /^B=it's "fine"$/m);
    assert.match(out, /^C=x=y$/m);
  });

  test("quotes values that dotenv would otherwise misread", () => {
    // Each expected line parses back to the original value with dotenv.
    const cases: [string, string][] = [
      ["pa#ss word", `'pa#ss word'`],
      ["  padded  ", `'  padded  '`],
      ["'quoted'", `"'quoted'"`],
      ['"dq"', `'"dq"'`],
      ["a\nb", `"a\\nb"`],
      ["a\r\nb", `"a\\r\\nb"`],
      ["it's #1", `"it's #1"`],
      ["C:\\new #1", `'C:\\new #1'`],
      [`it's "#"`, "`it's \"#\"`"],
    ];
    for (const [value, expected] of cases) {
      const out = generateExample({ V: { type: "string", default: value } });
      assert.equal(out, `# type: string\nV=${expected}\n`, JSON.stringify(value));
    }
  });

  test("quotes JSON and array defaults that contain #", () => {
    const out = generateExample({
      J: { type: "json", default: { msg: "hello # world" } },
      L: { type: "array", default: ["#a", "b"] },
    });
    assert.match(out, /^J='{"msg":"hello # world"}'$/m);
    assert.match(out, /^L='#a,b'$/m);
  });

  test("comments every line of a multi-line description", () => {
    const out = generateExample({
      PORT: { type: "number", default: 3000, description: "HTTP port\nUsed by the API" },
    });
    assert.match(out, /^# HTTP port\n# Used by the API$/m);
    for (const line of out.split("\n")) {
      assert.ok(line === "" || line.startsWith("#") || line.includes("="), line);
    }
  });
});
