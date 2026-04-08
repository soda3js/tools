import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

export function registerHelp(server: McpServer): void {
	server.registerTool(
		"help",
		{
			description: "Show a reference card of all available soda3-mcp tools and their parameters.",
		},
		async () => {
			const text = `soda3-mcp Tool Reference
========================

search_datasets
  Search the Socrata open data catalog.
  Params: q (required), domain, category, limit (1-50, default 10)

get_metadata
  Get full metadata for a dataset.
  Params: domain (required), dataset_id (required)

get_columns
  List columns with field names, types, and descriptions.
  Params: domain (required), dataset_id (required)

preview_dataset
  Preview the first rows of a dataset.
  Params: domain (required), dataset_id (required), limit (1-50, default 10)

query_dataset
  Execute a SoQL query against a dataset.
  Params: domain (required), dataset_id (required), select, where, group_by, order_by, limit (1-1000, default 25), offset

summarize_column
  Statistical summary of a column.
  Params: domain (required), dataset_id (required), column (required), top_n (1-50, default 10)

list_domains
  List all discovered Socrata domains in this session.
  Params: none

help
  Show this reference card.
  Params: none`;

			return { content: [{ type: "text" as const, text }] };
		},
	);
}
