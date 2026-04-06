import { SqlClient } from "@effect/sql";
import type { CacheEntry, CacheStore, PruneOptions, PruneResult } from "@soda3js/protocol";
import { Effect } from "effect";

/**
 * CacheStore implementation backed by SQLite via Effect SQL.
 *
 * Each method builds an Effect that queries the SQLite `responses` table,
 * then runs it through a pre-wired `runSql` function that provides the
 * SqlClient context and converts to a Promise.
 */
export class SqliteCacheImpl implements CacheStore {
	private readonly runSql: <A>(effect: Effect.Effect<A, unknown, SqlClient.SqlClient>) => Promise<A>;

	constructor(runSql: <A>(effect: Effect.Effect<A, unknown, SqlClient.SqlClient>) => Promise<A>) {
		this.runSql = runSql;
	}

	get(key: string): Promise<CacheEntry | undefined> {
		return this.runSql(
			Effect.gen(function* () {
				const sql = yield* SqlClient.SqlClient;
				const rows = yield* sql`
					SELECT key, body, content_type, headers, created,
						dataset_id, domain, rows_updated_at, size_bytes, ttl, cleanable
					FROM responses
					WHERE key = ${key}
					LIMIT 1
				`;
				if (rows.length === 0) return undefined;
				const row = rows[0] as Record<string, unknown>;
				return rowToEntry(row);
			}),
		);
	}

	set(key: string, entry: CacheEntry): Promise<void> {
		return this.runSql(
			Effect.gen(function* () {
				const sql = yield* SqlClient.SqlClient;
				const headersJson = JSON.stringify(entry.headers);
				const cleanableInt = entry.cleanable ? 1 : 0;
				yield* sql`
					INSERT OR REPLACE INTO responses
						(key, body, content_type, headers, created,
						 dataset_id, domain, rows_updated_at, size_bytes, ttl, cleanable)
					VALUES
						(${key}, ${entry.body}, ${entry.contentType}, ${headersJson}, ${entry.created},
						 ${entry.datasetId}, ${entry.domain}, ${entry.rowsUpdatedAt}, ${entry.sizeBytes},
						 ${entry.ttl}, ${cleanableInt})
				`;
			}),
		);
	}

	has(key: string): Promise<boolean> {
		return this.runSql(
			Effect.gen(function* () {
				const sql = yield* SqlClient.SqlClient;
				const rows = yield* sql`
					SELECT 1 FROM responses WHERE key = ${key} LIMIT 1
				`;
				return rows.length > 0;
			}),
		);
	}

	invalidate(key: string): Promise<boolean> {
		return this.runSql(
			Effect.gen(function* () {
				const sql = yield* SqlClient.SqlClient;
				// Check existence first
				const rows = yield* sql`
					SELECT 1 FROM responses WHERE key = ${key} LIMIT 1
				`;
				if (rows.length === 0) return false;
				yield* sql`DELETE FROM responses WHERE key = ${key}`;
				return true;
			}),
		);
	}

	prune(options?: PruneOptions): Promise<PruneResult> {
		return this.runSql(
			Effect.gen(function* () {
				const sql = yield* SqlClient.SqlClient;

				if (options?.maxAge === undefined) {
					return { removed: 0, freedBytes: 0 };
				}

				const cutoff = new Date(Date.now() - options.maxAge * 1000).toISOString();

				let rows: ReadonlyArray<Record<string, unknown>>;
				if (options.cleanableOnly) {
					rows = (yield* sql`
						SELECT key, size_bytes FROM responses
						WHERE created < ${cutoff} AND cleanable = 1
					`) as ReadonlyArray<Record<string, unknown>>;
				} else {
					rows = (yield* sql`
						SELECT key, size_bytes FROM responses
						WHERE created < ${cutoff}
					`) as ReadonlyArray<Record<string, unknown>>;
				}

				if (rows.length === 0) {
					return { removed: 0, freedBytes: 0 };
				}

				let freedBytes = 0;
				for (const row of rows) {
					freedBytes += Number(row.size_bytes);
				}

				if (options.cleanableOnly) {
					yield* sql`
						DELETE FROM responses
						WHERE created < ${cutoff} AND cleanable = 1
					`;
				} else {
					yield* sql`
						DELETE FROM responses
						WHERE created < ${cutoff}
					`;
				}

				return { removed: rows.length, freedBytes };
			}),
		);
	}
}

function rowToEntry(row: Record<string, unknown>): CacheEntry {
	const bodyRaw = row.body;
	let body: Uint8Array;
	if (bodyRaw instanceof Uint8Array) {
		body = bodyRaw;
	} else if (Buffer.isBuffer(bodyRaw)) {
		body = new Uint8Array(bodyRaw);
	} else {
		body = new Uint8Array(bodyRaw as ArrayBuffer);
	}

	let headers: Record<string, string>;
	try {
		headers = JSON.parse(row.headers as string);
	} catch {
		headers = {};
	}

	return {
		body,
		contentType: row.content_type as string,
		headers,
		created: row.created as string,
		datasetId: row.dataset_id as string,
		domain: row.domain as string,
		rowsUpdatedAt: Number(row.rows_updated_at),
		sizeBytes: Number(row.size_bytes),
		ttl: Number(row.ttl),
		cleanable: Number(row.cleanable) === 1,
	};
}
