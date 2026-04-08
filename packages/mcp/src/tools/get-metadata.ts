import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ManagedRuntime } from "effect";
import { z } from "zod";
import type { CatalogService } from "../services/CatalogService.js";
import type { QueryService } from "../services/QueryService.js";

export function registerGetMetadata(
	server: McpServer,
	runtime: ManagedRuntime.ManagedRuntime<CatalogService | QueryService, never>,
): void {
	server.registerTool(
		"get_metadata",
		{
			description:
				"Get full metadata for a dataset including name, description, owner, column count, row update timestamp, and tags.",
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

			const lines: string[] = [];
			lines.push(`Name: ${meta.name}`);
			lines.push(`ID: ${meta.id}`);
			if (meta.description) lines.push(`Description: ${meta.description}`);
			if (meta.category) lines.push(`Category: ${meta.category}`);
			lines.push(`Columns: ${meta.columns.length}`);
			lines.push(`Owner: ${meta.owner.displayName}`);
			lines.push(`Last updated: ${new Date(meta.rowsUpdatedAt * 1000).toISOString()}`);
			if (meta.tags && meta.tags.length > 0) lines.push(`Tags: ${meta.tags.join(", ")}`);

			return { content: [{ type: "text" as const, text: lines.join("\n") }] };
		},
	);
}
