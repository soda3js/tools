import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { McpConfig } from "../lib/config.js";

export function registerConfigResource(server: McpServer, config: McpConfig): void {
	server.registerResource(
		"config",
		"socrata://config",
		{ description: "Current soda3-mcp server configuration" },
		async () => {
			const data = {
				defaultDomain: config.defaultDomain ?? null,
				hasAppToken: config.appToken !== undefined,
				cachePath: config.cachePath,
				logLevel: config.logLevel,
				profiles: Object.keys(config.profiles),
			};
			return {
				contents: [
					{
						uri: "socrata://config",
						mimeType: "application/json",
						text: JSON.stringify(data, null, 2),
					},
				],
			};
		},
	);
}
