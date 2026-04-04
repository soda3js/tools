# @soda3js/rest

## 0.1.0

### Features

* [`0f75a80`](https://github.com/soda3js/tools/commit/0f75a80c0a20d71521920325e75f6938b2303330) ### Adds @soda3js/rest Package

Add batteries-included REST client for the Socrata SODA3 API. Soda3Client class with Promise-based query, metadata, queryAll, and export\_ methods. Three subpath exports: @soda3js/rest/node (undici), @soda3js/rest/bun (fetch), @soda3js/rest/browser (fetch). All Effect dependencies bundled as fixed deps so npm install just works. queryAll streams lazily via Stream.toAsyncIterable; export\_ streams bytes via ReadableStream without buffering.

### Patch Changes

| Dependency      | Type       | Action  | From  | To    |
| --------------- | ---------- | ------- | ----- | ----- |
| @soda3js/client | dependency | updated | 0.0.0 | 0.1.0 |
| @soda3js/soql   | dependency | updated | 0.0.0 | 0.1.0 |
