# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- `check()` uses a `const` type parameter: enum `values` infer a literal union without `as const`

### Fixed
- String `pattern` regexes with the `g` or `y` flag no longer pass and fail on alternate `check()` calls
- Boolean fields ignore surrounding whitespace (`" true "` previously failed while numbers were trimmed)
- A `validate` hook that throws is reported as a validation error instead of aborting `check()` and hiding the other errors
- Number fields reject whitespace-only values and `Infinity` (previously coerced to `0` / `Infinity`)
- `generateExample()` quotes values containing `#`, line breaks, surrounding whitespace or a leading quote, so dotenv reads them back unchanged instead of truncating them
- `generateExample()` serializes `json` defaults with `JSON.stringify` instead of printing `[object Object]`
- `generateExample()` joins `array` defaults with the field's `delimiter`
- `generateExample()` comments every line of a multi-line `description`
- `ValidationError.value` from a failing `validate` hook is JSON-serialized for non-string values
- `check()` still throws the aggregated error if a custom `onError` returns instead of throwing
- `check()` only reads own properties of `options.env`, ignoring inherited ones such as `toString`
- CommonJS consumers now resolve `index.d.cts` instead of the ESM declaration file
- README `check()` signature shows the `const` type parameter
- README install/import examples use the published name `@gavincettolo/envault`
- `check()` stores a `__proto__` schema key as a property instead of replacing the result's prototype
- A `validate` hook returning something other than `true` or a message (e.g. `false`) fails with "failed custom validation" instead of printing `false`
- README comparison table corrected against the current releases of zod, dotenv and envalid

### Changed
- `check()` returns a frozen object, so the runtime matches the readonly `Env<S>` type
- Number fields accept only decimal notation (with optional exponent); hex, binary and octal literals are rejected
- URL fields reject `host:port` values without a scheme, such as `localhost:3000`
- An array value with no items after splitting (e.g. `,`) is treated as missing: it uses the default or fails if required
- Default values are validated like provided values (`values`, `min`/`max`, `pattern`, URL syntax, `validate`); an invalid default now makes `check()` fail with a `(default value)` error instead of being returned silently
- Tests run on the built-in `node:test` runner and are type-checked by `pnpm run lint`
- `engines.node` is now `>=20`: Node 18 is end-of-life and was no longer tested in CI
- CI runs on Node 20, 22 and 24 and checks the packed tarball with attw and publint
- Publish workflow verifies that the tag matches `package.json` and pins npm to major 11

## [0.2.0] - 2026-07-01

### Added
- `array` field type — splits a delimited string into `string[]` (`delimiter` option, default `,`)
- `requiredIn` field option — require a field only when `options.environment` matches
- `validate` field option — custom per-field validation function on every type
- CI workflow (GitHub Actions) running lint/build/test on push and PR across Node 18/20/22
- Publish workflow that builds, tests, and publishes to npm on version tags

### Fixed
- `options.environment` is now actually used (previously declared but had no effect)
- Number `min`/`max` error messages now mask the value for fields marked `secret`

### Changed
- `package.json` now declares `engines.node >= 18` and `sideEffects: false`

## [0.1.0] - 2026-06-11

### Added
- Initial release
- `check()` — validates and coerces environment variables from a typed schema
- Field types: `string`, `number`, `boolean`, `url`, `enum`, `json`
- Per-field options: `required`, `default`, `secret`, `pattern`, `min`, `max`, `description`
- Aggregated errors — all failures reported at once, not just the first
- Secret masking — sensitive values never appear in error output
- `generateExample()` — generates a `.env.example` file from a schema
- Full TypeScript inference — return type is inferred from the schema shape
- Zero runtime dependencies
- ESM + CJS dual build

[Unreleased]: https://github.com/gavincettolo/envault/compare/v0.2.0...HEAD
[0.2.0]: https://github.com/gavincettolo/envault/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/gavincettolo/envault/releases/tag/v0.1.0
