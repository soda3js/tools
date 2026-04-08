#!/usr/bin/env node
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { loadConfig } from "./lib/config.js";
import { createServer } from "./server.js";

async function main() {
	const config = loadConfig();
	const server = createServer(config);
	const transport = new StdioServerTransport();
	await server.connect(transport);
}

main().catch((err) => {
	process.stderr.write(`soda3-mcp: ${err instanceof Error ? err.message : String(err)}\n`);
	process.exit(1);
});
