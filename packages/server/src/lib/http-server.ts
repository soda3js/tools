import { readFile } from "node:fs/promises";
import type { IncomingMessage, Server, ServerResponse } from "node:http";
import { createServer } from "node:http";
import { createChaosMonkey } from "./chaos.js";
import type { FaultResult } from "./fault-injector.js";
import { createFaultInjector } from "./fault-injector.js";
import { loadFixtures } from "./fixture-loader.js";
import { recordAndSave } from "./recorder.js";
import { matchRequest } from "./request-matcher.js";
import type {
	AuthConfig,
	ChaosConfig,
	FaultRule,
	FixtureIndex,
	ParsedRequest,
	RecordConfig,
	ServerMode,
} from "./types.js";

export interface HttpServerOptions {
	fixtures: string;
	mode: ServerMode;
	port: number;
	auth?: AuthConfig;
	faults?: FaultRule[];
	chaos?: ChaosConfig;
	record?: RecordConfig;
}

async function parseRequest(req: IncomingMessage): Promise<ParsedRequest> {
	const url = new URL(req.url ?? "/", "http://localhost");
	const query: Record<string, string> = {};
	url.searchParams.forEach((value, key) => {
		query[key] = value;
	});

	let body: unknown = null;
	if (req.method === "POST" || req.method === "PUT") {
		const chunks: Buffer[] = [];
		for await (const chunk of req) {
			chunks.push(chunk as Buffer);
		}
		const raw = Buffer.concat(chunks).toString("utf-8");
		try {
			body = JSON.parse(raw);
		} catch {
			body = raw;
		}
	}

	return {
		method: req.method ?? "GET",
		path: url.pathname,
		query,
		headers: req.headers,
		body,
	};
}

function sendFault(res: ServerResponse, fault: FaultResult): void {
	if (fault.type === "reset") {
		res.destroy();
		return;
	}

	const delay = fault.delay_ms ?? 0;
	const status = fault.status ?? 500;

	const respond = () => {
		const errorBody = JSON.stringify({
			code: `test.fault.${status}`,
			error: true,
			message: `Injected fault: ${status}`,
		});
		res.writeHead(status, { "content-type": "application/json" });
		res.end(errorBody);
	};

	if (delay > 0) {
		setTimeout(respond, delay);
	} else {
		respond();
	}
}

export async function startHttpServer(options: HttpServerOptions): Promise<{
	server: Server;
	info: { url: string; port: number };
	requestCount: number;
}> {
	let fixtureIndex: FixtureIndex = await loadFixtures(options.fixtures);
	const faultInjector = options.faults ? createFaultInjector(options.faults) : null;
	const chaosMonkey = options.mode === "chaos" && options.chaos ? createChaosMonkey(options.chaos) : null;

	let requestCount = 0;

	const handler = async (req: IncomingMessage, res: ServerResponse) => {
		requestCount++;
		const parsed = await parseRequest(req);

		// 1. Auth check
		if (options.auth?.required) {
			const token = typeof parsed.headers["x-app-token"] === "string" ? parsed.headers["x-app-token"] : undefined;
			if (token !== options.auth.token) {
				res.writeHead(401, { "content-type": "application/json" });
				res.end(
					JSON.stringify({
						code: "authentication_required",
						error: true,
						message: "This request requires authentication.",
					}),
				);
				return;
			}
		}

		// 2. Deterministic faults
		if (faultInjector) {
			const fault = faultInjector.check(parsed);
			if (fault) {
				sendFault(res, fault);
				return;
			}
		}

		// 3. Chaos faults
		if (chaosMonkey) {
			const fault = chaosMonkey.maybeFault();
			if (fault) {
				const chaosFault: FaultResult = {};
				if (fault.status !== undefined) chaosFault.status = fault.status;
				if (fault.type !== undefined) chaosFault.type = fault.type;
				if (fault.delay_ms !== undefined) chaosFault.delay_ms = fault.delay_ms;
				sendFault(res, chaosFault);
				return;
			}
		}

		// 4. Record mode: proxy on cache miss
		if (options.mode === "record" && options.record) {
			const existing = matchRequest(fixtureIndex, parsed);
			if (!existing) {
				const appToken = process.env.SOCRATA_APP_TOKEN;
				if (!appToken) {
					res.writeHead(500, { "content-type": "application/json" });
					res.end(
						JSON.stringify({
							error: true,
							message: "SOCRATA_APP_TOKEN required for record mode",
						}),
					);
					return;
				}
				try {
					const result = await recordAndSave(options.record, parsed, appToken);
					fixtureIndex = await loadFixtures(options.fixtures);
					for (const [key, value] of Object.entries(result.headers)) {
						res.setHeader(key, value);
					}
					res.writeHead(result.status);
					res.end(result.body);
					return;
				} catch (err) {
					res.writeHead(502, { "content-type": "application/json" });
					res.end(
						JSON.stringify({
							error: true,
							message: `Record proxy failed: ${err}`,
						}),
					);
					return;
				}
			}
		}

		// 5. Replay: match fixture
		const fixture = matchRequest(fixtureIndex, parsed);
		if (!fixture) {
			res.writeHead(404, { "content-type": "application/json" });
			res.end(
				JSON.stringify({
					error: true,
					message: `No fixture found for ${parsed.method} ${parsed.path}`,
				}),
			);
			return;
		}

		try {
			const bodyContent = await readFile(fixture.bodyPath);
			const responseHeaders = { ...fixture.envelope.response.headers };
			responseHeaders["content-type"] = fixture.envelope.response.content_type;
			res.writeHead(fixture.envelope.response.status, responseHeaders);
			res.end(bodyContent);
		} catch (err) {
			res.writeHead(500, { "content-type": "application/json" });
			res.end(
				JSON.stringify({
					error: true,
					message: `Failed to read fixture body: ${err}`,
				}),
			);
		}
	};

	const server = createServer((req, res) => {
		handler(req, res).catch((err) => {
			res.writeHead(500);
			res.end(`Internal server error: ${err}`);
		});
	});

	return new Promise((resolve) => {
		server.listen(options.port, () => {
			const addr = server.address();
			const port = typeof addr === "object" && addr ? addr.port : options.port;
			resolve({
				server,
				info: { url: `http://localhost:${port}`, port },
				get requestCount() {
					return requestCount;
				},
			});
		});
	});
}
