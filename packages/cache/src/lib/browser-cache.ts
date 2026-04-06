/// <reference lib="dom" />
import type { CacheEntry, CacheStore, PruneOptions, PruneResult } from "@soda3js/protocol";

const RESPONSES_STORE = "responses";
const DB_VERSION = 1;

export interface BrowserCacheOptions {
	dbName?: string;
	version?: number;
}

function rejectWith(reject: (reason?: unknown) => void, source: { error: DOMException | null }) {
	return () => reject(source.error);
}

function openDb(name: string, version: number): Promise<IDBDatabase> {
	return new Promise((resolve, reject) => {
		const request = indexedDB.open(name, version);
		request.onupgradeneeded = () => {
			const db = request.result;
			if (!db.objectStoreNames.contains(RESPONSES_STORE)) {
				const store = db.createObjectStore(RESPONSES_STORE, { keyPath: "key" });
				store.createIndex("domain", "domain", { unique: false });
				store.createIndex("datasetId", "datasetId", { unique: false });
				store.createIndex("created", "created", { unique: false });
				store.createIndex("cleanable", "cleanable", { unique: false });
			}
		};
		request.onsuccess = () => resolve(request.result);
		request.onerror = rejectWith(reject, request);
	});
}

interface StoredEntry extends CacheEntry {
	key: string;
}

export class BrowserCache implements CacheStore {
	private dbName: string;
	private version: number;

	constructor(options?: BrowserCacheOptions) {
		this.dbName = options?.dbName ?? "soda3js-cache";
		this.version = options?.version ?? DB_VERSION;
	}

	async get(key: string): Promise<CacheEntry | undefined> {
		const db = await openDb(this.dbName, this.version);
		try {
			return await new Promise((resolve, reject) => {
				const tx = db.transaction(RESPONSES_STORE, "readonly");
				const store = tx.objectStore(RESPONSES_STORE);
				const request = store.get(key);
				request.onsuccess = () => {
					const result = request.result as StoredEntry | undefined;
					if (result) {
						const { key: _, ...entry } = result;
						resolve(entry);
					} else {
						resolve(undefined);
					}
				};
				request.onerror = rejectWith(reject, request);
			});
		} finally {
			db.close();
		}
	}

	async set(key: string, entry: CacheEntry): Promise<void> {
		const db = await openDb(this.dbName, this.version);
		try {
			await new Promise<void>((resolve, reject) => {
				const tx = db.transaction(RESPONSES_STORE, "readwrite");
				const store = tx.objectStore(RESPONSES_STORE);
				store.put({ key, ...entry });
				tx.oncomplete = () => resolve();
				tx.onerror = rejectWith(reject, tx);
			});
		} finally {
			db.close();
		}
	}

	async has(key: string): Promise<boolean> {
		const db = await openDb(this.dbName, this.version);
		try {
			return await new Promise((resolve, reject) => {
				const tx = db.transaction(RESPONSES_STORE, "readonly");
				const store = tx.objectStore(RESPONSES_STORE);
				const request = store.count(key);
				request.onsuccess = () => resolve(request.result > 0);
				request.onerror = rejectWith(reject, request);
			});
		} finally {
			db.close();
		}
	}

	async invalidate(key: string): Promise<boolean> {
		const db = await openDb(this.dbName, this.version);
		try {
			return await new Promise((resolve, reject) => {
				const tx = db.transaction(RESPONSES_STORE, "readwrite");
				const store = tx.objectStore(RESPONSES_STORE);
				const countReq = store.count(key);
				countReq.onsuccess = () => {
					if (countReq.result === 0) {
						resolve(false);
						return;
					}
					store.delete(key);
					tx.oncomplete = () => resolve(true);
					tx.onerror = () => reject(tx.error);
				};
				countReq.onerror = () => reject(countReq.error);
			});
		} finally {
			db.close();
		}
	}

	async prune(options?: PruneOptions): Promise<PruneResult> {
		const db = await openDb(this.dbName, this.version);
		try {
			const now = Date.now();
			let removed = 0;
			let freedBytes = 0;

			const entries = await new Promise<StoredEntry[]>((resolve, reject) => {
				const tx = db.transaction(RESPONSES_STORE, "readonly");
				const store = tx.objectStore(RESPONSES_STORE);
				const request = store.getAll();
				request.onsuccess = () => resolve(request.result as StoredEntry[]);
				request.onerror = rejectWith(reject, request);
			});

			const keysToRemove: string[] = [];
			for (const entry of entries) {
				if (options?.cleanableOnly && !entry.cleanable) continue;

				let shouldRemove = false;
				if (options?.maxAge !== undefined) {
					const age = (now - new Date(entry.created).getTime()) / 1000;
					if (age > options.maxAge) shouldRemove = true;
				}

				if (shouldRemove) {
					keysToRemove.push(entry.key);
					freedBytes += entry.sizeBytes;
					removed++;
				}
			}

			if (keysToRemove.length > 0) {
				await new Promise<void>((resolve, reject) => {
					const tx = db.transaction(RESPONSES_STORE, "readwrite");
					const store = tx.objectStore(RESPONSES_STORE);
					for (const key of keysToRemove) {
						store.delete(key);
					}
					tx.oncomplete = () => resolve();
					tx.onerror = rejectWith(reject, tx);
				});
			}

			return { removed, freedBytes };
		} finally {
			db.close();
		}
	}
}
