import { buildCacheKey } from "@soda3js/cache";
import type { CacheEntry, CacheStore, DatasetFreshness } from "@soda3js/protocol";
import { Effect } from "effect";

export const FRESHNESS_KEY_PREFIX = "__freshness__/";

function freshnessKey(domain: string, datasetId: string): string {
	return `${FRESHNESS_KEY_PREFIX}${domain}/${datasetId}`;
}

export function getFreshness(
	cache: CacheStore,
	domain: string,
	datasetId: string,
): Effect.Effect<DatasetFreshness | undefined> {
	return Effect.promise(() =>
		cache
			.get(freshnessKey(domain, datasetId))
			.then((entry) => {
				if (!entry) return undefined;
				try {
					return JSON.parse(new TextDecoder().decode(entry.body)) as DatasetFreshness;
				} catch {
					return undefined;
				}
			})
			.catch(() => undefined),
	);
}

export function setFreshness(cache: CacheStore, freshness: DatasetFreshness): Effect.Effect<void> {
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
	return Effect.promise(() => cache.set(key, entry).catch(() => {}));
}

function isFreshnessValid(freshness: DatasetFreshness, ttl: number): boolean {
	const age = (Date.now() - new Date(freshness.lastChecked).getTime()) / 1000;
	return age < ttl;
}

export interface CachedQueryOptions<E> {
	cache: CacheStore;
	ttl: number;
	domain: string;
	datasetId: string;
	query: string;
	format: string;
	fetchMetadata: () => Effect.Effect<{ rowsUpdatedAt: number }, E>;
	fetchData: () => Effect.Effect<ReadonlyArray<Record<string, unknown>>, E>;
	pageNumber?: number;
}

export function cachedQuery<E>(
	options: CachedQueryOptions<E>,
): Effect.Effect<ReadonlyArray<Record<string, unknown>>, E> {
	const { cache, ttl, domain, datasetId, query, format, fetchMetadata, fetchData } = options;

	return Effect.gen(function* () {
		// 1. Check freshness
		const freshness = yield* getFreshness(cache, domain, datasetId);
		let rowsUpdatedAt: number;

		if (freshness && isFreshnessValid(freshness, ttl)) {
			rowsUpdatedAt = freshness.rowsUpdatedAt;
		} else {
			const meta = yield* fetchMetadata();
			rowsUpdatedAt = meta.rowsUpdatedAt;
			yield* setFreshness(cache, {
				domain,
				datasetId,
				rowsUpdatedAt,
				lastChecked: new Date().toISOString(),
				ttl,
			});
		}

		// 2. Build cache key
		const baseKey = yield* Effect.promise(() => buildCacheKey({ domain, datasetId, query, format, rowsUpdatedAt }));
		const fullKey = options.pageNumber !== undefined ? `${baseKey}:p${options.pageNumber}` : baseKey;

		// 3. Check data cache
		const cached = yield* Effect.promise(() => cache.get(fullKey).catch(() => undefined));
		if (cached) {
			try {
				return JSON.parse(new TextDecoder().decode(cached.body)) as ReadonlyArray<Record<string, unknown>>;
			} catch {
				// Corrupted, fall through
			}
		}

		// 4. Fetch
		const rows = yield* fetchData();

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
		yield* Effect.promise(() => cache.set(fullKey, entry).catch(() => {}));

		return rows;
	});
}

export interface CachedMetadataOptions<E> {
	cache: CacheStore;
	ttl: number;
	domain: string;
	datasetId: string;
	fetchMetadata: () => Effect.Effect<Record<string, unknown>, E>;
}

export function cachedMetadata<E>(options: CachedMetadataOptions<E>): Effect.Effect<Record<string, unknown>, E> {
	const { cache, ttl, domain, datasetId, fetchMetadata } = options;

	return Effect.gen(function* () {
		const cacheKey = yield* Effect.promise(() =>
			buildCacheKey({ domain, datasetId, query: "__metadata__", format: "json" }),
		);

		// Check freshness first
		const freshness = yield* getFreshness(cache, domain, datasetId);
		if (freshness && isFreshnessValid(freshness, ttl)) {
			const cached = yield* Effect.promise(() => cache.get(cacheKey).catch(() => undefined));
			if (cached) {
				try {
					return JSON.parse(new TextDecoder().decode(cached.body)) as Record<string, unknown>;
				} catch {
					// Fall through
				}
			}
		}

		// Fetch
		const metadata = yield* fetchMetadata();

		// Update freshness
		const rowsUpdatedAt = (metadata as { rowsUpdatedAt?: number }).rowsUpdatedAt ?? 0;
		yield* setFreshness(cache, {
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
		yield* Effect.promise(() => cache.set(cacheKey, entry).catch(() => {}));

		return metadata;
	});
}
