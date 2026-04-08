import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ManagedRuntime } from "effect";
import { z } from "zod";
import { formatTable } from "../lib/format.js";
import type { CatalogService } from "../services/CatalogService.js";
import type { QueryService } from "../services/QueryService.js";

export function registerGetColumns(
	server: McpServer,
	runtime: ManagedRuntime.ManagedRuntime<CatalogService | QueryService, never>,
): void {
	server.registerTool(
		"get_columns",
		{
			description: "List all columns in a dataset with their field names, data types, and descriptions.",
			inputSchema: {
				domain: z.string().describe("Socrata domain (e.g. data.cityofnewyork.us)"),
				dataset_id: z.string().describe("Dataset identifier (e.g. abcd-1234)"),
			},
		},
		async (args) => {
			const { QueryService } = await import("../services/QueryService.js");
			const { Effect } = await import("effect");

			const meta = await runtime.runPromise(
				Effect.gen(function* () {
					const query = yield* QueryService;
					return yield* query.getMetadata(args.domain, args.dataset_id);
				}),
			);

			const rows = meta.columns.map((c) => ({
				position: c.position,
				fieldName: c.fieldName,
				dataType: c.dataTypeName,
				description: c.description ?? "",
			}));

			return { content: [{ type: "text" as const, text: formatTable(rows) }] };
		},
	);
}
