// Compile-time assertions for the inferred `Env<S>` type.
// These are checked by `pnpm run lint` (tsconfig.test.json); at runtime the
// file only registers a trivial test so the runner picks it up.
import { test } from "node:test";
import { check } from "../src/check.js";

type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2
    ? true
    : false;
type Expect<T extends true> = T;

// Never called: only its return type is inspected.
function sample() {
  return check({
    REQ: { type: "string", required: true },
    DEF: { type: "number", default: 3000 },
    BOOL_DEF_FALSE: { type: "boolean", default: false },
    OPT: { type: "boolean" },
    URL: { type: "url", required: true },
    LEVEL: { type: "enum", values: ["debug", "info"] as const, default: "info" },
    LIST: { type: "array", default: [] },
    CONF: { type: "json" },
    PROD_ONLY: { type: "string", requiredIn: ["production"] },
  });
}

type E = ReturnType<typeof sample>;

export type Assertions = [
  Expect<Equal<E["REQ"], string>>,
  Expect<Equal<E["DEF"], number>>,
  Expect<Equal<E["BOOL_DEF_FALSE"], boolean>>,
  Expect<Equal<E["OPT"], boolean | undefined>>,
  Expect<Equal<E["URL"], string>>,
  Expect<Equal<E["LEVEL"], "debug" | "info">>,
  Expect<Equal<E["LIST"], string[]>>,
  Expect<Equal<E["CONF"], unknown>>,
  Expect<Equal<E["PROD_ONLY"], string | undefined>>,
];

test("type assertions compile", () => {});
