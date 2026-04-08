import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ManagedRuntime } from "effect";
import { z } from "zod";
import type { CatalogService } from "../services/CatalogService.js";
import type { QueryService } from "../services/QueryService.js";

export function registerSummarizeColumn(
	server: McpServer,
	runtime: ManagedRuntime.ManagedRuntime<CatalogService | QueryService, never>,
): void {
	server.registerTool(
		"summarize_column",
		{
			description:
				"Get statistical summary of a column: total count, distinct values, null count, min/max, and top N most frequent values.",
			inputSchema: {
				domain: z.string().describe("Socrata domain (e.g. data.cityofnewyork.us)"),
				dataset_id: z.string().describe("Dataset identifier (e.g. abcd-1234)"),
				column: z.string().describe("Column field name to summarize"),
				top_n: z
					.optional(z.number().min(1).max(50).default(10))
					.describe("Number of top values to return (1-50, default 10)"),
			},
		},
		async (args) => {
			const { QueryService } = await import("../services/QueryService.js");
			const { Effect } = await import("effect");

			const summary = await runtime.runPromise(
				Effect.gen(function* () {
					const query = yield* QueryService;
					return yield* query.summarizeColumn(
						args.domain,
						args.dataset_id,
						args.column,
						Math.min(args.top_n ?? 10, 50),
					);
				}),
			);

			const lines: string[] = [];
			lines.push(`Column: ${summary.fieldName}`);
			lines.push(`Total rows: ${summary.totalCount}`);
			lines.push(`Distinct values: ${summary.distinctCount}`);
			lines.push(`Null count: ${summary.nullCount}`);
			if (summary.min) lines.push(`Min: ${summary.min}`);
			if (summary.max) lines.push(`Max: ${summary.max}`);
			if (summary.avg !== undefined) lines.push(`Avg: ${summary.avg}`);

			if (summary.topValues.length > 0) {
				lines.push("");
				lines.push("Top values:");
				for (const tv of summary.topValues) {
					lines.push(`  ${tv.value}: ${tv.count}`);
				}
			}

			return { content: [{ type: "text" as const, text: lines.join("\n") }] };
		},
	);
}
