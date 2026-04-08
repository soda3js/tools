import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ManagedRuntime } from "effect";
import type { CatalogService } from "../services/CatalogService.js";
import type { QueryService } from "../services/QueryService.js";

export function registerSchemaResource(
	server: McpServer,
	runtime: ManagedRuntime.ManagedRuntime<CatalogService | QueryService, never>,
): void {
	const template = new ResourceTemplate("socrata://{domain}/{datasetId}/schema", { list: undefined });

	server.registerResource(
		"dataset_schema",
		template,
		{ description: "Column schema for a Socrata dataset" },
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

			const schema = meta.columns.map((c) => ({
				fieldName: c.fieldName,
				dataType: c.dataTypeName,
				renderType: c.renderTypeName,
				description: c.description ?? "",
				position: c.position,
			}));

			return {
				contents: [
					{
						uri: uri.href,
						mimeType: "application/json",
						text: JSON.stringify(schema, null, 2),
					},
				],
			};
		},
	);
}
