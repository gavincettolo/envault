# Contributing to envault

Thank you for your interest in contributing! This is a focused, zero-dependency package — contributions that stay true to that philosophy are most welcome.

## Ground rules

- Zero runtime dependencies. Always. If you need a utility, write it inline.
- All public APIs must be fully typed — no `any` in `src/`. Keep type assertions to the few places where TypeScript cannot narrow on its own.
- Every new feature or bug fix must come with a test.

## Getting started

This repo uses [pnpm](https://pnpm.io). The version is pinned in `package.json` (`packageManager`), so `corepack enable` picks it up automatically.

```bash
git clone https://github.com/gavincettolo/envault
cd envault
pnpm install
pnpm test
```

## Scripts

| Script                | What it does                                                    |
|-----------------------|-----------------------------------------------------------------|
| `pnpm test`           | Runs `tests/*.test.ts` with the built-in `node:test` runner      |
| `pnpm run lint`       | Type-checks `src/` and `tests/` (including the type assertions) |
| `pnpm run build`      | Builds ESM + CJS bundles and declarations into `dist/`          |
| `pnpm run check:package` | Verifies the packed tarball with attw and publint            |

## Workflow

1. Fork the repo and create a branch: `git checkout -b feat/my-feature`
2. Make your changes in `src/`
3. Add tests:
   - runtime behaviour of `check()` → `tests/check.test.ts`
   - `.env.example` output → `tests/generate.test.ts`
   - inferred types → `tests/types.test.ts`
4. Run `pnpm test` and `pnpm run lint` — both must pass
5. Open a pull request with a clear description of what and why

## What makes a good PR

- **New field type** — add the field type to the `FieldDef` union in `src/types.ts`, map it in `InferType`, implement coercion in `src/coerce.ts`, add a placeholder in `src/generate.ts`, and cover it with runtime and type tests.
- **Bug fix** — include a test that fails before the fix and passes after.
- **Docs** — README improvements are always welcome.

## What we'll likely decline

- Adding runtime dependencies
- Features that duplicate what existing field types already cover
- Breaking changes to the public API without a strong justification

## Code style

- 2-space indentation, double quotes, semicolons, trailing commas (follow the existing style)
- Relative imports use the `.js` extension (NodeNext resolution)
- Prefer explicit types over inference in function signatures
- Keep functions small and single-purpose

## Questions?

Open an issue — happy to discuss ideas before you invest time building them.
