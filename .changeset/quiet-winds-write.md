---
"@soda3js/soql": patch
"@soda3js/protocol": patch
"@soda3js/client": patch
"@soda3js/rest": patch
"@soda3js/cli": patch
"@soda3js/config": patch
"@soda3js/mcp": patch
"@soda3js/cache": patch
"@soda3js/cache-fs": patch
"@soda3js/cache-sqlite": patch
---

## Build System

- Added `apiModel.localPaths` to each package's `rslib.config.ts` so that API Extractor copies the generated `.api.json` model into `website/lib/models/<package>/` at build time, feeding the RSPress documentation site's auto-generated API reference pages
