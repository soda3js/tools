/**
 * A cached API response with metadata for invalidation and cleanup.
 */
export interface CacheEntry {
	body: Uint8Array;
	contentType: string;
	headers: Record<string, string>;
	created: string;
	datasetId: string;
	domain: string;
	rowsUpdatedAt: number;
	sizeBytes: number;
	ttl: number;
	cleanable: boolean;
	query?: string;
}

/**
 * Input fields for building a deterministic cache key.
 */
export interface CacheKeyInput {
	domain: string;
	datasetId: string;
	query: string;
	format?: string;
	rowsUpdatedAt?: number;
}

/**
 * Options for pruning stale or oversized cache entries.
 */
export interface PruneOptions {
	maxAge?: number;
	/** Reserved for future use. Not currently implemented by any backend. */
	maxSize?: number;
	cleanableOnly?: boolean;
}

/**
 * Result of a prune operation.
 */
export interface PruneResult {
	removed: number;
	freedBytes: number;
}

/**
 * Async key-value store for cached SODA3 API responses.
 *
 * Implemented by MemoryCache, BrowserCache, FileSystemCache,
 * SqliteCache, or any custom backend.
 */
export interface CacheStore {
	get(key: string): Promise<CacheEntry | undefined>;
	set(key: string, entry: CacheEntry): Promise<void>;
	has(key: string): Promise<boolean>;
	invalidate(key: string): Promise<boolean>;
	prune(options?: PruneOptions): Promise<PruneResult>;
}

/**
 * Tracks when a dataset's metadata was last checked for freshness.
 */
export interface DatasetFreshness {
	domain: string;
	datasetId: string;
	rowsUpdatedAt: number;
	lastChecked: string;
	ttl: number;
}
