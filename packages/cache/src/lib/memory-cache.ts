import type { CacheEntry, CacheStore, PruneOptions, PruneResult } from "@soda3js/protocol";

export interface MemoryCacheOptions {
	maxEntries?: number;
}

export class MemoryCache implements CacheStore {
	private store = new Map<string, CacheEntry>();
	private maxEntries: number | undefined;

	constructor(options?: MemoryCacheOptions) {
		this.maxEntries = options?.maxEntries;
	}

	async get(key: string): Promise<CacheEntry | undefined> {
		return this.store.get(key);
	}

	async set(key: string, entry: CacheEntry): Promise<void> {
		this.store.set(key, entry);
		if (this.maxEntries !== undefined && this.store.size > this.maxEntries) {
			this.evictOldest();
		}
	}

	async has(key: string): Promise<boolean> {
		return this.store.has(key);
	}

	async invalidate(key: string): Promise<boolean> {
		return this.store.delete(key);
	}

	async prune(options?: PruneOptions): Promise<PruneResult> {
		let removed = 0;
		let freedBytes = 0;
		const now = Date.now();

		for (const [key, entry] of this.store) {
			if (options?.cleanableOnly && !entry.cleanable) continue;

			let shouldRemove = false;
			if (options?.maxAge !== undefined) {
				const age = (now - new Date(entry.created).getTime()) / 1000;
				if (age > options.maxAge) shouldRemove = true;
			}

			if (shouldRemove) {
				this.store.delete(key);
				removed++;
				freedBytes += entry.sizeBytes;
			}
		}

		return { removed, freedBytes };
	}

	clear(): void {
		this.store.clear();
	}

	private evictOldest(): void {
		let oldestKey: string | undefined;
		let oldestTime = Number.POSITIVE_INFINITY;
		for (const [key, entry] of this.store) {
			const time = new Date(entry.created).getTime();
			if (time < oldestTime) {
				oldestTime = time;
				oldestKey = key;
			}
		}
		if (oldestKey !== undefined) {
			this.store.delete(oldestKey);
		}
	}
}
