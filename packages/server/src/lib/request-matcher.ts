import { hashBody } from "./fixture-loader.js";
import type { FixtureIndex, IndexedFixture, ParsedRequest } from "./types.js";

export function matchRequest(index: FixtureIndex, req: ParsedRequest): IndexedFixture | null {
	// 1. Try exact match (method + path + body hash for POST)
	if (req.method === "POST" && req.body != null) {
		const bodyHash = hashBody(req.body);
		const exactKey = `${req.method}:${req.path}:${bodyHash}`;
		const exact = index.entries.get(exactKey);
		if (exact) return exact;
	} else {
		const exactKey = `${req.method}:${req.path}`;
		const exact = index.entries.get(exactKey);
		if (exact) return exact;
	}

	// 2. Fallback: path-only match
	const pathKey = `${req.method}:${req.path}`;
	return index.pathEntries.get(pathKey) ?? null;
}
