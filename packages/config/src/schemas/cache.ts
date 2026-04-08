import { Schema } from "effect";

export const DatasetFreshnessSchema = Schema.Struct({
	domain: Schema.String.annotations({ description: "Socrata portal domain" }),
	datasetId: Schema.String.annotations({ description: "Dataset identifier" }),
	rowsUpdatedAt: Schema.Number.annotations({ description: "Unix timestamp of last data update" }),
	lastChecked: Schema.String.annotations({ description: "ISO 8601 timestamp of last freshness check" }),
	ttl: Schema.Number.annotations({ description: "Time-to-live in seconds" }),
}).annotations({
	identifier: "DatasetFreshness",
	title: "DatasetFreshness",
	description: "Tracks when a dataset was last checked for freshness (_freshness.json)",
});

export const CacheEntryMetaSchema = Schema.Struct({
	key: Schema.String.annotations({ description: "Cache key hash" }),
	path: Schema.String.annotations({ description: "Relative path to cached response body" }),
	contentType: Schema.String.annotations({ description: "MIME type of cached response" }),
	created: Schema.String.annotations({ description: "ISO 8601 timestamp when entry was cached" }),
	datasetId: Schema.String.annotations({ description: "Dataset identifier" }),
	domain: Schema.String.annotations({ description: "Socrata portal domain" }),
	rowsUpdatedAt: Schema.Number.annotations({ description: "Unix timestamp of dataset version" }),
	sizeBytes: Schema.Number.annotations({ description: "Size of cached response body in bytes" }),
	ttl: Schema.Number.annotations({ description: "Time-to-live in seconds" }),
	cleanable: Schema.Boolean.annotations({ description: "Whether this entry can be pruned" }),
	query: Schema.optional(Schema.String).annotations({
		description: "SoQL query string that produced this response",
	}),
}).annotations({
	identifier: "CacheEntryMeta",
	title: "CacheEntryMeta",
	description: "Metadata sidecar for a cached API response (*.meta.json)",
});

export type DatasetFreshness = typeof DatasetFreshnessSchema.Type;
export type CacheEntryMeta = typeof CacheEntryMetaSchema.Type;
