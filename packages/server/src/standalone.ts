import type { ServerMode } from "./lib/types.js";
import { TestServer } from "./server.js";

const mode = (process.env.SODA3_SERVER_MODE ?? "replay") as ServerMode;
const port = Number.parseInt(process.env.SODA3_SERVER_PORT ?? "3000", 10);
const fixtures = process.env.SODA3_FIXTURES_PATH ?? "/data/fixtures";

const options: Parameters<typeof TestServer.create>[0] = {
	fixtures,
	mode,
	port,
};

if (mode === "record") {
	const portal = process.env.SODA3_RECORD_PORTAL;
	if (!portal) {
		console.error("SODA3_RECORD_PORTAL is required for record mode");
		process.exit(1);
	}
	options.record = {
		portal,
		fixtures,
		overwrite: false,
	};
}

if (mode === "chaos") {
	const probability = Number.parseFloat(process.env.SODA3_CHAOS_PROBABILITY ?? "0.1");
	const seed = process.env.SODA3_CHAOS_SEED ? Number.parseInt(process.env.SODA3_CHAOS_SEED, 10) : undefined;
	options.chaos = {
		enabled: true,
		probability,
		...(seed !== undefined ? { seed } : {}),
		faults: [
			{ status: 429, weight: 3 },
			{ status: 500, weight: 2 },
			{ type: "timeout", delay_ms: 10000, weight: 1 },
			{ type: "reset", weight: 1 },
		],
	};
}

const server = await TestServer.create(options);
console.log(`SODA3 test server (${mode}) listening at ${server.url}`);

async function shutdown() {
	console.log("Shutting down...");
	await server.close();
	process.exit(0);
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
