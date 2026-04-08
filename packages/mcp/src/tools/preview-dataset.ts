import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ManagedRuntime } from "effect";
import { z } from "zod";
import { formatTable } from "../lib/format.js";
import type { CatalogService } from "../services/CatalogService.js";
import type { QueryService } from "../services/QueryService.js";

export function registerPreviewDataset(
	server: McpServer,
	runtime: ManagedRuntime.ManagedRuntime<CatalogService | QueryService, never>,
): void {
	server.registerTool(
		"preview_dataset",
		{
			description: "Preview the first rows of a dataset. Returns a markdown table of the data with all columns.",
			inputSchema: {
				domain: z.string().describe("Socrata domain (e.g. data.cityofnewyork.us)"),
				dataset_id: z.string().describe("Dataset identifier (e.g. abcd-1234)"),
				limit: z
					.optional(z.number().min(1).max(50).default(10))
					.describe("Number of rows to preview (1-50, default 10)"),
			},
		},
		async (args) => {
			const { QueryService } = await import("../services/QueryService.js");
			const { Effect } = await import("effect");

			const rows = await runtime.runPromise(
				Effect.gen(function* () {
					const query = yield* QueryService;
					return yield* query.preview(args.domain, args.dataset_id, Math.min(args.limit ?? 10, 50));
				}),
			);

			return {
				content: [
					{
						type: "text" as const,
						text: formatTable(rows as ReadonlyArray<Record<string, unknown>>),
					},
				],
			};
		},
	);
}
