# @soda3js/soql

[![npm version](https://img.shields.io/npm/v/@soda3js/soql)](https://www.npmjs.com/package/@soda3js/soql)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Type-safe SoQL query builder for the Socrata SODA3 API. Pure TypeScript with
zero runtime dependencies.

## Features

- Fluent, immutable builder API for composing SoQL queries
- Full SoQL clause support: SELECT, WHERE, ORDER BY, GROUP BY, HAVING, LIMIT, OFFSET
- 30+ built-in functions: comparison, aggregation, string, arithmetic, CASE
- Dual output: URL query parameters (SODA2) and POST body SQL (SODA3)
- Tree-shakeable function exports for minimal bundle size

## Installation

```bash
npm install @soda3js/soql
```

## Quick Start

```typescript
import { SoQL } from "@soda3js/soql";

const query = SoQL.query()
  .select("complaint_type", "borough")
  .where(SoQL.eq("borough", "BROOKLYN"))
  .orderBy("complaint_type")
  .limit(10);

// SODA2 URL params
const url = `https://data.cityofnewyork.us/resource/erm2-nwe9.json?${query.toParams()}`;

// SODA3 POST body
const sql = query.toBody();
// SELECT `complaint_type`, `borough` WHERE `borough` = 'BROOKLYN' ORDER BY `complaint_type` ASC LIMIT 10
```

## Documentation

For API reference, function catalog, and advanced usage, see [docs/](./docs/).

## License

MIT
