---
status: current
module: mcp
category: architecture
created: 2026-04-07
updated: 2026-04-07
last-synced: 2026-04-07
completeness: 85
related:
  - ../client/architecture.md
  - ../config/architecture.md
  - ../soql/architecture.md
dependencies: []
---

# @soda3js/mcp - Architecture

MCP (Model Context Protocol) server for AI agent dataset discovery and
querying via the Socrata SODA3 API. Published as the `soda3-mcp` binary.

## Table of Contents

1. [Overview](#overview)
2. [Current State](#current-state)
3. [Rationale](#rationale)
4. [System Architecture](#system-architecture)
5. [Tools](#tools)
6. [Resources](#resources)
7. [Effect Integration](#effect-integration)
8. [Configuration](#configuration)
9. [Dependency Model](#dependency-model)
10. [Testing Strategy](#testing-strategy)
11. [Future Work](#future-work)

---

## Overview

`@soda3js/mcp` is an MCP server that exposes Socrata open data portals to
AI agents (Claude, GPT, etc.) through the Model Context Protocol. It
provides 8 tools for dataset discovery, metadata inspection, querying,
and column summarization, plus 3 resources for configuration, schema, and
metadata access.

The server uses the `@modelcontextprotocol/sdk` for MCP protocol handling,
`@soda3js/client` for all Socrata API operations, `@soda3js/soql` for
query building, and `@soda3js/config` for shared configuration loading.
It runs as a stdio-based MCP server process.

Single `"."` export plus a `bin` entry (`soda3-mcp`).

---

## Current State

The package is fully implemented with 15 source files:

```text
packages/mcp/src/
  index.ts                    Entry point (bin: soda3-mcp, stdio transport)
  server.ts                   McpServer factory with tool and resource registration
  layers/
    CatalogServiceLive.ts     Live catalog service (search, list domains)
    McpLive.ts                Composed Layer (SodaClient + CatalogService + QueryService)
    QueryServiceLive.ts       Live query service (metadata, preview, query, summarize)
  lib/
    config.ts                 McpConfig loader (env vars + Soda3Config)
    format.ts                 Markdown table and metadata formatters
  resources/
    config.ts                 config:// resource (current MCP config)
    metadata.ts               metadata://{domain}/{datasetId} resource
    schema.ts                 schema://{domain}/{datasetId} resource
  services/
    CatalogService.ts         Effect Context.Tag for catalog operations
    QueryService.ts           Effect Context.Tag for query operations
  tools/
    get-columns.ts            Get column names and types for a dataset
    get-metadata.ts           Get dataset metadata (name, description, updated)
    help.ts                   List available tools and usage guidance
    list-domains.ts           List configured portal domains
    preview-dataset.ts        Preview first N rows of a dataset
    query-dataset.ts          Execute a SoQL query against a dataset
    search-datasets.ts        Search the Socrata discovery API
    summarize-column.ts       Statistical summary of a column
```

---

## Rationale

### Why an MCP Server

AI agents need structured access to open data portals for data analysis
tasks. MCP provides a standardized protocol for tool invocation that works
with Claude Desktop, VS Code Copilot, and other MCP-compatible clients.
An MCP server is the natural integration point for making the soda3js
toolkit available to AI agents.

### Why Effect ManagedRuntime

The MCP SDK uses a callback-based registration model (register tool, get
called with arguments). Each tool handler needs access to the SodaClient
service. Rather than creating a new Effect runtime per tool call, a
`ManagedRuntime` is created once at server startup with all services
pre-wired. Tool handlers call `runtime.runPromise()` to execute Effect
programs within the shared runtime.

### Why Separate CatalogService and QueryService

The two services map to distinct API concerns:

- **CatalogService** -- operates on the Socrata Discovery API
  (`api.us.socrata.com/api/catalog/v1`), which is cross-domain and does
  not require a dataset ID
- **QueryService** -- operates on individual datasets via domain-specific
  SODA endpoints, requiring both domain and dataset ID

Separating them keeps the service interfaces focused and allows independent
testing.

### Why Zod for Tool Schemas

The MCP SDK uses Zod for tool input schema validation (it generates JSON
Schema from Zod types for the tool manifest). While the rest of the
monorepo uses Effect Schema, the MCP SDK's tight Zod coupling makes it
pragmatic to use Zod at the MCP boundary while keeping Effect Schema for
internal data models.

---

## System Architecture

```text
stdio transport
  |
  v
McpServer (MCP SDK)
  |
  +-- Tools (8)
  |     |
  |     +-- runtime.runPromise(Effect.gen(...))
  |           |
  |           +-- CatalogService (search, listDomains)
  |           +-- QueryService (getMetadata, preview, query, summarizeColumn)
  |
  +-- Resources (3)
        |
        +-- config:// (McpConfig)
        +-- schema://{domain}/{datasetId}
        +-- metadata://{domain}/{datasetId}

McpLive (Layer composition)
  |
  +-- CatalogServiceLive (depends on SodaClient)
  +-- QueryServiceLive (depends on SodaClient)
  +-- SodaClientLive (depends on HttpClient)
  +-- NodeHttpClient.layerUndici
```

---

## Tools

### search-datasets

Search the Socrata catalog for datasets by keyword, domain, category, or
tags. Calls `CatalogService.search()` which delegates to the client's
`discover()` method. Returns results formatted as a Markdown table.

### get-metadata

Fetch full metadata for a specific dataset. Calls
`QueryService.getMetadata()`. Returns formatted metadata including name,
description, columns, and last update timestamp.

### get-columns

Get column names and data types for a dataset. Calls
`QueryService.getMetadata()` and extracts the column information.
Returns a compact table of field names and types.

### preview-dataset

Preview the first N rows of a dataset (default 5). Calls
`QueryService.preview()` which executes a `SELECT * LIMIT n` query.
Returns results as a Markdown table.

### query-dataset

Execute a SoQL query with structured parameters (select, where, groupBy,
orderBy, limit, offset). Calls `QueryService.query()` which builds a
SoQL query from the parameters and executes it. Returns results as a
Markdown table.

### summarize-column

Generate statistical summary of a column including null count, distinct
count, top values, and optional min/max/avg for numeric columns. Calls
`QueryService.summarizeColumn()` which executes multiple aggregate queries.

### list-domains

List all configured portal domains from the TOML config profiles. Returns
the domain list as text.

### help

Static tool that returns usage guidance and a list of all available tools
with descriptions.

---

## Resources

### config://

Returns the current MCP configuration as JSON, including configured
profiles and defaults.

### schema://{domain}/{datasetId}

Returns the column schema for a dataset as JSON. Calls
`QueryService.getMetadata()` and extracts column definitions.

### metadata://{domain}/{datasetId}

Returns full dataset metadata as JSON. Calls
`QueryService.getMetadata()` and serializes the result.

---

## Effect Integration

### ManagedRuntime

The server creates a `ManagedRuntime` at startup:

```text
ManagedRuntime.make(McpLive(config))
```

This runtime provides both `CatalogService` and `QueryService`. Each
tool handler runs Effects within this shared runtime via
`runtime.runPromise()`.

### Layer Composition (McpLive)

`McpLive(config)` composes:

1. `SodaClientLive(sodaConfig)` with `NodeHttpClient.layerUndici`
2. `CatalogServiceLive` -- wraps `SodaClient.discover()`
3. `QueryServiceLive` -- wraps `SodaClient.query()`, `.metadata()`

The config's `appToken` (from `SOCRATA_APP_TOKEN` env var) is passed
through to `SodaClientConfig` for SODA3 mode activation.

---

## Configuration

`lib/config.ts` loads configuration from two sources:

1. **Environment variables:**
   - `SOCRATA_APP_TOKEN` -- Socrata app token for SODA3 mode
   - `SODA3_CACHE_PATH` -- custom cache directory (falls back to
     `Soda3Config.cacheDir()`)
   - `SODA3_LOG_LEVEL` -- log level (default: `"info"`)

2. **TOML config file** (via `Soda3Config.loadSync()`):
   - Profiles with domain/token pairs
   - Default profile for default domain resolution

The `McpConfig` interface combines both sources into a single config
object passed to `McpLive()`.

---

## Dependency Model

| Dependency | Type | Purpose |
| --- | --- | --- |
| `@modelcontextprotocol/sdk` | fixed | MCP protocol server and transport |
| `@soda3js/client` | workspace | SodaClient service for all API operations |
| `@soda3js/soql` | workspace | SoQL query building in QueryService |
| `@soda3js/config` | workspace | Shared config loading and XDG paths |
| `effect` | fixed | Effect runtime for service composition |
| `@effect/platform` | fixed | HttpClient abstractions |
| `@effect/platform-node` | fixed | Node.js HTTP client layer |
| `zod` | fixed | Tool input schema validation (MCP SDK requirement) |

---

## Testing Strategy

- **Tool handlers:** Unit tests with mock `ManagedRuntime` providing
  stubbed CatalogService/QueryService
- **Format utilities:** Unit tests for Markdown table generation and
  metadata formatting
- **Config loading:** Unit tests with mocked environment variables and
  temporary TOML files
- **Integration:** End-to-end tests with the replay server exercising
  the full MCP tool flow

---

## Future Work

- Add tool for dataset export (CSV/JSON download)
- Add caching support (pass `CacheStore` through to `SodaClientConfig`)
- Add pagination support for search results (next page tool)
- Add resource templates for common query patterns
- Consider streaming responses for large query results
- Add authentication guidance resource for SODA3 mode setup

---

**Document Status:** Current -- reflects initial implementation on
`feat/wrap-up` branch.

**Next Update:** When caching support or additional tools are added.
