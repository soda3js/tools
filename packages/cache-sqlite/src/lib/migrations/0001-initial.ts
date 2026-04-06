import { SqlClient } from "@effect/sql";
import { Effect } from "effect";

export default Effect.gen(function* () {
	const sql = yield* SqlClient.SqlClient;

	yield* sql`
    CREATE TABLE IF NOT EXISTS responses (
      key TEXT PRIMARY KEY,
      body BLOB NOT NULL,
      content_type TEXT NOT NULL,
      headers TEXT NOT NULL,
      created TEXT NOT NULL,
      dataset_id TEXT NOT NULL,
      domain TEXT NOT NULL,
      rows_updated_at INTEGER,
      size_bytes INTEGER NOT NULL,
      ttl INTEGER NOT NULL DEFAULT 300,
      cleanable INTEGER NOT NULL DEFAULT 1
    )
  `;

	yield* sql`CREATE INDEX IF NOT EXISTS idx_responses_domain ON responses(domain, dataset_id)`;
	yield* sql`CREATE INDEX IF NOT EXISTS idx_responses_created ON responses(created)`;
	yield* sql`CREATE INDEX IF NOT EXISTS idx_responses_cleanable ON responses(cleanable)`;

	yield* sql`
    CREATE TABLE IF NOT EXISTS freshness (
      domain TEXT NOT NULL,
      dataset_id TEXT NOT NULL,
      rows_updated_at INTEGER NOT NULL,
      last_checked TEXT NOT NULL,
      ttl INTEGER NOT NULL DEFAULT 300,
      PRIMARY KEY (domain, dataset_id)
    )
  `;
});
