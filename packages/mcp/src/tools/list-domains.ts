import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ManagedRuntime } from "effect";
import type { CatalogService } from "../services/CatalogService.js";
import type { QueryService } from "../services/QueryService.js";

export function registerListDomains(
	server: McpServer,
	runtime: ManagedRuntime.ManagedRuntime<CatalogService | QueryService, never>,
): void {
	server.registerTool(
		"list_domains",
		{
			description:
				"List all Socrata domains discovered during this session. Domains are added as you search for datasets.",
		},
		async () => {
			const { CatalogService } = await import("../services/CatalogService.js");
			const { Effect } = await import("effect");

			const domains = await runtime.runPromise(
				Effect.gen(function* () {
					const catalog = yield* CatalogService;
					return yield* catalog.listDomains();
				}),
			);

			if (domains.length === 0) {
				return {
					content: [
						{
							type: "text" as const,
							text: "No domains discovered yet. Use search_datasets to discover domains.",
						},
					],
				};
			}

			const text = domains.map((d) => `- ${d}`).join("\n");
			return { content: [{ type: "text" as const, text: `Discovered domains:\n${text}` }] };
		},
	);
}
