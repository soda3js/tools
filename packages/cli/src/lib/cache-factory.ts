import type { CacheStore } from "@soda3js/cache-fs";
import { FileSystemCacheImpl } from "@soda3js/cache-fs";
import type { CacheConfig } from "@soda3js/config";
import { Soda3Config } from "@soda3js/config";

export interface ResolvedCacheConfig {
	enabled: boolean;
	ttl: number;
}

const DEFAULT_TTL = 300;

export function resolveCacheConfig(
	globalCache?: CacheConfig,
	profileCache?: CacheConfig,
	flags?: { noCache?: boolean; cacheTtl?: number },
): ResolvedCacheConfig {
	if (flags?.noCache) {
		return { enabled: false, ttl: DEFAULT_TTL };
	}

	const enabled = profileCache?.enabled ?? globalCache?.enabled ?? true;
	const ttl = flags?.cacheTtl ?? profileCache?.ttl ?? globalCache?.ttl ?? DEFAULT_TTL;

	return { enabled, ttl };
}

export function createCache(): CacheStore {
	return new FileSystemCacheImpl({
		cacheDir: Soda3Config.cacheDir(),
	});
}
