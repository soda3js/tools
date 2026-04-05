import { request as httpsRequest } from "node:https";
import { writeFixture } from "./fixture-writer.js";
import type { FixtureEnvelope, ParsedRequest, RecordConfig } from "./types.js";

interface RecordResult {
	status: number;
	headers: Record<string, string>;
	body: Buffer;
}

async function proxyRequest(portal: string, req: ParsedRequest, appToken: string): Promise<RecordResult> {
	return new Promise((resolve, reject) => {
		const url = new URL(`https://${portal}${req.path}`);
		for (const [key, value] of Object.entries(req.query)) {
			url.searchParams.set(key, value);
		}
		const isPost = req.method === "POST";
		const bodyStr = isPost && req.body ? JSON.stringify(req.body) : undefined;

		const options = {
			hostname: url.hostname,
			path: url.pathname + url.search,
			method: req.method,
			headers: {
				"x-app-token": appToken,
				...(isPost ? { "content-type": "application/json" } : {}),
			},
		};

		const proxyReq = httpsRequest(options, (res) => {
			const chunks: Buffer[] = [];
			res.on("data", (chunk: Buffer) => chunks.push(chunk));
			res.on("end", () => {
				const responseHeaders: Record<string, string> = {};
				for (const [key, value] of Object.entries(res.headers)) {
					if (typeof value === "string") {
						responseHeaders[key] = value;
					}
				}
				resolve({
					status: res.statusCode ?? 500,
					headers: responseHeaders,
					body: Buffer.concat(chunks),
				});
			});
		});

		proxyReq.on("error", reject);
		if (bodyStr) proxyReq.write(bodyStr);
		proxyReq.end();
	});
}

function extractDatasetId(path: string): string {
	const match = path.match(/([a-z0-9]{4}-[a-z0-9]{4})/);
	return match ? match[1] : "unknown";
}

export async function recordAndSave(config: RecordConfig, req: ParsedRequest, appToken: string): Promise<RecordResult> {
	const result = await proxyRequest(config.portal, req, appToken);

	const contentType = result.headers["content-type"] ?? "application/json";
	const envelope: FixtureEnvelope = {
		dataset_id: extractDatasetId(req.path),
		portal: config.portal,
		recorded_at: new Date().toISOString(),
		latency_ms: 0,
		auth: {
			required: req.path.includes("/api/v3/"),
			token_used: true,
		},
		request: {
			method: req.method,
			path: req.path,
			headers: Object.fromEntries(
				Object.entries(req.headers).filter(([_, v]) => typeof v === "string") as [string, string][],
			),
			body: req.body,
		},
		response: {
			status: result.status,
			content_type: contentType,
			headers: result.headers,
			body_file: "",
		},
	};

	await writeFixture(config.fixtures, envelope, result.body, {
		overwrite: config.overwrite ?? false,
	});

	return result;
}
