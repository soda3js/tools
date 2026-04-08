# @soda3js/protocol

Plain TypeScript interfaces and runtime type guards for [Socrata SODA API](https://dev.socrata.com/) wire formats. Zero dependencies.

## Install

```bash
npm install @soda3js/protocol
```

## Interfaces

### DatasetMetadataShape

Shape of the dataset metadata response from `GET /api/views/:id.json`.

```typescript
import type { DatasetMetadataShape } from "@soda3js/protocol";

const meta: DatasetMetadataShape = {
  id: "yitu-d5am",
  name: "Film Locations in San Francisco",
  description: "Locations used for filming in San Francisco",
  category: "Culture and Recreation",
  columns: [
    { id: 1, fieldName: "title", dataTypeName: "text", renderTypeName: "text", position: 1 },
    { id: 2, fieldName: "release_year", dataTypeName: "number", renderTypeName: "number", position: 2 },
  ],
  owner: { id: "abc-123", displayName: "DataSF" },
  rowsUpdatedAt: 1700000000,
  viewLastModified: 1700000000,
};
```

### ColumnShape

Shape of a column descriptor within dataset metadata.

```typescript
import type { ColumnShape } from "@soda3js/protocol";
```

Fields: `id`, `fieldName`, `dataTypeName`, `description?`, `renderTypeName`, `position`.

### OwnerShape

Shape of the dataset owner.

```typescript
import type { OwnerShape } from "@soda3js/protocol";
```

Fields: `id`, `displayName`.

### SodaErrorResponseShape

Shape of all SODA API error responses.

```typescript
import type { SodaErrorResponseShape } from "@soda3js/protocol";
```

Fields: `code`, `error` (always `true`), `message`, `data?`.

### CacheStore

Async key-value store interface for cached SODA API responses. Implemented by `MemoryCache`, `FileSystemCache`, `SqliteCache`, or any custom backend.

```typescript
import type { CacheStore } from "@soda3js/protocol";
```

Methods: `get(key)`, `set(key, entry)`, `has(key)`, `invalidate(key)`, `prune(options?)`.

### CacheEntry

A cached API response with metadata for invalidation and cleanup.

```typescript
import type { CacheEntry } from "@soda3js/protocol";
```

Fields: `body`, `contentType`, `headers`, `created`, `datasetId`, `domain`, `rowsUpdatedAt`, `sizeBytes`, `ttl`, `cleanable`, `query?`.

### CacheKeyInput

Input fields for building a deterministic cache key.

```typescript
import type { CacheKeyInput } from "@soda3js/protocol";
```

Fields: `domain`, `datasetId`, `query`, `format?`, `rowsUpdatedAt?`.

### DatasetFreshness

Tracks when a dataset's metadata was last checked for freshness.

```typescript
import type { DatasetFreshness } from "@soda3js/protocol";
```

Fields: `domain`, `datasetId`, `rowsUpdatedAt`, `lastChecked`, `ttl`.

### PruneOptions / PruneResult

Options and results for cache prune operations.

```typescript
import type { PruneOptions, PruneResult } from "@soda3js/protocol";
```

## Type Guards

Runtime type guards for structural validation of raw JSON responses.

```typescript
import {
  isDatasetMetadataShape,
  isColumnShape,
  isOwnerShape,
  isSodaErrorResponseShape,
} from "@soda3js/protocol";

const response = await fetch("https://data.sfgov.org/api/views/yitu-d5am.json");
const data = await response.json();

if (isSodaErrorResponseShape(data)) {
  console.error(`API error: ${data.message}`);
} else if (isDatasetMetadataShape(data)) {
  console.log(`Dataset: ${data.name} (${data.columns.length} columns)`);
}
```

## License

[MIT](./LICENSE)
