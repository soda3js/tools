# @soda3js/mcp

## 0.1.0

### Features

* ### MCP Server for AI Agents

  New `@soda3js/mcp` package providing a Model Context Protocol server with eight tools for AI agent dataset discovery and querying.

  * `search_datasets` for catalog search with domain/category filters
  * `get_metadata` for full dataset metadata
  * `get_columns` for column schema listing
  * `preview_dataset` for first N rows
  * `query_dataset` for full SoQL query support
  * `summarize_column` for statistical column analysis
  * `list_domains` for discovered domains in session
  * `help` reference card

  Three MCP resources: `socrata://config`, `socrata://{domain}/{datasetId}/schema`, `socrata://{domain}/{datasetId}/metadata`.

  Built on Effect service layer with ManagedRuntime bridge. Reads shared TOML config from CLI. [#56][#56]

### Build System

* Added `apiModel.localPaths` to each package's `rslib.config.ts` so that API Extractor copies the generated `.api.json` model into `website/lib/models/<package>/` at build time, feeding the RSPress documentation site's auto-generated API reference pages

### Dependencies

| Dependency      | Type       | Action  | From  | To    |
| --------------- | ---------- | ------- | ----- | ----- |
| @soda3js/client | dependency | updated | 0.0.0 | 0.1.0 |
| @soda3js/config | dependency | updated | 0.0.0 | 0.1.0 |
| @soda3js/soql   | dependency | updated | 0.0.0 | 0.1.0 |

### Patch Changes

Thanks to [@spencerbeggs](https://github.com/spencerbeggs) for their contributions!

[#56]: https://github.com/soda3js/tools/pull/56
