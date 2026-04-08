# @soda3js/mcp

MCP (Model Context Protocol) server that gives AI agents access to Socrata open data portals. Provides tools for dataset discovery, metadata inspection, querying, and column analysis.

## Setup

### Claude Desktop

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "soda3": {
      "command": "npx",
      "args": ["@soda3js/mcp"],
      "env": {
        "SOCRATA_APP_TOKEN": "your-token-here"
      }
    }
  }
}
```

### Environment Variables

| Variable | Description | Default |
| --- | --- | --- |
| `SOCRATA_APP_TOKEN` | Socrata app token for higher rate limits | None |
| `SODA3_CACHE_PATH` | Cache directory path | `~/.cache/soda3js` |
| `SODA3_LOG_LEVEL` | Log level (debug, info, warn, error) | `info` |

The server also reads `~/.config/soda3js/config.toml` if present (shared with `@soda3js/cli`).

## Available Tools

| Tool | Description | Required Params |
| --- | --- | --- |
| `search_datasets` | Search the Socrata open data catalog | `q` |
| `get_metadata` | Get full metadata for a dataset | `domain`, `dataset_id` |
| `get_columns` | List columns with types and descriptions | `domain`, `dataset_id` |
| `preview_dataset` | Preview the first rows of a dataset | `domain`, `dataset_id` |
| `query_dataset` | Execute a SoQL query | `domain`, `dataset_id` |
| `summarize_column` | Statistical summary of a column | `domain`, `dataset_id`, `column` |
| `list_domains` | List discovered domains in session | None |
| `help` | Show tool reference card | None |

## Example Agent Workflow

A typical AI agent session:

1. **Discover** — `search_datasets` with keywords to find relevant datasets
2. **Inspect** — `get_columns` to understand the schema
3. **Preview** — `preview_dataset` to see sample data
4. **Query** — `query_dataset` with SoQL filters, aggregations, and sorting
5. **Analyze** — `summarize_column` for statistical breakdowns

## Resources

The server exposes three MCP resources:

| URI | Description |
| --- | --- |
| `socrata://config` | Current server configuration |
| `socrata://{domain}/{datasetId}/schema` | Column schema for a dataset |
| `socrata://{domain}/{datasetId}/metadata` | Full dataset metadata |

## Architecture

The server bridges MCP SDK (Zod schemas) to Effect services via `ManagedRuntime`:

- `CatalogService` — dataset discovery and domain tracking
- `QueryService` — metadata, preview, query, and column analysis

All Socrata API calls go through `@soda3js/client`'s Effect service layer.

## License

[MIT](./LICENSE)
