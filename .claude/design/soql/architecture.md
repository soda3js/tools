---
status: current
module: soql
category: architecture
created: 2026-04-03
updated: 2026-04-03
last-synced: 2026-04-03
completeness: 85
related: []
dependencies: []
---

# SoQL Query Builder - Architecture

Type-safe, zero-dependency SoQL query builder that compiles a discriminated-union AST into
both SODA2 URL parameters and SODA3 POST body strings.

## Table of Contents

1. [Overview](#overview)
2. [Current State](#current-state)
3. [Rationale](#rationale)
4. [System Architecture](#system-architecture)
5. [Data Flow](#data-flow)
6. [Integration Points](#integration-points)
7. [Testing Strategy](#testing-strategy)
8. [Future Enhancements](#future-enhancements)
9. [Related Documentation](#related-documentation)

---

## Overview

The `@soda3js/soql` package provides a pure TypeScript, zero-dependency SoQL query builder.
It represents SoQL queries as an immutable abstract syntax tree (AST) using discriminated
unions, then compiles that AST to either SODA2 URL query parameters or SODA3 POST body SQL
strings. The package is the leaf dependency in the monorepo -- all other packages depend on
it, but it depends on nothing.

**Key Design Principles:**

- Immutability: Every builder method returns a new `SoQLBuilder` instance, enabling safe
  query branching without shared state
- Discriminated unions: All AST nodes carry a `_tag` field for exhaustive pattern matching,
  following Effect-TS conventions for downstream consumers
- Dual output: A single AST compiles to two formats (URL params and POST body) via a shared
  expression walker, with format differences isolated to clause framing
- Zero dependencies: Pure TypeScript with no runtime dependencies, ensuring the package
  remains lightweight and universally compatible

**When to reference this document:**

- When adding new SoQL functions or expression types to the AST
- When modifying the compiler output formats
- When integrating soql into other packages (client, cli, api)
- When debugging query compilation issues

---

## Current State

### System Components

#### Component 1: Type System (`types.ts`)

**Location:** `packages/soql/src/lib/types.ts`

**Purpose:** Defines the SoQL type vocabulary and value representations used throughout
the package.

**Exports:**

- `SoQLDataType` -- Union of 21 SODA API column type name strings
- `SoQLTypeMap` -- Interface mapping each SoQL type to its JavaScript runtime representation
  (GeoJSON shapes for spatial types, primitives for scalars)
- `SortDirection` -- `"ASC" | "DESC"` for ORDER BY clauses
- `SoQLValue` -- `string | number | boolean | null` for compiler literal serialization

**Dependencies:** None (pure type definitions, no runtime code)

#### Component 2: AST Expressions (`expressions.ts`)

**Location:** `packages/soql/src/lib/expressions.ts`

**Purpose:** Defines the 7 AST node types and their constructor functions.

**Node types (discriminated by `_tag`):**

- `Column` -- Column reference (`name: string`)
- `Literal` -- Value literal (`value: SoQLValue`)
- `FunctionCall` -- SoQL function invocation (`name: string`, `args: Expression[]`)
- `BinaryOp` -- Binary operator (`op: string`, `left: Expression`, `right: Expression`)
- `UnaryOp` -- Unary operator with position (`op: string`, `operand: Expression`,
  `position: "prefix" | "postfix"`)
- `Alias` -- Aliased expression (`expression: Expression`, `name: string`)
- `Raw` -- Escape hatch for raw SoQL strings (`soql: string`)

**Union type:** `Expression = Column | Literal | FunctionCall | BinaryOp | UnaryOp | Alias | Raw`

**Constructor functions:** `column()`, `literal()`, `functionCall()`, `binaryOp()`,
`unaryOp()`, `alias()`, `raw()`

**Dependencies:** Imports `SoQLValue` from `types.ts`

#### Component 3: Compiler (`compiler.ts`)

**Location:** `packages/soql/src/lib/compiler.ts`

**Purpose:** Compiles AST expressions and clause bags into output strings.

**Key functions:**

- `compileExpression(expr: Expression): string` -- Recursive AST walker, shared by both
  output formats
- `compileToParams(clauses: Clauses): string` -- SODA2 URL params
  (`$select=...&$where=...&$limit=...`)
- `compileToBody(clauses: Clauses): string` -- SODA3 POST body SQL
  (`SELECT ... WHERE ... LIMIT ...`)

**Special compilation rules:**

- `__case` function name triggers CASE/WHEN/THEN/ELSE/END output
- `BETWEEN`/`NOT BETWEEN` operators unpack nested AND node for `col BETWEEN low AND high`
- `IN`/`NOT IN` operators unpack `__list` function for `col IN (v1, v2, ...)`
- Boolean operators (AND, OR, NOT) trigger parenthesization of binary sub-expressions
- Column names with spaces are backtick-quoted; system columns (`:id`) pass through
- Strings are single-quoted with doubled internal quotes; `*` passes through unquoted

**Dependencies:** Imports `Expression` from `expressions.ts`, `Clauses` from `clauses.ts`

#### Component 4: Function Constructors (`functions.ts`)

**Location:** `packages/soql/src/lib/functions.ts`

**Purpose:** Tier 1 SoQL function constructors -- standalone exported functions that return
AST nodes.

**Categories:**

| Category | Functions | Returns |
| --- | --- | --- |
| Comparison | `eq`, `neq`, `gt`, `gte`, `lt`, `lte` | `BinaryOp` |
| Range | `between`, `notBetween` | `BinaryOp` (BETWEEN) |
| Null | `isNull`, `isNotNull` | `UnaryOp` (postfix) |
| Set | `in_`, `notIn` | `BinaryOp` (IN/NOT IN) |
| Pattern | `like`, `notLike`, `startsWith` | `BinaryOp` (LIKE) |
| Boolean | `and`, `or` (variadic fold), `not` | `BinaryOp`/`UnaryOp` |
| Aggregate | `count`, `sum`, `avg`, `min`, `max` | `FunctionCall` |
| String | `upper`, `lower`, `concat` | `FunctionCall`/`BinaryOp` |
| Arithmetic | `add`, `sub`, `mul`, `div` | `BinaryOp` |
| Case | `case_` | `FunctionCall` (__case) |

**Argument coercion:** `toExpression()` auto-wraps bare strings as `Column` nodes and
primitives as `Literal` nodes. `toValue()` always wraps as `Literal` (right-hand side
semantics).

**Dependencies:** Imports from `expressions.ts` and `types.ts`

#### Component 5: Clause Types (`clauses.ts`)

**Location:** `packages/soql/src/lib/clauses.ts`

**Purpose:** Plain data containers for the 8 SoQL clause types plus the `Clauses` bag.

**Clause types:** `SelectClause`, `WhereClause`, `OrderByClause`, `GroupByClause`,
`HavingClause`, `LimitClause`, `OffsetClause`, `SearchClause`

**`Clauses` interface:** Bag of all optional clauses comprising a SoQL query. Each field
is optional, allowing partial query construction.

**Factory functions:** `selectClause()`, `whereClause()`, `orderByClause()`,
`groupByClause()`, `havingClause()`, `limitClause()`, `offsetClause()`, `searchClause()`

**Dependencies:** Imports `Expression` from `expressions.ts`, `SortDirection` from `types.ts`

#### Component 6: Builder (`builder.ts`)

**Location:** `packages/soql/src/lib/builder.ts`

**Purpose:** Fluent immutable builder API and static entry point class.

**`SoQLBuilder` class:**

- Private `#clauses: Clauses` field (true encapsulation via private class field)
- Every method returns a new `SoQLBuilder` with shallow-copied clauses
- `.where()` AND-folds with any prior WHERE clause
- `.orderBy()` appends to existing ORDER BY items
- `.toParams()` and `.toBody()` compile to output strings

**`SoQL` class:**

- Private constructor (cannot be instantiated)
- `SoQL.query()` factory returns a new `SoQLBuilder`
- All Tier 1 functions exposed as static methods (`SoQL.eq`, `SoQL.and`, etc.)
- Expression constructors: `SoQL.alias`, `SoQL.column`, `SoQL.raw`

**Dependencies:** Imports from all other modules

#### Component 7: Public API (`index.ts`)

**Location:** `packages/soql/src/index.ts`

**Purpose:** Re-exports the full public API surface.

**Exports:**

- Classes: `SoQL`, `SoQLBuilder`
- Type exports: All AST node types, clause types, `SoQLDataType`, `SoQLTypeMap`,
  `SoQLValue`, `SortDirection`, `CaseWhen`
- Value exports: AST constructors (`column`, `literal`, `alias`, `raw`, etc.)
- Standalone functions: All Tier 1 function constructors (with `in_` re-exported
  as `inList`)

**Dependencies:** `types.ts`

### Architecture Diagram

```text
                        index.ts (re-exports)
                             |
              +--------------+--------------+
              |              |              |
         builder.ts    functions.ts   expressions.ts
              |              |              |
              +---------+----+----+---------+
                        |         |
                   clauses.ts  compiler.ts
                        |         |
                        +----+----+
                             |
                         types.ts
```

### Current Limitations

- No Tier 2/3 SoQL functions (date/time, geospatial, window functions)
- No schema-aware type parameter for compile-time column checking
- No Effect Schema definitions (pure TS only)
- No runtime validation of column names or types
- No AST visitor/transformer utilities
- `$q` (full-text search) is silently omitted from POST body output

---

## Rationale

### Architectural Decisions

#### Decision 1: Discriminated Union AST

**Context:** Need a representation for SoQL query expressions that supports recursive
composition, pattern matching, and future extensibility.

**Options considered:**

1. **Discriminated unions with `_tag` (Chosen):**
   - Pros: Idiomatic TypeScript, exhaustive switch matching, aligns with Effect-TS
     conventions, zero overhead
   - Cons: Adding new node types requires updating the union
   - Why chosen: Best TypeScript ergonomics, zero runtime cost, enables future
     `@soda3js/api` transpiler to pattern-match on AST nodes

2. **Class hierarchy with visitor pattern:**
   - Pros: Familiar OOP pattern, extensible
   - Cons: Runtime overhead, harder to serialize, more boilerplate
   - Why rejected: Over-engineered for the use case

3. **String-based builder (concatenation):**
   - Pros: Simple to implement
   - Cons: No structure for analysis/transformation, injection risk, cannot compile
     to multiple formats
   - Why rejected: Cannot support dual output formats from a single representation

#### Decision 2: Immutable Builder Pattern

**Context:** Need a fluent API for constructing queries that supports query branching
(building multiple queries from a shared base).

**Why chosen:** Returning new instances from every method call prevents accidental mutation
when branching queries. The cost of shallow-copying a small `Clauses` object is negligible.

#### Decision 3: Dual Output Compilation

**Context:** SODA2 uses URL query parameters while SODA3 uses POST body SQL syntax.
Both use identical expression syntax.

**Why chosen:** A shared `compileExpression()` walker handles the recursive AST traversal
identically. Only the clause-level framing differs between formats. This avoids duplicating
the expression compiler.

#### Decision 4: `__case` and `__list` Internal Function Names

**Context:** CASE/WHEN and IN(...) have unique syntax that does not fit the standard
`name(args)` function call pattern.

**Why chosen:** Using internal sentinel function names (`__case`, `__list`) allows these
constructs to be represented as `FunctionCall` nodes in the AST without adding new node
types. The compiler recognizes these names and emits the correct syntax.

### Design Patterns Used

#### Pattern 1: Discriminated Unions

- **Where used:** All AST nodes (`Expression` type) and clause types
- **Why used:** Type-safe exhaustive matching in the compiler
- **Implementation:** `_tag` string literal field on each interface

#### Pattern 2: Builder Pattern (Immutable)

- **Where used:** `SoQLBuilder` class
- **Why used:** Fluent API with safe query branching
- **Implementation:** Every method returns `new SoQLBuilder(...)` with copied clauses

#### Pattern 3: Static Facade

- **Where used:** `SoQL` class
- **Why used:** Provides a single namespace for all query functions (convenient for
  consumers who prefer `SoQL.eq()` over importing `eq` directly)
- **Implementation:** Static method references to standalone function constructors

### Constraints and Trade-offs

#### Trade-off 1: String-typed operators

- **What we gained:** Simplicity -- no need for an operator enum or union type
- **What we sacrificed:** Compile-time validation of operator strings
- **Why it's worth it:** Operators are set by function constructors (not user input),
  so invalid operators cannot reach the compiler in normal usage

#### Trade-off 2: No schema awareness

- **What we gained:** Zero-dependency, universal compatibility, simpler API
- **What we sacrificed:** No compile-time column name or type checking
- **Why it's worth it:** Schema awareness requires metadata fetching (HTTP), which
  belongs in the client package. The query builder stays pure.

---

## System Architecture

### Layered Architecture

#### Layer 1: Type Foundations

**Components:** `types.ts`

**Responsibilities:**

- Define the SoQL type vocabulary
- Map SoQL types to JavaScript representations
- Define compiler value types (`SoQLValue`)

#### Layer 2: AST Core

**Components:** `expressions.ts`, `clauses.ts`

**Responsibilities:**

- Define all AST node types
- Provide constructor functions for nodes
- Define clause containers

**Communication:** Clauses reference Expression nodes. Expressions reference SoQLValue.

#### Layer 3: Compilation

**Components:** `compiler.ts`, `functions.ts`

**Responsibilities:**

- Compile AST to output strings (compiler)
- Construct AST nodes from user-friendly arguments (functions)

**Communication:** Compiler walks Expression trees. Functions build Expression trees
using constructors from Layer 2.

#### Layer 4: User API

**Components:** `builder.ts`, `index.ts`

**Responsibilities:**

- Fluent query construction API
- Public API surface management

**Communication:** Builder constructs Clauses bags and delegates to compiler for output.

---

## Data Flow

### Query Construction Flow

```text
User code
    |
    v
SoQL.query()                   --> new SoQLBuilder({})
    .select("name", "pop")     --> new SoQLBuilder({ select: SelectClause })
    .where(SoQL.gt("pop", 1e6)) --> new SoQLBuilder({ select, where: WhereClause })
    .limit(10)                 --> new SoQLBuilder({ select, where, limit: LimitClause })
    |
    v
.toParams()                    --> compileToParams(clauses)
    |                               |
    |                               +--> compileSelect() --> compileExpression() per expr
    |                               +--> compileExpression(where.expression)
    |                               +--> "$select=...&$where=...&$limit=10"
    v
.toBody()                      --> compileToBody(clauses)
                                    |
                                    +--> "SELECT ... WHERE ... LIMIT 10"
```

### Expression Compilation Flow

The `compileExpression()` function is a recursive switch on `_tag`:

```text
Expression node
    |
    +-- Column      --> name (backtick-quoted if spaces, raw if system col)
    +-- Literal     --> null | boolean | number | 'string' (single-quoted)
    +-- FunctionCall --> name(arg1, arg2) or CASE WHEN (__case)
    +-- BinaryOp    --> left OP right (with parenthesization for AND/OR)
    +-- UnaryOp     --> OP operand (prefix) or operand OP (postfix)
    +-- Alias       --> expr AS name
    +-- Raw         --> raw string passthrough
```

---

## Integration Points

### Internal Integrations

#### Integration 1: `@soda3js/client`

**How it integrates:** Client imports `SoQL`, `SoQLBuilder`, and output compilation
methods. Queries are built with the fluent API and compiled to params (GET) or body
(POST) depending on the request method.

**Data exchange:** `SoQLBuilder.toParams()` returns URL query string;
`SoQLBuilder.toBody()` returns SQL body string.

#### Integration 2: `@soda3js/cli`

**How it integrates:** CLI builds queries from command-line arguments using SoQL
functions, then compiles to the appropriate format.

#### Integration 3: `@soda3js/api` (future)

**How it integrates:** API server will import individual function constructors from
`functions.ts` and AST node types from `expressions.ts` for query transpilation and
validation on the server side.

---

## Testing Strategy

### Test Structure

All tests live in `packages/soql/__test__/lib/` with 6 test files covering 138 tests.

**Coverage target:** Strict level (80/75/80/80 for statements/branches/functions/lines)

### Unit Tests

**Location:** `packages/soql/__test__/lib/*.test.ts`

**Test files:**

- `expressions.test.ts` -- AST node construction and type discrimination
- `compiler.test.ts` -- Expression compilation, both output formats, escaping
- `functions.test.ts` -- All Tier 1 function constructors return correct AST shapes
- `clauses.test.ts` -- Clause construction, Clauses bag composition
- `builder.test.ts` -- Fluent API, immutability, full query compilation
- `ast-contract.test.ts` -- AST shape stability for cross-package consumers

### Key Test Scenarios

- Immutability: branching queries produce independent results
- String escaping: single quotes, special characters
- Column quoting: spaces trigger backtick quoting, system columns (`:id`) pass through
- Boolean parenthesization: AND/OR sub-expressions wrapped correctly
- WHERE accumulation: multiple `.where()` calls AND-fold
- CASE/WHEN: multi-branch case expressions compile correctly
- IN/NOT IN: list values compile to parenthesized comma-separated format
- BETWEEN: three-operand syntax compiles correctly
- Empty queries: graceful handling of no clauses

---

## Future Enhancements

### Phase 2: Tier 2 Functions (date/time, geospatial)

- Date functions: `date_trunc_y`, `date_trunc_ym`, `date_extract_y`, etc.
- Geospatial: `within_circle`, `within_box`, `within_polygon`, `intersects`,
  `distance_in_meters`
- Conversion: `to_number`, `to_fixed_timestamp`, `to_floating_timestamp`

### Phase 3: Advanced Features

- AST visitor/transformer utilities for query analysis
- Schema-aware type parameter (generic `SoQLBuilder<T>`) for compile-time column checking
- Effect Schema integration for runtime validation
- Query optimization passes (e.g., redundant WHERE elimination)

### Potential Refactoring

- Operator type narrowing: Replace `op: string` with a string literal union for
  compile-time operator validation
- Expression node extensibility: Consider a registry pattern if Tier 2/3 adds
  many new node types

---

## Related Documentation

**Design Spec:**

- `docs/superpowers/specs/2026-04-03-soql-phase1-design.md` -- Phase 1 design spec

**Implementation Plan:**

- `docs/superpowers/plans/2026-04-03-soql-phase1.md` -- TDD implementation plan

**Package Documentation:**

- `packages/soql/README.md` -- Package overview

---

**Document Status:** Current -- documents the complete Phase 1 implementation as built
on the feat/phase-1 branch.

**Next Steps:** Update when Tier 2/3 functions are added or when schema-aware typing
is implemented.
