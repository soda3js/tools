import { access, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import type { CacheEntry, CacheStore, PruneOptions, PruneResult } from "@soda3js/protocol";

export interface FileSystemCacheOptions {
	cacheDir: string;
	defaultTtl?: number;
}

interface SidecarMeta {
	key: string;
	path: string;
	query?: string;
	contentType: string;
	headers?: Record<string, string>;
	created: string;
	datasetId: string;
	domain: string;
	rowsUpdatedAt: number;
	sizeBytes: number;
	ttl: number;
	cleanable: boolean;
}

type KeyType =
	| { type: "freshness"; domain: string; datasetId: string }
	| { type: "query"; domain: string; datasetId: string; hash: string };

function classifyKey(key: string): KeyType | null {
	// Freshness: __freshness__/domain/datasetId
	if (key.startsWith("__freshness__/")) {
		const rest = key.slice("__freshness__/".length);
		const lastSlash = rest.lastIndexOf("/");
		if (lastSlash === -1) return null;
		const domain = rest.slice(0, lastSlash);
		const datasetId = rest.slice(lastSlash + 1);
		return { type: "freshness", domain, datasetId };
	}

	// Regular key: domain/datasetId/hash
	const parts = key.split("/");
	if (parts.length < 3) return null;
	const hash = parts[parts.length - 1];
	const datasetId = parts[parts.length - 2];
	const domain = parts.slice(0, -2).join("/");
	return { type: "query", domain, datasetId, hash };
}

function bodyExtension(contentType: string): string {
	if (contentType.includes("geo+json")) return ".geojson";
	if (contentType.includes("json")) return ".json";
	if (contentType.includes("csv")) return ".csv";
	return ".bin";
}

export class FileSystemCacheImpl implements CacheStore {
	private cacheDir: string;
	private defaultTtl: number;

	constructor(options: FileSystemCacheOptions) {
		this.cacheDir = resolve(options.cacheDir);
		this.defaultTtl = options.defaultTtl ?? 300;
	}

	private safePath(...segments: string[]): string | null {
		const resolved = resolve(this.cacheDir, ...segments);
		if (!resolved.startsWith(this.cacheDir)) return null;
		return resolved;
	}

	async get(key: string): Promise<CacheEntry | undefined> {
		const classified = classifyKey(key);
		if (!classified) return undefined;

		const datasetDir = this.safePath(classified.domain, classified.datasetId);
		if (!datasetDir) return undefined;

		if (classified.type === "freshness") {
			try {
				const body = await readFile(join(datasetDir, "_freshness.json"));
				return {
					body: new Uint8Array(body),
					contentType: "application/json",
					headers: {},
					created: new Date().toISOString(),
					datasetId: classified.datasetId,
					domain: classified.domain,
					rowsUpdatedAt: 0,
					sizeBytes: body.length,
					ttl: 0,
					cleanable: false,
				};
			} catch {
				return undefined;
			}
		}

		// Check queries/ subdir first
		const queryDir = join(datasetDir, "queries");
		const metaPath = join(queryDir, `${classified.hash}.meta.json`);

		try {
			const metaRaw = await readFile(metaPath, "utf-8");
			const meta: SidecarMeta = JSON.parse(metaRaw);
			const ext = bodyExtension(meta.contentType);
			const bodyPath = join(queryDir, `${classified.hash}${ext}`);
			const body = await readFile(bodyPath);

			return {
				body: new Uint8Array(body),
				contentType: meta.contentType,
				headers: meta.headers ?? {},
				created: meta.created,
				datasetId: meta.datasetId,
				domain: meta.domain,
				rowsUpdatedAt: meta.rowsUpdatedAt,
				sizeBytes: meta.sizeBytes,
				ttl: meta.ttl,
				cleanable: meta.cleanable,
				...(meta.query !== undefined ? { query: meta.query } : {}),
			};
		} catch {
			// Try _metadata.json for metadata keys
			try {
				const body = await readFile(join(datasetDir, "_metadata.json"));
				return {
					body: new Uint8Array(body),
					contentType: "application/json",
					headers: {},
					created: new Date().toISOString(),
					datasetId: classified.datasetId,
					domain: classified.domain,
					rowsUpdatedAt: 0,
					sizeBytes: body.length,
					ttl: 0,
					cleanable: true,
					query: "__metadata__",
				};
			} catch {
				return undefined;
			}
		}
	}

	async set(key: string, entry: CacheEntry): Promise<void> {
		const classified = classifyKey(key);
		if (!classified) return;

		const datasetDir = this.safePath(classified.domain, classified.datasetId);
		if (!datasetDir) return;

		// Freshness: write directly as _freshness.json (no sidecar)
		if (classified.type === "freshness") {
			await mkdir(datasetDir, { recursive: true });
			await writeFile(join(datasetDir, "_freshness.json"), entry.body);
			return;
		}

		// Metadata: write as _metadata.json (no sidecar)
		if (entry.query === "__metadata__") {
			await mkdir(datasetDir, { recursive: true });
			await writeFile(join(datasetDir, "_metadata.json"), entry.body);
			return;
		}

		// Regular query: write to queries/ subdir
		const queryDir = join(datasetDir, "queries");
		await mkdir(queryDir, { recursive: true });

		const ext = bodyExtension(entry.contentType);
		const bodyPath = join(queryDir, `${classified.hash}${ext}`);
		await writeFile(bodyPath, entry.body);

		const relativePath = `${classified.domain}/${classified.datasetId}/queries/${classified.hash}${ext}`;
		const meta: SidecarMeta = {
			key: classified.hash,
			path: relativePath,
			contentType: entry.contentType,
			...(Object.keys(entry.headers).length > 0 ? { headers: entry.headers } : {}),
			created: entry.created,
			datasetId: entry.datasetId,
			domain: entry.domain,
			rowsUpdatedAt: entry.rowsUpdatedAt,
			sizeBytes: entry.sizeBytes,
			ttl: entry.ttl,
			cleanable: entry.cleanable,
			...(entry.query !== undefined ? { query: entry.query } : {}),
		};

		await writeFile(join(queryDir, `${classified.hash}.meta.json`), JSON.stringify(meta, null, 2), "utf-8");
	}

	async has(key: string): Promise<boolean> {
		const classified = classifyKey(key);
		if (!classified) return false;

		const datasetDir = this.safePath(classified.domain, classified.datasetId);
		if (!datasetDir) return false;

		if (classified.type === "freshness") {
			try {
				await access(join(datasetDir, "_freshness.json"));
				return true;
			} catch {
				return false;
			}
		}

		// Check queries/ subdir
		const metaPath = join(datasetDir, "queries", `${classified.hash}.meta.json`);
		try {
			await access(metaPath);
			return true;
		} catch {
			// Check _metadata.json
			try {
				await access(join(datasetDir, "_metadata.json"));
				return true;
			} catch {
				return false;
			}
		}
	}

	async invalidate(key: string): Promise<boolean> {
		const classified = classifyKey(key);
		if (!classified) return false;

		const datasetDir = this.safePath(classified.domain, classified.datasetId);
		if (!datasetDir) return false;

		if (classified.type === "freshness") {
			try {
				await rm(join(datasetDir, "_freshness.json"), { force: true });
				return true;
			} catch {
				return false;
			}
		}

		const queryDir = join(datasetDir, "queries");
		const metaPath = join(queryDir, `${classified.hash}.meta.json`);

		try {
			const metaRaw = await readFile(metaPath, "utf-8");
			const meta: SidecarMeta = JSON.parse(metaRaw);
			const ext = bodyExtension(meta.contentType);
			await rm(join(queryDir, `${classified.hash}${ext}`), { force: true });
			await rm(metaPath, { force: true });
			return true;
		} catch {
			return false;
		}
	}

	async prune(options?: PruneOptions): Promise<PruneResult> {
		let removed = 0;
		let freedBytes = 0;
		const now = Date.now();

		let domainDirs: string[];
		try {
			domainDirs = await readdir(this.cacheDir);
		} catch {
			return { removed, freedBytes };
		}

		for (const domainName of domainDirs) {
			const domainPath = join(this.cacheDir, domainName);
			let datasetDirs: string[];
			try {
				datasetDirs = await readdir(domainPath);
			} catch {
				continue;
			}

			for (const datasetName of datasetDirs) {
				const queryDir = join(domainPath, datasetName, "queries");
				let files: string[];
				try {
					files = await readdir(queryDir);
				} catch {
					continue;
				}

				const metaFiles = files.filter((f) => f.endsWith(".meta.json"));
				for (const metaFile of metaFiles) {
					const metaPath = join(queryDir, metaFile);
					try {
						const metaRaw = await readFile(metaPath, "utf-8");
						const meta: SidecarMeta = JSON.parse(metaRaw);

						if (options?.cleanableOnly && !meta.cleanable) continue;

						let shouldRemove = false;
						if (options?.maxAge !== undefined) {
							if (options.maxAge === 0) {
								shouldRemove = true;
							} else {
								const age = (now - new Date(meta.created).getTime()) / 1000;
								if (age > options.maxAge) shouldRemove = true;
							}
						}

						if (shouldRemove) {
							const ext = bodyExtension(meta.contentType);
							const hash = metaFile.replace(".meta.json", "");
							const bodyPath = join(queryDir, `${hash}${ext}`);
							await rm(bodyPath, { force: true });
							await rm(metaPath, { force: true });
							removed++;
							freedBytes += meta.sizeBytes;
						}
					} catch {}
				}
			}
		}

		return { removed, freedBytes };
	}
}
