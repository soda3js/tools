# @soda3js/soql

## 0.1.0

### Features

* [`e560c23`](https://github.com/soda3js/tools/commit/e560c239b182308e129b41600fb48ebbf43816cf) ### Adds @soda3js/soql Package

Initial release of `@soda3js/soql` — a type-safe, zero-dependency SoQL query builder for the Socrata SODA3 Open Data API.

### Fluent immutable builder

`SoQLBuilder` provides a chainable API where every method returns a new instance, making it safe to branch queries from a shared base:

```ts
import { SoQL } from "@soda3js/soql";

const base = SoQL.query()
  .select("ward", "category", SoQL.alias(SoQL.count("*"), "total"))
  .where(SoQL.eq("year", 2024))
  .groupBy("ward", "category");

const top10 = base.orderBy("total", "DESC").limit(10);
const paginated = base.limit(25).offset(50);
```

The `SoQL` static facade exposes the full function library so callers never need secondary imports for common queries.

### Dual-format compilation

A single query AST compiles to either output format via `.toParams()` or `.toBody()`:

```ts
const q = SoQL.query()
  .select("district", SoQL.alias(SoQL.sum("amount"), "total"))
  .where(SoQL.gt("amount", 0))
  .groupBy("district")
  .limit(100);

// SODA2 URL query string
q.toParams();
// "$select=district,sum(amount) AS total&$where=amount > 0&$group=district&$limit=100"

// SODA3 POST body SQL
q.toBody();
// "SELECT district, sum(amount) AS total WHERE amount > 0 GROUP BY district LIMIT 100"
```

Full-text search (`.q()`) is included in `.toParams()` as `$q=` and silently omitted from `.toBody()` — matching SODA API semantics.

### Tier 1 SoQL function library

All functions accept column name strings or `Expression` AST nodes interchangeably.

**Comparison** — `eq`, `neq`, `gt`, `gte`, `lt`, `lte`, `between`, `notBetween`, `isNull`, `isNotNull`, `like`, `notLike`, `startsWith`

**Set membership** — `inList`, `notIn`

**Boolean** — `and`, `or`, `not` (variadic; `and`/`or` fold their arguments left-to-right)

**Aggregate** — `count`, `sum`, `avg`, `min`, `max`

**String** — `upper`, `lower`, `concat` (variadic; folds with `||`)

**Arithmetic** — `add`, `sub`, `mul`, `div`

**Control flow** — `case_` with `{ when, result }` branch objects and a required `else` expression

Functions are available both as named exports for tree-shaking and as static properties on the `SoQL` facade (`SoQL.eq`, `SoQL.count`, etc.).

### Public discriminated-union AST

The seven AST node types are exported as stable public types for downstream consumers (such as `@soda3js/api`) that need to inspect or transform query trees:

| Type           | Description                                            |
| :------------- | :----------------------------------------------------- |
| `Column`       | A named column reference                               |
| `Literal`      | A scalar value (`string`, `number`, `boolean`, `null`) |
| `FunctionCall` | A named function with argument list                    |
| `BinaryOp`     | An infix operator expression                           |
| `UnaryOp`      | A prefix or postfix operator expression                |
| `Alias`        | An expression with an `AS name` label                  |
| `Raw`          | A pre-serialized SoQL string (escape hatch)            |

All nodes carry a `_tag` discriminant for exhaustive `switch` matching. Constructor functions (`column`, `literal`, `functionCall`, `binaryOp`, `unaryOp`, `alias`, `raw`) are also exported.

### SoQL type vocabulary

`SoQLDataType` enumerates all 21 column types returned by the SODA metadata endpoint. `SoQLTypeMap` maps each type to its JavaScript runtime shape for use in generic type parameters by higher-level packages.
