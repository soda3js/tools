import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { Args, Command, Options } from "@effect/cli";
import { cacheDir } from "@soda3js/cache-fs/node";
import { Console, Effect, Option } from "effect";
import { createCache } from "../../lib/cache-factory.js";
import { readConfig } from "../../lib/config-store.js";
import { resolveDomain } from "../../lib/domain.js";

const statusCommand = Command.make("status", {}, () =>
	Effect.gen(function* () {
		yield* Console.log("Cache: filesystem (XDG)");
		yield* Console.log("Use 'soda3 cache clear' to clear all entries.");
	}),
).pipe(Command.withDescription("Show cache status"));

const inspectDatasetArg = Args.text({ name: "dataset-id" }).pipe(Args.withDescription("Dataset ID to inspect"));

const inspectProfileOption = Options.text("profile").pipe(
	Options.withDescription("Scope to a specific profile"),
	Options.optional,
);

interface SidecarMeta {
	key: string;
	path: string;
	query?: string;
	contentType: string;
	created: string;
	sizeBytes: number;
}

async function readSidecars(dir: string): Promise<SidecarMeta[]> {
	try {
		const files = await readdir(dir);
		const sidecars: SidecarMeta[] = [];
		for (const file of files) {
			if (!file.endsWith(".meta.json")) continue;
			try {
				const raw = await readFile(join(dir, file), "utf-8");
				sidecars.push(JSON.parse(raw) as SidecarMeta);
			} catch {
				// Skip malformed
			}
		}
		return sidecars;
	} catch {
		return [];
	}
}

function formatAge(created: string): string {
	const seconds = Math.floor((Date.now() - new Date(created).getTime()) / 1000);
	if (seconds < 60) return `${seconds}s ago`;
	if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
	if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
	return `${Math.floor(seconds / 86400)}d ago`;
}

function formatBytes(bytes: number): string {
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
	return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const inspectCommand = Command.make(
	"inspect",
	{ datasetId: inspectDatasetArg, profile: inspectProfileOption },
	({ datasetId, profile }) =>
		Effect.gen(function* () {
			const config = yield* Effect.promise(() => readConfig());
			const resolved = resolveDomain(config, {
				...(profile._tag === "Some" ? { profile: profile.value } : {}),
			});
			const domain = resolved.domain;

			// Freshness is stored at domain/dataset/_freshness.json
			const freshnessPath = join(cacheDir(), domain, datasetId, "_freshness.json");
			const freshness = yield* Effect.tryPromise(() => readFile(freshnessPath, "utf-8")).pipe(
				Effect.map((raw) => JSON.parse(raw) as { rowsUpdatedAt: number; lastChecked: string; ttl: number }),
				Effect.catchAll(() => Effect.succeed(undefined)),
			);

			yield* Console.log(`Dataset: ${datasetId} (${domain})`);
			if (freshness) {
				const updated = new Date(freshness.rowsUpdatedAt * 1000).toISOString();
				const age = formatAge(freshness.lastChecked);
				yield* Console.log(`Freshness: rowsUpdatedAt ${updated} (checked ${age}, TTL ${freshness.ttl}s)`);
			} else {
				yield* Console.log("Freshness: not cached");
			}

			// Read sidecars from queries/ subdir
			const queryDir = join(cacheDir(), domain, datasetId, "queries");
			const sidecars = yield* Effect.promise(() => readSidecars(queryDir));

			if (sidecars.length === 0) {
				yield* Console.log("\nNo cached queries.");
				return;
			}

			yield* Console.log("\nCached queries:");
			yield* Console.log("  Key        Format  Size       Age        Query");
			for (const meta of sidecars) {
				const keyShort = meta.key.slice(0, 8);
				const ext = meta.contentType.includes("csv") ? "csv" : "json";
				const size = formatBytes(meta.sizeBytes).padEnd(10);
				const age = formatAge(meta.created).padEnd(10);
				const query = meta.query ?? "(unknown)";
				yield* Console.log(`  ${keyShort}   ${ext.padEnd(6)}  ${size} ${age} ${query}`);
			}
		}),
).pipe(Command.withDescription("Inspect cached entries for a dataset"));

const clearProfileOption = Options.text("profile").pipe(
	Options.withDescription("Clear entries for a specific profile"),
	Options.optional,
);

const clearDatasetOption = Options.text("dataset").pipe(
	Options.withDescription("Clear entries for a specific dataset"),
	Options.optional,
);

const clearCommand = Command.make("clear", { profile: clearProfileOption, dataset: clearDatasetOption }, () =>
	Effect.gen(function* () {
		const cache = createCache();
		const result = yield* Effect.promise(() => cache.prune({ maxAge: 0 }));
		yield* Console.log(`Cleared ${result.removed} entries (${result.freedBytes} bytes freed)`);
	}),
).pipe(Command.withDescription("Clear cached data"));

const maxAgeOption = Options.text("max-age").pipe(
	Options.withDescription("Remove entries older than this duration (e.g., 7d, 24h)"),
	Options.optional,
);

function parseDuration(input: string): number {
	const match = input.match(/^(\d+)(s|m|h|d)$/);
	if (!match) return 300;
	const value = Number.parseInt(match[1], 10);
	switch (match[2]) {
		case "s":
			return value;
		case "m":
			return value * 60;
		case "h":
			return value * 3600;
		case "d":
			return value * 86400;
		default:
			return value;
	}
}

const pruneCommand = Command.make("prune", { maxAge: maxAgeOption }, ({ maxAge }) =>
	Effect.gen(function* () {
		const cache = createCache();
		const maxAgeSec = Option.isSome(maxAge) ? parseDuration(maxAge.value) : undefined;
		const result = yield* Effect.promise(() =>
			cache.prune({
				...(maxAgeSec !== undefined ? { maxAge: maxAgeSec } : {}),
				cleanableOnly: true,
			}),
		);
		yield* Console.log(`Pruned ${result.removed} entries (${result.freedBytes} bytes freed)`);
	}),
).pipe(Command.withDescription("Remove stale cache entries"));

export const cacheCommand = Command.make("cache", {}).pipe(
	Command.withDescription("Manage the response cache"),
	Command.withSubcommands([statusCommand, inspectCommand, clearCommand, pruneCommand]),
);
