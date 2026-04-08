import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ManagedRuntime } from "effect";
import type { CatalogService } from "../services/CatalogService.js";
import type { QueryService } from "../services/QueryService.js";

export function registerMetadataResource(
	server: McpServer,
	runtime: ManagedRuntime.ManagedRuntime<CatalogService | QueryService, never>,
): void {
	const template = new ResourceTemplate("socrata://{domain}/{datasetId}/metadata", { list: undefined });

	server.registerResource(
		"dataset_metadata",
		template,
		{ description: "Full metadata for a Socrata dataset" },
		async (uri, variables) => {
			const { QueryService } = await import("../services/QueryService.js");
			const { Effect } = await import("effect");

			const domain = String(variables.domain);
			const datasetId = String(variables.datasetId);

			const meta = await runtime.runPromise(
				Effect.gen(function* () {
					const query = yield* QueryService;
					return yield* query.getMetadata(domain, datasetId);
				}),
			);

			return {
				contents: [
					{
						uri: uri.href,
						mimeType: "application/json",
						text: JSON.stringify(meta, null, 2),
					},
				],
			};
		},
	);
}
