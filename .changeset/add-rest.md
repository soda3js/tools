---
"@soda3js/rest": minor
---

## Features

### Adds @soda3js/rest Package

Add batteries-included REST client for the Socrata SODA3 API. Soda3Client class with Promise-based query, metadata, queryAll, and export_ methods. Three subpath exports: @soda3js/rest/node (undici), @soda3js/rest/bun (fetch), @soda3js/rest/browser (fetch). All Effect dependencies bundled as fixed deps so npm install just works. queryAll streams lazily via Stream.toAsyncIterable; export_ streams bytes via ReadableStream without buffering.
