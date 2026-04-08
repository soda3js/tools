---
"@soda3js/mcp": minor
---

## Features

### MCP Server for AI Agents

New `@soda3js/mcp` package providing a Model Context Protocol server with eight tools for AI agent dataset discovery and querying.

- `search_datasets` for catalog search with domain/category filters
- `get_metadata` for full dataset metadata
- `get_columns` for column schema listing
- `preview_dataset` for first N rows
- `query_dataset` for full SoQL query support
- `summarize_column` for statistical column analysis
- `list_domains` for discovered domains in session
- `help` reference card

Three MCP resources: `socrata://config`, `socrata://{domain}/{datasetId}/schema`, `socrata://{domain}/{datasetId}/metadata`.

Built on Effect service layer with ManagedRuntime bridge. Reads shared TOML config from CLI.
