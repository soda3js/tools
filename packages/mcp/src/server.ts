import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ManagedRuntime } from "effect";
import { McpLive } from "./layers/McpLive.js";
import type { McpConfig } from "./lib/config.js";
import { registerConfigResource } from "./resources/config.js";
import { registerMetadataResource } from "./resources/metadata.js";
import { registerSchemaResource } from "./resources/schema.js";
import type { CatalogService } from "./services/CatalogService.js";
import type { QueryService } from "./services/QueryService.js";
import { registerGetColumns } from "./tools/get-columns.js";
import { registerGetMetadata } from "./tools/get-metadata.js";
import { registerHelp } from "./tools/help.js";
import { registerListDomains } from "./tools/list-domains.js";
import { registerPreviewDataset } from "./tools/preview-dataset.js";
import { registerQueryDataset } from "./tools/query-dataset.js";
import { registerSearchDatasets } from "./tools/search-datasets.js";
import { registerSummarizeColumn } from "./tools/summarize-column.js";

export function createServer(config: McpConfig): McpServer {
	const server = new McpServer({
		name: "soda3-mcp",
		version: "0.1.0",
	});

	const runtime: ManagedRuntime.ManagedRuntime<CatalogService | QueryService, never> = ManagedRuntime.make(
		McpLive(config),
	) as ManagedRuntime.ManagedRuntime<CatalogService | QueryService, never>;

	// Register tools
	registerSearchDatasets(server, runtime);
	registerGetMetadata(server, runtime);
	registerGetColumns(server, runtime);
	registerPreviewDataset(server, runtime);
	registerQueryDataset(server, runtime);
	registerSummarizeColumn(server, runtime);
	registerListDomains(server, runtime);
	registerHelp(server);

	// Register resources
	registerConfigResource(server, config);
	registerSchemaResource(server, runtime);
	registerMetadataResource(server, runtime);

	return server;
}
