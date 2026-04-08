import { SqliteClient } from "@effect/sql-sqlite-node";
import { Soda3Config } from "@soda3js/config";
import { Layer } from "effect";
import type { SqliteCache, SqliteCacheOptions } from "./index.js";
import { SqliteCacheLive } from "./index.js";

export { SqliteCache, type SqliteCacheOptions } from "./index.js";

export const NodeSqliteCacheLive = (options?: SqliteCacheOptions & { dbPath?: string }): Layer.Layer<SqliteCache> => {
	const dbPath = options?.dbPath ?? `${Soda3Config.cacheDir()}/cache.db`;
	const clientLayer = SqliteClient.layer({ filename: dbPath });
	return SqliteCacheLive(options).pipe(Layer.provide(clientLayer), Layer.orDie);
};
