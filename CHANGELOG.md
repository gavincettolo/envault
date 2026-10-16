# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- `check()` uses a `const` type parameter: enum `values` infer a literal union without `as const`

### Fixed
- Number fields reject whitespace-only values and `Infinity` (previously coerced to `0` / `Infinity`)
- `generateExample()` serializes `json` defaults with `JSON.stringify` instead of printing `[object Object]`
- `generateExample()` joins `array` defaults with the field's `delimiter`
- `generateExample()` comments every line of a multi-line `description`
- `ValidationError.value` from a failing `validate` hook is JSON-serialized for non-string values
- `check()` still throws the aggregated error if a custom `onError` returns instead of throwing
- `check()` only reads own properties of `options.env`, ignoring inherited ones such as `toString`
- CommonJS consumers now resolve `index.d.cts` instead of the ESM declaration file
- README install/import examples use the published name `@gavincettolo/envault`

### Changed
- Tests run on the built-in `node:test` runner and are type-checked by `pnpm run lint`
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
