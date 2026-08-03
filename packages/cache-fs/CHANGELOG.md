# @soda3js/cache-fs

## 0.1.0

### Features

* ### Adds @soda3js/cache-fs Package

  Persistent filesystem cache using the XDG Base Directory spec with hierarchical domain/dataset storage.

  ### Hierarchical directory layout

  Cached responses are organized as `domain/dataset/queries/hash.json` with `.meta.json` sidecars containing the original SoQL query, timestamps, and size. Dataset-level `_freshness.json` and `_metadata.json` files track freshness lifecycle and column metadata. No centralized index file -- the filesystem structure is the index.

  ### Effect Layer integration

  `FileSystemCache` Effect Context.Tag with `FileSystemCacheLive` Layer. Platform entry points at `@soda3js/cache-fs/node` and `@soda3js/cache-fs/bun`. Defaults to XDG-compliant cache directory (`$XDG_CACHE_HOME/soda3js`). [#55][#55]

### Build System

* Added `apiModel.localPaths` to each package's `rslib.config.ts` so that API Extractor copies the generated `.api.json` model into `website/lib/models/<package>/` at build time, feeding the RSPress documentation site's auto-generated API reference pages

### Dependencies

| Dependency        | Type       | Action  | From  | To    |
| ----------------- | ---------- | ------- | ----- | ----- |
| @soda3js/config   | dependency | updated | 0.0.0 | 0.1.0 |
| @soda3js/protocol | dependency | updated | 0.0.0 | 0.1.0 |

### Patch Changes

Thanks to [@spencerbeggs](https://github.com/spencerbeggs) for their contributions!

[#55]: https://github.com/soda3js/tools/pull/55
