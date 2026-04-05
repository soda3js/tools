import { access, mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { hashBody } from "./fixture-loader.js";
import type { FixtureEnvelope } from "./types.js";

function bodyExtension(contentType: string): string {
	if (contentType.includes("csv")) return ".body.csv";
	if (contentType.includes("geo+json")) return ".body.geojson";
	return ".body.json";
}

function envelopeFilename(envelope: FixtureEnvelope): string {
	const { method, path, body } = envelope.request;
	const sanitized = path.replace(/^\//, "").replace(/\//g, "--").replace(/\./g, "-");
	const base = `${method}--${sanitized}`;
	if (method === "POST" && body != null) {
		const hash = hashBody(body).slice(0, 8);
		return `${base}--${hash}`;
	}
	return base;
}

function redactHeaders(headers: Record<string, string>): Record<string, string> {
	const redacted = { ...headers };
	if (redacted["x-app-token"]) {
		redacted["x-app-token"] = "[REDACTED]";
	}
	return redacted;
}

export async function writeFixture(
	dir: string,
	envelope: FixtureEnvelope,
	body: Buffer,
	options: { overwrite?: boolean } = {},
): Promise<{ envelopePath: string; bodyPath: string }> {
	await mkdir(dir, { recursive: true });

	const baseName = envelopeFilename(envelope);
	const ext = bodyExtension(envelope.response.content_type);
	const bodyFileName = `${baseName}${ext}`;
	const envelopeFileName = `${baseName}.json`;
	const envelopePath = join(dir, envelopeFileName);
	const bodyPath = join(dir, bodyFileName);

	if (options.overwrite === false) {
		try {
			await access(envelopePath);
			return { envelopePath, bodyPath };
		} catch {
			// File doesn't exist, continue to write
		}
	}

	const savedEnvelope: FixtureEnvelope = {
		...envelope,
		request: {
			...envelope.request,
			headers: redactHeaders(envelope.request.headers),
		},
		response: {
			...envelope.response,
			body_file: bodyFileName,
		},
	};

	if (envelope.response.content_type.includes("json")) {
		try {
			const parsed = JSON.parse(body.toString("utf-8"));
			await writeFile(bodyPath, JSON.stringify(parsed, null, 2), "utf-8");
		} catch {
			await writeFile(bodyPath, body);
		}
	} else {
		await writeFile(bodyPath, body);
	}

	await writeFile(envelopePath, JSON.stringify(savedEnvelope, null, 2), "utf-8");

	return { envelopePath, bodyPath };
}
