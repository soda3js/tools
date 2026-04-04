# @soda3js/soql

Type-safe, zero-dependency SoQL query builder. Leaf package in the monorepo
dependency graph -- all other packages depend on it, it depends on nothing.

## Status

Phase 1 complete: types, AST expressions, compiler, functions, clauses, builder.
138 tests passing with strict coverage (80/75/80/80).

## Architecture

Layered module structure (bottom to top):

1. `types.ts` -- SoQL type vocabulary, `SoQLValue`, `SortDirection`
2. `expressions.ts` -- 7 AST node types (`Column`, `Literal`, `FunctionCall`,
   `BinaryOp`, `UnaryOp`, `Alias`, `Raw`), discriminated by `_tag`
3. `clauses.ts` -- 8 clause types + `Clauses` bag
4. `compiler.ts` -- `compileExpression()` recursive walker, `compileToParams()`
   (SODA2 URL), `compileToBody()` (SODA3 POST SQL)
5. `functions.ts` -- Tier 1 function constructors (comparison, range, null,
   set, pattern, boolean, aggregate, string, arithmetic, case)
6. `builder.ts` -- `SoQLBuilder` (immutable fluent API), `SoQL` (static facade)
7. `index.ts` -- re-exports full public API

**For detailed architecture, rationale, and data flow:**
`@./.claude/design/soql/architecture.md`

Load when adding AST nodes, modifying compiler output, or debugging compilation.

## Key Patterns

- **Immutable builder:** Every `SoQLBuilder` method returns a new instance.
  Safe for query branching.
- **Discriminated unions:** All AST nodes have `_tag` for exhaustive matching.
- **Dual output:** Single AST compiles to both URL params and POST body SQL
  via shared `compileExpression()` walker.
- **Argument coercion:** `toExpression()` wraps bare strings as `Column`,
  primitives as `Literal`. `toValue()` always wraps as `Literal`.

## Conventions and Gotchas

- `CaseWhen` uses `.result` (not `.then`) due to Biome `noThenProperty` rule
- Reserved-word functions: `case_()`, `in_()` (re-exported as `inList` from index)
- Internal sentinel names `__case` and `__list` -- used by compiler, not user-facing
- `$q` (full-text search) is silently omitted from POST body output (SODA2 only)
- Column names with spaces are backtick-quoted; system columns (`:id`) pass through
- Strings are single-quoted with doubled internal quotes; `*` passes through unquoted
- `.where()` AND-folds with any prior WHERE clause
- `.orderBy()` appends to existing ORDER BY items

## Testing

Tests live in `__test__/lib/`:

- `expressions.test.ts` -- AST node construction and type discrimination
- `compiler.test.ts` -- expression compilation, output formats, escaping
- `functions.test.ts` -- all Tier 1 function constructors
- `clauses.test.ts` -- clause construction and composition
- `builder.test.ts` -- fluent API, immutability, full query compilation
- `ast-contract.test.ts` -- AST shape stability for cross-package consumers

Run: `pnpm test` from repo root or `pnpm vitest run` from this directory.

Coverage: strict level via root `vitest.config.ts` (80/75/80/80).

## Future Work

- Tier 2 functions: date/time, geospatial, conversion
- Schema-aware type parameter (`SoQLBuilder<T>`) for compile-time column checking
- AST visitor/transformer utilities
- Effect Schema integration
