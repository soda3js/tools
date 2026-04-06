import { SqlClient } from "@effect/sql";
import type { CacheStore } from "@soda3js/protocol";
import { Context, Effect, Layer } from "effect";
import migration0001 from "./lib/migrations/0001-initial.js";
import { SqliteCacheImpl } from "./lib/sqlite-cache.js";

export class SqliteCache extends Context.Tag("@soda3js/cache-sqlite/SqliteCache")<SqliteCache, CacheStore>() {}

export interface SqliteCacheOptions {
	defaultTtl?: number;
}

export const SqliteCacheLive = (_options?: SqliteCacheOptions): Layer.Layer<SqliteCache, never, SqlClient.SqlClient> =>
	Layer.effect(
		SqliteCache,
		Effect.gen(function* () {
			const sql = yield* SqlClient.SqlClient;

			// Run migration before any queries; failure is fatal (die on SqlError)
			yield* migration0001.pipe(Effect.provideService(SqlClient.SqlClient, sql), Effect.orDie);

			// Build runSql: provides the SqlClient to each effect and runs it as a Promise
			const runSql = <A>(effect: Effect.Effect<A, unknown, SqlClient.SqlClient>): Promise<A> =>
				Effect.runPromise(effect.pipe(Effect.provideService(SqlClient.SqlClient, sql)));

			return new SqliteCacheImpl(runSql);
		}),
	);

export type {
	CacheEntry,
	CacheKeyInput,
	CacheStore,
	DatasetFreshness,
	PruneOptions,
	PruneResult,
} from "@soda3js/protocol";
