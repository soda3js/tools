import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ManagedRuntime } from "effect";
import { z } from "zod";
import { formatTable } from "../lib/format.js";
import type { CatalogService } from "../services/CatalogService.js";
import type { QueryService } from "../services/QueryService.js";

export function registerQueryDataset(
	server: McpServer,
	runtime: ManagedRuntime.ManagedRuntime<CatalogService | QueryService, never>,
): void {
	server.registerTool(
		"query_dataset",
		{
			description:
				"Execute a SoQL query against a dataset. Supports select, where, group_by, order_by, limit, and offset clauses.",
			inputSchema: {
				domain: z.string().describe("Socrata domain (e.g. data.cityofnewyork.us)"),
				dataset_id: z.string().describe("Dataset identifier (e.g. abcd-1234)"),
				select: z.optional(z.string()).describe("Comma-separated column list or aggregation expressions"),
				where: z.optional(z.string()).describe('SoQL WHERE clause (e.g. "magnitude > 3.0")'),
				group_by: z.optional(z.string()).describe("Comma-separated GROUP BY columns"),
				order_by: z
					.optional(z.string())
					.describe('Comma-separated ORDER BY columns with optional direction (e.g. "magnitude DESC")'),
				limit: z
					.optional(z.number().min(1).max(1000).default(25))
					.describe("Number of rows to return (1-1000, default 25)"),
				offset: z.optional(z.number().min(0)).describe("Number of rows to skip for pagination"),
			},
		},
		async (args) => {
			const { QueryService } = await import("../services/QueryService.js");
			const { Effect } = await import("effect");

			const queryParams: Parameters<QueryService["Type"]["query"]>[2] = {
				limit: Math.min(args.limit ?? 25, 1000),
				...(args.select ? { select: args.select } : {}),
				...(args.where ? { where: args.where } : {}),
				...(args.group_by ? { groupBy: args.group_by } : {}),
				...(args.order_by ? { orderBy: args.order_by } : {}),
				...(args.offset !== undefined ? { offset: args.offset } : {}),
			};

			const rows = await runtime.runPromise(
				Effect.gen(function* () {
					const query = yield* QueryService;
					return yield* query.query(args.domain, args.dataset_id, queryParams);
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
