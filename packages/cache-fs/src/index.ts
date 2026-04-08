import { Soda3Config } from "@soda3js/config";
import type { CacheStore } from "@soda3js/protocol";
import { Context, Layer } from "effect";
import type { FileSystemCacheOptions } from "./lib/fs-cache.js";
import { FileSystemCacheImpl } from "./lib/fs-cache.js";

export class FileSystemCache extends Context.Tag("@soda3js/cache-fs/FileSystemCache")<FileSystemCache, CacheStore>() {}

export const FileSystemCacheLive = (options?: Partial<FileSystemCacheOptions>): Layer.Layer<FileSystemCache> =>
	Layer.succeed(
		FileSystemCache,
		new FileSystemCacheImpl({
			cacheDir: options?.cacheDir ?? Soda3Config.cacheDir(),
			...(options?.defaultTtl !== undefined ? { defaultTtl: options.defaultTtl } : {}),
		}),
	);

export { Soda3Config } from "@soda3js/config";
export type {
	CacheEntry,
	CacheKeyInput,
	CacheStore,
	DatasetFreshness,
	PruneOptions,
	PruneResult,
} from "@soda3js/protocol";
export type { FileSystemCacheOptions } from "./lib/fs-cache.js";
export { FileSystemCacheImpl } from "./lib/fs-cache.js";
