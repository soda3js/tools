import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import { join, resolve } from "node:path";
import type { FixtureEnvelope, FixtureIndex, IndexedFixture } from "./types.js";

function deepSortKeys(value: unknown): unknown {
	if (Array.isArray(value)) {
		return value.map(deepSortKeys);
	}
	if (value !== null && typeof value === "object") {
		const sorted: Record<string, unknown> = {};
		for (const key of Object.keys(value as object).sort()) {
			sorted[key] = deepSortKeys((value as Record<string, unknown>)[key]);
		}
		return sorted;
	}
	return value;
}

export function hashBody(body: unknown): string {
	const normalized = JSON.stringify(deepSortKeys(body));
	return createHash("sha256").update(normalized).digest("hex").slice(0, 16);
}

function buildExactKey(envelope: FixtureEnvelope): string {
	const { method, path, body } = envelope.request;
	if (method === "POST" && body != null) {
		return `${method}:${path}:${hashBody(body)}`;
	}
	return `${method}:${path}`;
}

function buildPathKey(envelope: FixtureEnvelope): string {
	return `${envelope.request.method}:${envelope.request.path}`;
}

async function findResponsesDirs(fixturesDir: string): Promise<string[]> {
	const dirs: string[] = [];
	try {
		// Check if fixturesDir itself has a responses/ subdirectory (dataset dir)
		const directResponsesPath = join(fixturesDir, "responses");
		try {
			await readdir(directResponsesPath);
			dirs.push(directResponsesPath);
			return dirs;
		} catch {
			// No direct responses/ subdirectory, look for dataset subdirs
		}

		// Look for subdirectories that contain a responses/ subdirectory
		const entries = await readdir(fixturesDir, { withFileTypes: true });
		for (const entry of entries) {
			if (entry.isDirectory()) {
				const responsesPath = join(fixturesDir, entry.name, "responses");
				try {
					await readdir(responsesPath);
					dirs.push(responsesPath);
				} catch {
					// No responses/ subdirectory, skip
				}
			}
		}
	} catch {
		// Directory does not exist
	}
	return dirs;
}

async function loadEnvelopesFromDir(dir: string): Promise<IndexedFixture[]> {
	const results: IndexedFixture[] = [];
	let files: string[];
	try {
		files = await readdir(dir);
	} catch {
		return results;
	}

	const envelopeFiles = files.filter((f) => f.endsWith(".json") && !f.includes(".body."));

	for (const file of envelopeFiles) {
		const envelopePath = join(dir, file);
		try {
			const raw = await readFile(envelopePath, "utf-8");
			const envelope: FixtureEnvelope = JSON.parse(raw);
			const bodyFile = envelope.response.body_file;
			const bodyPath = resolve(dir, bodyFile);
			results.push({ envelope, envelopePath, bodyPath });
		} catch {
			// Skip malformed envelopes
		}
	}

	return results;
}

export async function loadFixtures(fixturesDir: string): Promise<FixtureIndex> {
	const index: FixtureIndex = {
		entries: new Map(),
		pathEntries: new Map(),
	};

	const responsesDirs = await findResponsesDirs(fixturesDir);

	for (const dir of responsesDirs) {
		const fixtures = await loadEnvelopesFromDir(dir);
		for (const fixture of fixtures) {
			const exactKey = buildExactKey(fixture.envelope);
			const pathKey = buildPathKey(fixture.envelope);
			index.entries.set(exactKey, fixture);
			if (!index.pathEntries.has(pathKey)) {
				index.pathEntries.set(pathKey, fixture);
			}
		}
	}

	return index;
}
