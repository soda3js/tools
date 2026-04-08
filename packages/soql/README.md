# @soda3js/soql

Type-safe, zero-dependency SoQL query builder for the [Socrata Open Data API](https://dev.socrata.com/).

Build SoQL queries with an immutable fluent API, then compile to either URL query parameters (SODA2) or POST body SQL (SODA3).

## Install

```bash
npm install @soda3js/soql
```

## Quick Start

```typescript
import { SoQL } from "@soda3js/soql";

const query = SoQL.query()
  .select("title", "release_year", "locations")
  .where(SoQL.gte("release_year", 2020))
  .orderBy("release_year", "DESC")
  .limit(10);

// SODA2 URL params
query.toParams();
// "$select=title,release_year,locations&$where=release_year >= 2020&$order=release_year DESC&$limit=10"

// SODA3 POST body SQL
query.toBody();
// "SELECT title, release_year, locations WHERE release_year >= 2020 ORDER BY release_year DESC LIMIT 10"
```

## Builder API

Every method returns a new `SoQLBuilder` instance. Builders are immutable and safe to branch.

```typescript
import { SoQL } from "@soda3js/soql";

const base = SoQL.query()
  .select("title", "release_year", "locations")
  .where(SoQL.gte("release_year", 2000));

// Branch into two queries from the same base
const recent = base.orderBy("release_year", "DESC").limit(5);
const oldest = base.orderBy("release_year", "ASC").limit(5);
```

### select / selectDistinct

```typescript
SoQL.query().select("title", "release_year");
SoQL.query().selectDistinct("locations");
```

### where

Multiple `.where()` calls are AND-folded together.

```typescript
SoQL.query()
  .where(SoQL.gte("release_year", 2010))
  .where(SoQL.like("title", "%Park%"));
```

### orderBy

Multiple `.orderBy()` calls append to the ORDER BY list.

```typescript
SoQL.query()
  .orderBy("release_year", "DESC")
  .orderBy("title", "ASC");
```

### groupBy / having

```typescript
SoQL.query()
  .select("locations", SoQL.alias(SoQL.count("*"), "film_count"))
  .groupBy("locations")
  .having(SoQL.gt(SoQL.count("*"), 5))
  .orderBy("film_count", "DESC");
```

### limit / offset

```typescript
SoQL.query().limit(25).offset(50);
```

### q (full-text search)

The `$q` parameter is included in URL params output only (omitted from POST body, as it is SODA2-only).

```typescript
SoQL.query().q("golden gate");
```

## Comparison Functions

```typescript
SoQL.eq("title", "Vertigo");
SoQL.neq("release_year", 2000);
SoQL.gt("release_year", 2010);
SoQL.gte("release_year", 2010);
SoQL.lt("release_year", 1980);
SoQL.lte("release_year", 1980);
SoQL.between("release_year", 2000, 2020);
SoQL.notBetween("release_year", 2000, 2020);
SoQL.isNull("locations");
SoQL.isNotNull("locations");
SoQL.like("title", "%Bridge%");
SoQL.notLike("title", "%Test%");
SoQL.startsWith("title", "The");
SoQL.in("release_year", [2018, 2019, 2020]);
SoQL.notIn("release_year", [2018, 2019, 2020]);
```

## Boolean Combinators

```typescript
SoQL.and(SoQL.gte("release_year", 2010), SoQL.isNotNull("locations"));
SoQL.or(SoQL.eq("title", "Vertigo"), SoQL.eq("title", "Bullitt"));
SoQL.not(SoQL.eq("release_year", 2000));
```

## Aggregate Functions

```typescript
SoQL.count("*");
SoQL.count("locations");
SoQL.sum("release_year");
SoQL.avg("release_year");
SoQL.min("release_year");
SoQL.max("release_year");
SoQL.median("release_year");
```

## String Functions

```typescript
SoQL.upper("title");
SoQL.lower("title");
SoQL.concat("title", SoQL.raw("' ('"), "locations", SoQL.raw("')'"));
```

## Arithmetic

```typescript
SoQL.add("release_year", 1);
SoQL.sub("release_year", 2000);
SoQL.mul("release_year", 2);
SoQL.div("release_year", 10);
```

## Geospatial Functions

```typescript
SoQL.withinCircle("location", 37.78, -122.42, 1000);
SoQL.withinBox("location", 37.80, -122.50, 37.70, -122.35);
SoQL.distanceInMeters("location", SoQL.raw("'POINT(-122.42 37.78)'"));
```

## Date/Time Functions

### Extract

```typescript
SoQL.dateExtractY("created_date");   // year
SoQL.dateExtractM("created_date");   // month
SoQL.dateExtractD("created_date");   // day
SoQL.dateExtractHH("created_date");  // hour
SoQL.dateExtractMM("created_date");  // minute
SoQL.dateExtractSS("created_date");  // second
SoQL.dateExtractDow("created_date"); // day of week
SoQL.dateExtractWoy("created_date"); // week of year
```

### Truncate

```typescript
SoQL.dateTruncY("created_date");   // truncate to year
SoQL.dateTruncYM("created_date");  // truncate to month
SoQL.dateTruncYMD("created_date"); // truncate to day
```

## Type Casting

```typescript
SoQL.toNumber("release_year"); // to_number(release_year)
SoQL.toText("zip_code");       // to_text(zip_code)
```

## Additional String Functions

```typescript
SoQL.contains("title", "Bridge"); // contains(title, 'Bridge')
SoQL.length("title");             // length(title)
```

## Raw Expressions

Use `SoQL.raw()` for any SoQL that the builder does not cover directly.

```typescript
// count(DISTINCT ...)
SoQL.query()
  .select(SoQL.raw("count(DISTINCT locations) as unique_locations"));
```

## Aliases

```typescript
SoQL.query().select(
  "title",
  SoQL.alias(SoQL.count("*"), "total"),
);
```

## Case Expressions

```typescript
SoQL.query().select(
  "title",
  SoQL.alias(
    SoQL.case(
      [
        { when: SoQL.lt("release_year", 1980), result: SoQL.raw("'Classic'") },
        { when: SoQL.lt("release_year", 2000), result: SoQL.raw("'Modern'") },
      ],
      SoQL.raw("'Contemporary'"),
    ),
    "era",
  ),
);
```

## Output Formats

### toParams()

Compiles to URL query parameter string for SODA2 `GET` requests.

```typescript
const params = SoQL.query()
  .select("title")
  .where(SoQL.gte("release_year", 2020))
  .toParams();

const url = `https://data.sfgov.org/resource/yitu-d5am.json?${params}`;
```

### toBody()

Compiles to SQL string for SODA3 `POST` requests.

```typescript
const sql = SoQL.query()
  .select("title")
  .where(SoQL.gte("release_year", 2020))
  .toBody();
```

## License

[MIT](./LICENSE)
