import { buildCacheKey } from "@soda3js/cache";
import type { CacheEntry, CacheStore, DatasetFreshness } from "@soda3js/protocol";

export const FRESHNESS_KEY_PREFIX = "__freshness__/";

function freshnessKey(domain: string, datasetId: string): string {
	return `${FRESHNESS_KEY_PREFIX}${domain}/${datasetId}`;
}

export async function getFreshness(
	cache: CacheStore,
	domain: string,
	datasetId: string,
): Promise<DatasetFreshness | undefined> {
	const key = freshnessKey(domain, datasetId);
	const entry = await cache.get(key);
	if (!entry) return undefined;
	try {
		return JSON.parse(new TextDecoder().decode(entry.body)) as DatasetFreshness;
	} catch {
		return undefined;
	}
}

export async function setFreshness(cache: CacheStore, freshness: DatasetFreshness): Promise<void> {
	const key = freshnessKey(freshness.domain, freshness.datasetId);
	const body = new TextEncoder().encode(JSON.stringify(freshness));
	const entry: CacheEntry = {
		body,
		contentType: "application/json",
		headers: {},
		created: freshness.lastChecked,
		datasetId: freshness.datasetId,
		domain: freshness.domain,
		rowsUpdatedAt: freshness.rowsUpdatedAt,
		sizeBytes: body.length,
		ttl: freshness.ttl,
		cleanable: false,
	};
	await cache.set(key, entry);
}

function isFreshnessValid(freshness: DatasetFreshness, ttl: number): boolean {
	const age = (Date.now() - new Date(freshness.lastChecked).getTime()) / 1000;
	return age < ttl;
}

export interface CachedQueryOptions {
	cache: CacheStore;
	ttl: number;
	domain: string;
	datasetId: string;
	query: string;
	format: string;
	fetchMetadata: () => Promise<{ rowsUpdatedAt: number }>;
	fetchData: () => Promise<ReadonlyArray<Record<string, unknown>>>;
	pageNumber?: number;
}

export async function cachedQuery(options: CachedQueryOptions): Promise<ReadonlyArray<Record<string, unknown>>> {
	const { cache, ttl, domain, datasetId, query, format, fetchMetadata, fetchData } = options;

	// 1. Check freshness
	const freshness = await getFreshness(cache, domain, datasetId);
	let rowsUpdatedAt: number;

	if (freshness && isFreshnessValid(freshness, ttl)) {
		rowsUpdatedAt = freshness.rowsUpdatedAt;
	} else {
		const meta = await fetchMetadata();
		rowsUpdatedAt = meta.rowsUpdatedAt;
		await setFreshness(cache, {
			domain,
			datasetId,
			rowsUpdatedAt,
			lastChecked: new Date().toISOString(),
			ttl,
		});
	}

	// 2. Build cache key
	const baseKey = await buildCacheKey({ domain, datasetId, query, format, rowsUpdatedAt });
	const fullKey = options.pageNumber !== undefined ? `${baseKey}:p${options.pageNumber}` : baseKey;

	// 3. Check data cache
	const cached = await cache.get(fullKey);
	if (cached) {
		try {
			return JSON.parse(new TextDecoder().decode(cached.body)) as ReadonlyArray<Record<string, unknown>>;
		} catch {
			// Corrupted, fall through
		}
	}

	// 4. Fetch
	const rows = await fetchData();

	// 5. Store
	const body = new TextEncoder().encode(JSON.stringify(rows));
	const entry: CacheEntry = {
		body,
		contentType: "application/json",
		headers: {},
		created: new Date().toISOString(),
		datasetId,
		domain,
		rowsUpdatedAt,
		sizeBytes: body.length,
		ttl,
		cleanable: true,
		query,
	};
	await cache.set(fullKey, entry);

	return rows;
}

export interface CachedMetadataOptions {
	cache: CacheStore;
	ttl: number;
	domain: string;
	datasetId: string;
	fetchMetadata: () => Promise<Record<string, unknown>>;
}

export async function cachedMetadata(options: CachedMetadataOptions): Promise<Record<string, unknown>> {
	const { cache, ttl, domain, datasetId, fetchMetadata } = options;

	const cacheKey = await buildCacheKey({
		domain,
		datasetId,
		query: "__metadata__",
		format: "json",
	});

	// Check freshness first
	const freshness = await getFreshness(cache, domain, datasetId);
	if (freshness && isFreshnessValid(freshness, ttl)) {
		const cached = await cache.get(cacheKey);
		if (cached) {
			try {
				return JSON.parse(new TextDecoder().decode(cached.body)) as Record<string, unknown>;
			} catch {
				// Fall through
			}
		}
	}

	// Fetch
	const metadata = await fetchMetadata();

	// Update freshness
	const rowsUpdatedAt = (metadata as { rowsUpdatedAt?: number }).rowsUpdatedAt ?? 0;
	await setFreshness(cache, {
		domain,
		datasetId,
		rowsUpdatedAt,
		lastChecked: new Date().toISOString(),
		ttl,
	});

	// Cache
	const body = new TextEncoder().encode(JSON.stringify(metadata));
	const entry: CacheEntry = {
		body,
		contentType: "application/json",
		headers: {},
		created: new Date().toISOString(),
		datasetId,
		domain,
		rowsUpdatedAt,
		sizeBytes: body.length,
		ttl,
		cleanable: true,
		query: "__metadata__",
	};
	await cache.set(cacheKey, entry);

	return metadata;
}
