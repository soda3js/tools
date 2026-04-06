import type { CacheKeyInput } from "@soda3js/protocol";

export async function buildCacheKey(input: CacheKeyInput): Promise<string> {
	const parts = [input.domain, input.datasetId, input.query, input.format ?? "json"];
	if (input.rowsUpdatedAt !== undefined) {
		parts.push(input.rowsUpdatedAt.toString());
	}
	const raw = parts.join("\0");

	let hash: string;
	try {
		const { createHash } = await import("node:crypto");
		hash = createHash("sha256").update(raw).digest("hex").slice(0, 16);
	} catch {
		hash = fnv1a(raw);
	}

	return `${input.domain}/${input.datasetId}/${hash}`;
}

function fnv1a(input: string): string {
	let hash = BigInt("0xcbf29ce484222325");
	const prime = BigInt("0x100000001b3");
	for (let i = 0; i < input.length; i++) {
		hash ^= BigInt(input.charCodeAt(i));
		hash = (hash * prime) & BigInt("0xffffffffffffffff");
	}
	return hash.toString(16).padStart(16, "0");
}
