# @soda3js/mcp

MCP (Model Context Protocol) server for AI agent dataset discovery and
querying via the Socrata SODA3 API. Binary: `soda3-mcp`. Runs over
stdio transport.

## Architecture

- `index.ts` -- Entry point (shebang). Loads config, creates server,
  connects stdio transport.
- `server.ts` -- `createServer(config)` factory. Registers 8 tools and
  3 resources on an `McpServer` instance. Creates an Effect
  `ManagedRuntime` from `McpLive` layer.
- `services/` -- Effect service tags:
  - `CatalogService` -- dataset search and metadata via Discovery API
  - `QueryService` -- dataset querying via SoQL
- `layers/` -- Effect layer implementations:
  - `McpLive` -- composes CatalogService + QueryService from config
  - `CatalogServiceLive` -- wires Discovery API endpoints
  - `QueryServiceLive` -- wires query endpoints
- `tools/` -- 8 MCP tools (Zod input schemas):
  - `search-datasets` -- search via Discovery API
  - `get-metadata` -- dataset metadata
  - `get-columns` -- column definitions for a dataset
  - `preview-dataset` -- preview first N rows
  - `query-dataset` -- SoQL query execution
  - `summarize-column` -- column statistics
  - `list-domains` -- list configured domains/profiles
  - `help` -- usage guidance for AI agents
- `resources/` -- 3 MCP resources:
  - `config` -- exposes current server configuration
  - `metadata` -- dataset metadata as a resource
  - `schema` -- dataset schema as a resource
- `lib/config.ts` -- `McpConfig` type and `loadConfig()` factory.
  Uses `@soda3js/config` (`Soda3Config.loadSync()`) for profile and
  XDG directory resolution.
- `lib/format.ts` -- output formatting helpers

## Dependencies

Runtime: `@modelcontextprotocol/sdk`, `@soda3js/client`, `@soda3js/config`,
`@soda3js/soql`, `effect`, `@effect/platform`, `@effect/platform-node`, `zod`.

## Key Patterns

- **MCP SDK + Effect hybrid:** Tool handlers bridge MCP SDK (Zod schemas)
  to Effect services via `ManagedRuntime.runPromise`
- **Config from `@soda3js/config`:** Loads TOML profiles for multi-domain
  support; respects `SOCRATA_APP_TOKEN` env var as fallback
- **Stateless tools:** Each tool call is independent; no session state
  between invocations
- **Discovery-first:** `search-datasets` and `list-domains` help agents
  find datasets before querying

## Environment Variables

- `SOCRATA_APP_TOKEN` -- Socrata app token (overridden by profile tokens)
- `SODA3_CACHE_PATH` -- override cache directory (default: XDG cache dir)
- `SODA3_LOG_LEVEL` -- log level (default: `info`)

## Testing

Tests in `__test__/`. Run: `pnpm test` from repo root.
