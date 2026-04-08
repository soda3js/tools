# @soda3js/config Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create `@soda3js/config` — a shared package for XDG directory resolution, TOML config loading, and JSON Schema generation, then migrate CLI, MCP, cache-fs, and cache-sqlite to use it.

**Architecture:** `Soda3Config` class with static XDG methods, immutable config instances via `load()`/`loadSync()`/`empty()` factories, Effect Schema definitions for runtime validation and JSON Schema generation. The generation script writes schemas to `website/public/schemas/` for hosting at `soda3js.tools`.

**Tech Stack:** TypeScript, Effect (Schema, JSONSchema), smol-toml, @savvy-web/rslib-builder

---

## File Map

### New Files

- `packages/config/package.json` -- package manifest
- `packages/config/rslib.config.ts` -- build config
- `packages/config/tsconfig.json` -- TypeScript config
- `packages/config/turbo.json` -- turbo task config (includes generate:json-schema)
- `packages/config/src/index.ts` -- public API re-exports
- `packages/config/src/lib/xdg.ts` -- XDG Base Directory functions
- `packages/config/src/lib/soda3-config.ts` -- Soda3Config class
- `packages/config/src/schemas/config.ts` -- Effect Schemas: Config, Profile, CacheConfig
- `packages/config/src/schemas/cache.ts` -- Effect Schemas: CacheEntryMeta, DatasetFreshness
- `packages/config/lib/scripts/generate-json-schema.ts` -- JSON Schema generator
- `packages/config/__test__/lib/xdg.test.ts` -- XDG resolution tests
- `packages/config/__test__/lib/soda3-config.test.ts` -- class tests
- `packages/config/__test__/schemas/config.test.ts` -- schema validation tests
- `website/public/schemas/config.json` -- generated
- `website/public/schemas/cache-entry.json` -- generated
- `website/public/schemas/freshness.json` -- generated

### Modified Files

- `.changeset/config.json` -- add @soda3js/config to fixed group
- `vitest.config.ts` -- add workspace alias for @soda3js/config
- `packages/cli/package.json` -- add @soda3js/config dep
- `packages/cli/src/lib/config-store.ts` -- DELETE
- `packages/cli/src/lib/domain.ts` -- update import
- `packages/cli/src/lib/cache-factory.ts` -- update import
- `packages/cli/src/cli/commands/config.ts` -- rewrite to use Soda3Config
- `packages/cli/src/cli/commands/query.ts` -- update import
- `packages/cli/src/cli/commands/meta.ts` -- update import
- `packages/cli/src/cli/commands/export.ts` -- update import
- `packages/cli/src/cli/commands/cache.ts` -- update import
- `packages/mcp/package.json` -- add @soda3js/config dep, remove smol-toml
- `packages/mcp/src/lib/config.ts` -- rewrite to use Soda3Config
- `packages/mcp/src/index.ts` -- update loadConfig call
- `packages/cache-fs/package.json` -- add @soda3js/config dep
- `packages/cache-fs/src/lib/xdg.ts` -- DELETE
- `packages/cache-fs/src/index.ts` -- update import
- `packages/cache-fs/src/node.ts` -- update re-export
- `packages/cache-fs/src/bun.ts` -- update re-export
- `packages/cache-sqlite/package.json` -- add @soda3js/config dep
- `packages/cache-sqlite/src/lib/xdg.ts` -- DELETE
- `packages/cache-sqlite/src/node.ts` -- update import

---

### Task 1: Package Scaffold

**Files:**
- Create: `packages/config/package.json`
- Create: `packages/config/rslib.config.ts`
- Create: `packages/config/tsconfig.json`
- Create: `packages/config/turbo.json`
- Create: `packages/config/src/index.ts`

- [ ] **Step 1: Create package.json**

```json
{
	"name": "@soda3js/config",
	"version": "0.0.0",
	"private": true,
	"description": "XDG directory resolution, TOML config loading, and JSON Schema generation for soda3js",
	"repository": {
		"type": "git",
		"url": "git+https://github.com/soda3js/tools.git",
		"directory": "packages/config"
	},
	"license": "MIT",
	"type": "module",
	"exports": {
		".": "./src/index.ts"
	},
	"scripts": {
		"build": "turbo run build:dev build:prod --log-order=grouped",
		"build:dev": "rslib build --config-loader native --env-mode dev",
		"build:prod": "rslib build --config-loader native --env-mode npm",
		"prepare": "turbo run build:dev --output-logs=errors-only",
		"types:check": "tsgo --noEmit",
		"generate:json-schema": "tsx lib/scripts/generate-json-schema.ts"
	},
	"dependencies": {
		"effect": "catalog:silk",
		"smol-toml": ">=1.6.1"
	},
	"devDependencies": {
		"@savvy-web/rslib-builder": "^0.19.1",
		"@types/node": "catalog:silk"
	},
	"publishConfig": {
		"access": "public",
		"directory": "dist/dev",
		"linkDirectory": true,
		"targets": [
			{
				"protocol": "npm",
				"registry": "https://npm.pkg.github.com/",
				"directory": "dist/npm",
				"access": "public",
				"provenance": true
			},
			{
				"protocol": "npm",
				"registry": "https://registry.npmjs.org/",
				"directory": "dist/npm",
				"access": "public",
				"provenance": true
			}
		]
	}
}
```

- [ ] **Step 2: Create rslib.config.ts**

```typescript
import { NodeLibraryBuilder } from "@savvy-web/rslib-builder";

export default NodeLibraryBuilder.create({
	externals: ["effect", "smol-toml"],
	apiModel: {
		suppressWarnings: [{ messageId: "ae-forgotten-export", pattern: "_base" }],
		tsdoc: {
			tagDefinitions: [{ tagName: "@since", syntaxKind: "block" }],
		},
	},
	transform({ pkg }) {
		delete pkg.devDependencies;
		delete pkg.publishConfig;
		delete pkg.packageManager;
		delete pkg.devEngines;
		delete pkg.scripts;
		return pkg;
	},
});
```

- [ ] **Step 3: Create tsconfig.json**

```json
{ "extends": "../../tsconfig.json" }
```

- [ ] **Step 4: Create turbo.json**

```json
{
	"extends": ["//"],
	"tasks": {
		"generate:json-schema": {
			"cache": true,
			"inputs": [
				"lib/scripts/generate-json-schema.ts",
				"src/schemas/config.ts",
				"src/schemas/cache.ts"
			],
			"outputLogs": "new-only",
			"outputs": [
				"$TURBO_ROOT$/website/public/schemas/config.json",
				"$TURBO_ROOT$/website/public/schemas/cache-entry.json",
				"$TURBO_ROOT$/website/public/schemas/freshness.json"
			]
		},
		"build:dev": {
			"cache": true,
			"dependsOn": ["types:check"],
			"outputLogs": "errors-only",
			"outputs": ["dist/dev/**", ".rslib/declarations/dev/**"]
		},
		"build:prod": {
			"cache": true,
			"dependsOn": ["types:check"],
			"outputs": ["dist/npm/**", ".rslib/declarations/npm/**"]
		},
		"types:check": {
			"cache": true,
			"dependsOn": ["generate:json-schema"],
			"outputLogs": "errors-only",
			"outputs": ["dist/.tsbuildinfo.lib"]
		}
	}
}
```

- [ ] **Step 5: Create placeholder index.ts**

```typescript
// packages/config/src/index.ts
export {};
```

- [ ] **Step 6: Run pnpm install**

Run: `pnpm install`
Expected: New package linked in workspace

- [ ] **Step 7: Commit**

```
git add packages/config/package.json packages/config/rslib.config.ts packages/config/tsconfig.json packages/config/turbo.json packages/config/src/index.ts pnpm-lock.yaml
git commit -m "feat(config): scaffold @soda3js/config package

Package manifest, build config, turbo task config with JSON Schema
generation, and placeholder entry point.

Signed-off-by: C. Spencer Beggs <spencer@savvyweb.systems>"
```

---

### Task 2: XDG Base Directory Resolution

**Files:**
- Create: `packages/config/src/lib/xdg.ts`
- Create: `packages/config/__test__/lib/xdg.test.ts`

- [ ] **Step 1: Write failing tests for XDG functions**

```typescript
// packages/config/__test__/lib/xdg.test.ts
import { homedir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { cacheDir, configDir, configPath, dataDir, runtimeDir, stateDir } from "../../src/lib/xdg.js";

describe("XDG path resolution", () => {
	const originalEnv = { ...process.env };

	afterEach(() => {
		process.env = { ...originalEnv };
	});

	describe("configDir", () => {
		it("uses XDG_CONFIG_HOME when set", () => {
			process.env.XDG_CONFIG_HOME = "/custom/config";
			expect(configDir()).toBe("/custom/config/soda3js");
		});

		it("falls back to ~/.config when XDG_CONFIG_HOME is not set", () => {
			delete process.env.XDG_CONFIG_HOME;
			expect(configDir()).toBe(join(homedir(), ".config", "soda3js"));
		});

		it("ignores empty string XDG_CONFIG_HOME", () => {
			process.env.XDG_CONFIG_HOME = "";
			expect(configDir()).toBe(join(homedir(), ".config", "soda3js"));
		});
	});

	describe("cacheDir", () => {
		it("uses XDG_CACHE_HOME when set", () => {
			process.env.XDG_CACHE_HOME = "/custom/cache";
			expect(cacheDir()).toBe("/custom/cache/soda3js");
		});

		it("falls back to ~/.cache when XDG_CACHE_HOME is not set", () => {
			delete process.env.XDG_CACHE_HOME;
			expect(cacheDir()).toBe(join(homedir(), ".cache", "soda3js"));
		});
	});

	describe("stateDir", () => {
		it("uses XDG_STATE_HOME when set", () => {
			process.env.XDG_STATE_HOME = "/custom/state";
			expect(stateDir()).toBe("/custom/state/soda3js");
		});

		it("falls back to ~/.local/state when not set", () => {
			delete process.env.XDG_STATE_HOME;
			expect(stateDir()).toBe(join(homedir(), ".local", "state", "soda3js"));
		});
	});

	describe("dataDir", () => {
		it("uses XDG_DATA_HOME when set", () => {
			process.env.XDG_DATA_HOME = "/custom/data";
			expect(dataDir()).toBe("/custom/data/soda3js");
		});

		it("falls back to ~/.local/share when not set", () => {
			delete process.env.XDG_DATA_HOME;
			expect(dataDir()).toBe(join(homedir(), ".local", "share", "soda3js"));
		});
	});

	describe("runtimeDir", () => {
		it("uses XDG_RUNTIME_DIR when set", () => {
			process.env.XDG_RUNTIME_DIR = "/run/user/1000";
			expect(runtimeDir()).toBe("/run/user/1000/soda3js");
		});

		it("returns undefined when XDG_RUNTIME_DIR is not set", () => {
			delete process.env.XDG_RUNTIME_DIR;
			expect(runtimeDir()).toBeUndefined();
		});
	});

	describe("configPath", () => {
		it("returns config.toml inside configDir", () => {
			process.env.XDG_CONFIG_HOME = "/custom/config";
			expect(configPath()).toBe("/custom/config/soda3js/config.toml");
		});
	});
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm vitest run packages/config/__test__/lib/xdg.test.ts`
Expected: FAIL -- module not found

- [ ] **Step 3: Implement XDG functions**

```typescript
// packages/config/src/lib/xdg.ts
import { homedir } from "node:os";
import { join } from "node:path";

const APP_NAME = "soda3js";

export function configDir(): string {
	const base = process.env.XDG_CONFIG_HOME || join(homedir(), ".config");
	return join(base, APP_NAME);
}

export function cacheDir(): string {
	const base = process.env.XDG_CACHE_HOME || join(homedir(), ".cache");
	return join(base, APP_NAME);
}

export function stateDir(): string {
	const base = process.env.XDG_STATE_HOME || join(homedir(), ".local", "state");
	return join(base, APP_NAME);
}

export function dataDir(): string {
	const base = process.env.XDG_DATA_HOME || join(homedir(), ".local", "share");
	return join(base, APP_NAME);
}

export function runtimeDir(): string | undefined {
	const base = process.env.XDG_RUNTIME_DIR;
	if (!base) return undefined;
	return join(base, APP_NAME);
}

export function configPath(): string {
	return join(configDir(), "config.toml");
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm vitest run packages/config/__test__/lib/xdg.test.ts`
Expected: PASS (11 tests)

- [ ] **Step 5: Commit**

```
git add packages/config/src/lib/xdg.ts packages/config/__test__/lib/xdg.test.ts
git commit -m "feat(config): add XDG Base Directory resolution

Six functions covering all five XDG directories plus configPath().
runtimeDir() returns undefined when XDG_RUNTIME_DIR is unset per spec.

Signed-off-by: C. Spencer Beggs <spencer@savvyweb.systems>"
```

---

### Task 3: Effect Schema Definitions

**Files:**
- Create: `packages/config/src/schemas/config.ts`
- Create: `packages/config/src/schemas/cache.ts`
- Create: `packages/config/__test__/schemas/config.test.ts`

- [ ] **Step 1: Write failing schema validation tests**

```typescript
// packages/config/__test__/schemas/config.test.ts
import { Schema } from "effect";
import { describe, expect, it } from "vitest";
import { CacheConfigSchema, ConfigSchema, ProfileSchema } from "../../src/schemas/config.js";
import { CacheEntryMetaSchema, DatasetFreshnessSchema } from "../../src/schemas/cache.js";

describe("ProfileSchema", () => {
	const decode = Schema.decodeUnknownSync(ProfileSchema);

	it("accepts valid profile", () => {
		const result = decode({ domain: "data.sfgov.org" });
		expect(result.domain).toBe("data.sfgov.org");
	});

	it("accepts profile with token and cache", () => {
		const result = decode({
			domain: "data.sfgov.org",
			token: "abc123",
			cache: { enabled: true, ttl: 3600 },
		});
		expect(result.token).toBe("abc123");
		expect(result.cache?.enabled).toBe(true);
	});

	it("rejects profile missing domain", () => {
		expect(() => decode({ token: "abc" })).toThrow();
	});

	it("rejects non-string domain", () => {
		expect(() => decode({ domain: 123 })).toThrow();
	});
});

describe("ConfigSchema", () => {
	const decode = Schema.decodeUnknownSync(ConfigSchema);

	it("accepts valid config", () => {
		const result = decode({
			format: "table",
			default_profile: "nyc",
			profiles: {
				nyc: { domain: "data.cityofnewyork.us" },
				sf: { domain: "data.sfgov.org", token: "xyz" },
			},
		});
		expect(result.default_profile).toBe("nyc");
		expect(Object.keys(result.profiles)).toHaveLength(2);
	});

	it("accepts empty profiles", () => {
		const result = decode({ profiles: {} });
		expect(Object.keys(result.profiles)).toHaveLength(0);
	});

	it("rejects profile with invalid shape", () => {
		expect(() => decode({ profiles: { bad: { name: "wrong" } } })).toThrow();
	});
});

describe("CacheEntryMetaSchema", () => {
	const decode = Schema.decodeUnknownSync(CacheEntryMetaSchema);

	it("accepts valid cache entry metadata", () => {
		const result = decode({
			key: "abc123",
			path: "data.sfgov.org/yitu-d5am/queries/abc123.json",
			contentType: "application/json",
			created: "2026-04-07T20:47:34.505Z",
			datasetId: "yitu-d5am",
			domain: "data.sfgov.org",
			rowsUpdatedAt: 1771634692,
			sizeBytes: 1917,
			ttl: 300,
			cleanable: true,
			query: "$limit=3",
		});
		expect(result.key).toBe("abc123");
		expect(result.query).toBe("$limit=3");
	});

	it("accepts entry without optional query", () => {
		const result = decode({
			key: "abc123",
			path: "path.json",
			contentType: "application/json",
			created: "2026-04-07T00:00:00Z",
			datasetId: "test-1234",
			domain: "example.com",
			rowsUpdatedAt: 0,
			sizeBytes: 0,
			ttl: 300,
			cleanable: false,
		});
		expect(result.query).toBeUndefined();
	});
});

describe("DatasetFreshnessSchema", () => {
	const decode = Schema.decodeUnknownSync(DatasetFreshnessSchema);

	it("accepts valid freshness record", () => {
		const result = decode({
			domain: "data.sfgov.org",
			datasetId: "yitu-d5am",
			rowsUpdatedAt: 1771634692,
			lastChecked: "2026-04-08T00:33:42.879Z",
			ttl: 300,
		});
		expect(result.domain).toBe("data.sfgov.org");
		expect(result.ttl).toBe(300);
	});
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm vitest run packages/config/__test__/schemas/config.test.ts`
Expected: FAIL -- module not found

- [ ] **Step 3: Implement config schemas**

```typescript
// packages/config/src/schemas/config.ts
import { Schema } from "effect";

export const CacheConfigSchema = Schema.Struct({
	enabled: Schema.optional(Schema.Boolean).annotations({
		description: "Enable response caching",
	}),
	ttl: Schema.optional(Schema.Number).annotations({
		description: "Cache time-to-live in seconds",
	}),
}).annotations({
	identifier: "CacheConfig",
	description: "Cache behavior settings",
});

export const ProfileSchema = Schema.Struct({
	domain: Schema.String.annotations({
		description: "Socrata portal domain (e.g. data.sfgov.org)",
	}),
	token: Schema.optional(Schema.String).annotations({
		description: "Socrata app token for this portal",
	}),
	cache: Schema.optional(CacheConfigSchema).annotations({
		description: "Per-profile cache override",
	}),
}).annotations({
	identifier: "Profile",
	description: "Named portal configuration",
});

export const ConfigSchema = Schema.Struct({
	format: Schema.optional(Schema.String).annotations({
		description: "Default output format (table, json, ndjson, csv)",
	}),
	default_profile: Schema.optional(Schema.String).annotations({
		description: "Name of the active profile",
	}),
	cache: Schema.optional(CacheConfigSchema).annotations({
		description: "Global cache settings",
	}),
	profiles: Schema.Record({ key: Schema.String, value: ProfileSchema }).annotations({
		description: "Named portal profiles",
	}),
}).annotations({
	identifier: "Soda3Config",
	title: "Soda3Config",
	description: "Configuration file for soda3js tools",
});

export type CacheConfig = typeof CacheConfigSchema.Type;
export type Profile = typeof ProfileSchema.Type;
export type Config = typeof ConfigSchema.Type;
```

- [ ] **Step 4: Implement cache schemas**

```typescript
// packages/config/src/schemas/cache.ts
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
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `pnpm vitest run packages/config/__test__/schemas/config.test.ts`
Expected: PASS (8 tests)

- [ ] **Step 6: Commit**

```
git add packages/config/src/schemas/ packages/config/__test__/schemas/
git commit -m "feat(config): add Effect Schema definitions for config and cache files

Config, Profile, CacheConfig schemas with annotations for JSON Schema
generation. CacheEntryMeta and DatasetFreshness mirror protocol types
for on-disk cache file validation.

Signed-off-by: C. Spencer Beggs <spencer@savvyweb.systems>"
```

---

### Task 4: Soda3Config Class

**Files:**
- Create: `packages/config/src/lib/soda3-config.ts`
- Create: `packages/config/__test__/lib/soda3-config.test.ts`
- Modify: `packages/config/src/index.ts`

- [ ] **Step 1: Write failing tests for Soda3Config**

```typescript
// packages/config/__test__/lib/soda3-config.test.ts
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { Soda3Config } from "../../src/lib/soda3-config.js";

describe("Soda3Config", () => {
	let tempDir: string;

	beforeEach(async () => {
		tempDir = await mkdtemp(join(tmpdir(), "soda3-config-"));
	});

	afterEach(async () => {
		await rm(tempDir, { recursive: true, force: true });
	});

	describe("static XDG methods", () => {
		it("configDir delegates to xdg module", () => {
			expect(Soda3Config.configDir()).toContain("soda3js");
		});

		it("cacheDir delegates to xdg module", () => {
			expect(Soda3Config.cacheDir()).toContain("soda3js");
		});

		it("configPath returns config.toml path", () => {
			expect(Soda3Config.configPath()).toMatch(/config\.toml$/);
		});
	});

	describe("empty", () => {
		it("returns instance with no profiles", () => {
			const config = Soda3Config.empty();
			expect(config.profiles).toEqual({});
			expect(config.defaultProfile).toBeUndefined();
			expect(config.format).toBeUndefined();
			expect(config.cache).toBeUndefined();
		});
	});

	describe("load", () => {
		it("reads and parses valid TOML", async () => {
			const toml = `
format = "table"
default_profile = "sf"

[profiles.sf]
domain = "data.sfgov.org"
token = "abc123"

[profiles.nyc]
domain = "data.cityofnewyork.us"
`;
			const filePath = join(tempDir, "config.toml");
			await writeFile(filePath, toml, "utf-8");

			const config = await Soda3Config.load(filePath);
			expect(config.format).toBe("table");
			expect(config.defaultProfile).toBe("sf");
			expect(config.listProfiles()).toEqual(["sf", "nyc"]);
			expect(config.getProfile("sf")?.token).toBe("abc123");
		});

		it("returns empty config on ENOENT", async () => {
			const config = await Soda3Config.load(join(tempDir, "nonexistent.toml"));
			expect(config.profiles).toEqual({});
		});

		it("throws on TOML parse error", async () => {
			const filePath = join(tempDir, "bad.toml");
			await writeFile(filePath, "not = [valid toml", "utf-8");
			await expect(Soda3Config.load(filePath)).rejects.toThrow();
		});
	});

	describe("loadSync", () => {
		it("reads and parses valid TOML synchronously", async () => {
			const filePath = join(tempDir, "config.toml");
			await writeFile(filePath, '[profiles.sf]\ndomain = "data.sfgov.org"\n', "utf-8");

			const config = Soda3Config.loadSync(filePath);
			expect(config.getProfile("sf")?.domain).toBe("data.sfgov.org");
		});

		it("returns empty config on ENOENT", () => {
			const config = Soda3Config.loadSync(join(tempDir, "nope.toml"));
			expect(config.profiles).toEqual({});
		});
	});

	describe("immutable operations", () => {
		it("withProfile returns new instance", () => {
			const a = Soda3Config.empty();
			const b = a.withProfile("sf", { domain: "data.sfgov.org" });
			expect(a.listProfiles()).toEqual([]);
			expect(b.listProfiles()).toEqual(["sf"]);
		});

		it("withDefault sets defaultProfile", () => {
			const config = Soda3Config.empty()
				.withProfile("sf", { domain: "data.sfgov.org" })
				.withDefault("sf");
			expect(config.defaultProfile).toBe("sf");
		});

		it("withFormat sets format", () => {
			const config = Soda3Config.empty().withFormat("json");
			expect(config.format).toBe("json");
		});

		it("withCache sets cache config", () => {
			const config = Soda3Config.empty().withCache({ enabled: true, ttl: 600 });
			expect(config.cache?.enabled).toBe(true);
			expect(config.cache?.ttl).toBe(600);
		});

		it("getProfile returns undefined for missing profile", () => {
			expect(Soda3Config.empty().getProfile("nope")).toBeUndefined();
		});
	});

	describe("serialization", () => {
		it("toTOML round-trips through parse", async () => {
			const config = Soda3Config.empty()
				.withFormat("table")
				.withDefault("sf")
				.withProfile("sf", { domain: "data.sfgov.org", token: "abc" })
				.withCache({ enabled: true, ttl: 3600 });

			const toml = config.toTOML();
			const filePath = join(tempDir, "roundtrip.toml");
			await writeFile(filePath, toml, "utf-8");
			const reloaded = await Soda3Config.load(filePath);

			expect(reloaded.format).toBe("table");
			expect(reloaded.defaultProfile).toBe("sf");
			expect(reloaded.getProfile("sf")?.token).toBe("abc");
			expect(reloaded.cache?.enabled).toBe(true);
		});

		it("toTOML omits undefined optional fields", () => {
			const toml = Soda3Config.empty()
				.withProfile("sf", { domain: "data.sfgov.org" })
				.toTOML();
			expect(toml).not.toContain("format");
			expect(toml).not.toContain("default_profile");
			expect(toml).not.toContain("cache");
		});

		it("save creates parent directories", async () => {
			const filePath = join(tempDir, "nested", "deep", "config.toml");
			const config = Soda3Config.empty().withProfile("sf", { domain: "data.sfgov.org" });
			await config.save(filePath);
			const contents = await readFile(filePath, "utf-8");
			expect(contents).toContain("data.sfgov.org");
		});
	});
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm vitest run packages/config/__test__/lib/soda3-config.test.ts`
Expected: FAIL -- module not found

- [ ] **Step 3: Implement Soda3Config class**

```typescript
// packages/config/src/lib/soda3-config.ts
import { readFileSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { parse, stringify } from "smol-toml";
import type { CacheConfig, Config, Profile } from "../schemas/config.js";
import { cacheDir, configDir, configPath, dataDir, runtimeDir, stateDir } from "./xdg.js";

export class Soda3Config {
	readonly profiles: Readonly<Record<string, Profile>>;
	readonly defaultProfile: string | undefined;
	readonly format: string | undefined;
	readonly cache: CacheConfig | undefined;

	private constructor(data: {
		profiles: Record<string, Profile>;
		defaultProfile?: string;
		format?: string;
		cache?: CacheConfig;
	}) {
		this.profiles = data.profiles;
		this.defaultProfile = data.defaultProfile;
		this.format = data.format;
		this.cache = data.cache;
	}

	// --- Static: XDG directories ---

	static configDir = configDir;
	static cacheDir = cacheDir;
	static stateDir = stateDir;
	static dataDir = dataDir;
	static runtimeDir = runtimeDir;
	static configPath = configPath;

	// --- Static: factories ---

	static empty(): Soda3Config {
		return new Soda3Config({ profiles: {} });
	}

	static async load(path?: string): Promise<Soda3Config> {
		const filePath = path ?? configPath();
		try {
			const contents = await readFile(filePath, "utf-8");
			return Soda3Config.fromTOML(contents);
		} catch (err: unknown) {
			if (isNodeError(err) && err.code === "ENOENT") {
				return Soda3Config.empty();
			}
			throw err;
		}
	}

	static loadSync(path?: string): Soda3Config {
		const filePath = path ?? configPath();
		try {
			const contents = readFileSync(filePath, "utf-8");
			return Soda3Config.fromTOML(contents);
		} catch (err: unknown) {
			if (isNodeError(err) && err.code === "ENOENT") {
				return Soda3Config.empty();
			}
			throw err;
		}
	}

	// --- Instance: queries ---

	getProfile(name: string): Profile | undefined {
		return this.profiles[name];
	}

	listProfiles(): string[] {
		return Object.keys(this.profiles);
	}

	// --- Instance: immutable builders ---

	withProfile(name: string, profile: Profile): Soda3Config {
		return new Soda3Config({
			profiles: { ...this.profiles, [name]: profile },
			defaultProfile: this.defaultProfile,
			format: this.format,
			cache: this.cache,
		});
	}

	withDefault(name: string): Soda3Config {
		return new Soda3Config({
			profiles: { ...this.profiles },
			defaultProfile: name,
			format: this.format,
			cache: this.cache,
		});
	}

	withFormat(format: string): Soda3Config {
		return new Soda3Config({
			profiles: { ...this.profiles },
			defaultProfile: this.defaultProfile,
			format,
			cache: this.cache,
		});
	}

	withCache(cache: CacheConfig): Soda3Config {
		return new Soda3Config({
			profiles: { ...this.profiles },
			defaultProfile: this.defaultProfile,
			format: this.format,
			cache,
		});
	}

	// --- Instance: serialization ---

	toTOML(): string {
		return stringify(toTomlShape(this));
	}

	async save(path?: string): Promise<void> {
		const filePath = path ?? configPath();
		await mkdir(dirname(filePath), { recursive: true });
		await writeFile(filePath, this.toTOML(), "utf-8");
	}

	// --- Private ---

	private static fromTOML(contents: string): Soda3Config {
		const parsed = parse(contents) as Record<string, unknown>;
		const profiles: Record<string, Profile> = {};

		if (typeof parsed.profiles === "object" && parsed.profiles !== null) {
			for (const [name, raw] of Object.entries(parsed.profiles as Record<string, unknown>)) {
				if (typeof raw !== "object" || raw === null) continue;
				const rawProfile = raw as Record<string, unknown>;
				if (typeof rawProfile.domain !== "string") continue;
				const profile: Profile = { domain: rawProfile.domain };
				if (typeof rawProfile.token === "string") {
					(profile as Record<string, unknown>).token = rawProfile.token;
				}
				if (typeof rawProfile.cache === "object" && rawProfile.cache !== null) {
					const c = rawProfile.cache as Record<string, unknown>;
					const cacheConfig: Record<string, unknown> = {};
					if (typeof c.enabled === "boolean") cacheConfig.enabled = c.enabled;
					if (typeof c.ttl === "number") cacheConfig.ttl = c.ttl;
					(profile as Record<string, unknown>).cache = cacheConfig as CacheConfig;
				}
				profiles[name] = profile;
			}
		}

		return new Soda3Config({
			profiles,
			defaultProfile: typeof parsed.default_profile === "string" ? parsed.default_profile : undefined,
			format: typeof parsed.format === "string" ? parsed.format : undefined,
			cache: parseCacheConfig(parsed.cache),
		});
	}
}

function parseCacheConfig(raw: unknown): CacheConfig | undefined {
	if (typeof raw !== "object" || raw === null) return undefined;
	const obj = raw as Record<string, unknown>;
	const result: Record<string, unknown> = {};
	if (typeof obj.enabled === "boolean") result.enabled = obj.enabled;
	if (typeof obj.ttl === "number") result.ttl = obj.ttl;
	if (Object.keys(result).length === 0) return undefined;
	return result as CacheConfig;
}

function toTomlShape(config: Soda3Config): Record<string, unknown> {
	const obj: Record<string, unknown> = {};
	if (config.format !== undefined) obj.format = config.format;
	if (config.defaultProfile !== undefined) obj.default_profile = config.defaultProfile;
	if (config.cache !== undefined) {
		const c: Record<string, unknown> = {};
		if (config.cache.enabled !== undefined) c.enabled = config.cache.enabled;
		if (config.cache.ttl !== undefined) c.ttl = config.cache.ttl;
		if (Object.keys(c).length > 0) obj.cache = c;
	}
	if (Object.keys(config.profiles).length > 0) {
		const profiles: Record<string, unknown> = {};
		for (const [name, profile] of Object.entries(config.profiles)) {
			const p: Record<string, unknown> = { domain: profile.domain };
			if (profile.token !== undefined) p.token = profile.token;
			if (profile.cache !== undefined) {
				const pc: Record<string, unknown> = {};
				if (profile.cache.enabled !== undefined) pc.enabled = profile.cache.enabled;
				if (profile.cache.ttl !== undefined) pc.ttl = profile.cache.ttl;
				if (Object.keys(pc).length > 0) p.cache = pc;
			}
			profiles[name] = p;
		}
		obj.profiles = profiles;
	}
	return obj;
}

function isNodeError(err: unknown): err is NodeJS.ErrnoException {
	return err instanceof Error && "code" in err;
}
```

- [ ] **Step 4: Update index.ts with full exports**

```typescript
// packages/config/src/index.ts
export { Soda3Config } from "./lib/soda3-config.js";
export type { CacheConfig, Config, Profile } from "./schemas/config.js";
export { CacheConfigSchema, ConfigSchema, ProfileSchema } from "./schemas/config.js";
export type { CacheEntryMeta, DatasetFreshness } from "./schemas/cache.js";
export { CacheEntryMetaSchema, DatasetFreshnessSchema } from "./schemas/cache.js";
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `pnpm vitest run packages/config/__test__/`
Expected: PASS (all xdg + schema + soda3-config tests)

- [ ] **Step 6: Commit**

```
git add packages/config/src/ packages/config/__test__/
git commit -m "feat(config): implement Soda3Config class with load/save/immutable ops

Static XDG methods, async load() and sync loadSync() factories,
immutable withProfile/withDefault/withFormat/withCache builders,
toTOML serialization with ENOENT fallback to empty config.

Signed-off-by: C. Spencer Beggs <spencer@savvyweb.systems>"
```

---

### Task 5: JSON Schema Generation Script

**Files:**
- Create: `packages/config/lib/scripts/generate-json-schema.ts`

- [ ] **Step 1: Implement the generation script**

```typescript
// packages/config/lib/scripts/generate-json-schema.ts
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { JSONSchema } from "effect";
import { CacheEntryMetaSchema, DatasetFreshnessSchema } from "../../src/schemas/cache.js";
import { ConfigSchema } from "../../src/schemas/config.js";

const SCHEMAS_DIR = resolve(import.meta.dirname, "../../../../website/public/schemas");

const schemas = [
	{ name: "config.json", schema: ConfigSchema },
	{ name: "cache-entry.json", schema: CacheEntryMetaSchema },
	{ name: "freshness.json", schema: DatasetFreshnessSchema },
] as const;

mkdirSync(SCHEMAS_DIR, { recursive: true });

for (const { name, schema } of schemas) {
	const json = JSONSchema.make(schema);
	const content = `${JSON.stringify(json, null, "\t")}\n`;
	const outputPath = join(SCHEMAS_DIR, name);
	const existing = existsSync(outputPath) ? readFileSync(outputPath, "utf-8") : "";

	if (content !== existing) {
		writeFileSync(outputPath, content, "utf-8");
		console.log(`Generated ${name}`);
	} else {
		console.log(`${name}: unchanged`);
	}
}
```

- [ ] **Step 2: Run the script**

Run: `pnpm tsx packages/config/lib/scripts/generate-json-schema.ts`
Expected: Three files generated in `website/public/schemas/`

- [ ] **Step 3: Verify generated schemas**

Run: `cat website/public/schemas/config.json | head -20`
Expected: Valid JSON Schema with `$schema`, `type: "object"`, `properties`

Run: `ls -la website/public/schemas/`
Expected: `config.json`, `cache-entry.json`, `freshness.json`

- [ ] **Step 4: Commit**

```
git add packages/config/lib/scripts/generate-json-schema.ts website/public/schemas/
git commit -m "feat(config): add JSON Schema generation script

Generates config.json, cache-entry.json, and freshness.json from
Effect Schemas to website/public/schemas/ for hosting at soda3js.tools.
Smart diffing prevents unnecessary writes.

Signed-off-by: C. Spencer Beggs <spencer@savvyweb.systems>"
```

---

### Task 6: Add to Fixed Versioning Group and Vitest Alias

**Files:**
- Modify: `.changeset/config.json`
- Modify: `vitest.config.ts`

- [ ] **Step 1: Add @soda3js/config to changeset fixed group**

Add `"@soda3js/config"` to the `fixed` array in `.changeset/config.json`, after `"@soda3js/cache-sqlite"`.

- [ ] **Step 2: Add vitest workspace alias**

Add to the `alias` object in `vitest.config.ts`:
```typescript
"@soda3js/config": resolve(__dirname, "packages/config/src/index.ts"),
```

- [ ] **Step 3: Commit**

```
git add .changeset/config.json vitest.config.ts
git commit -m "chore: add @soda3js/config to fixed versioning and vitest aliases

Signed-off-by: C. Spencer Beggs <spencer@savvyweb.systems>"
```

---

### Task 7: Migrate cache-fs

**Files:**
- Delete: `packages/cache-fs/src/lib/xdg.ts`
- Modify: `packages/cache-fs/package.json`
- Modify: `packages/cache-fs/src/index.ts`
- Modify: `packages/cache-fs/src/node.ts`
- Modify: `packages/cache-fs/src/bun.ts`
- Delete: `packages/cache-fs/__test__/lib/xdg.test.ts`

- [ ] **Step 1: Add @soda3js/config dependency**

Add to `packages/cache-fs/package.json` dependencies:
```json
"@soda3js/config": "workspace:*"
```

- [ ] **Step 2: Update imports in index.ts**

Replace:
```typescript
import { cacheDir } from "./lib/xdg.js";
```
With:
```typescript
import { Soda3Config } from "@soda3js/config";
```

And replace `cacheDir()` call with `Soda3Config.cacheDir()`.

Update the re-exports at the bottom. Replace:
```typescript
export { cacheDir, stateDir } from "./lib/xdg.js";
```
With:
```typescript
export { Soda3Config } from "@soda3js/config";
```

- [ ] **Step 3: Update node.ts and bun.ts re-exports**

Replace `cacheDir, stateDir` re-exports with `Soda3Config`.

- [ ] **Step 4: Delete xdg.ts and its test**

Delete `packages/cache-fs/src/lib/xdg.ts` and `packages/cache-fs/__test__/lib/xdg.test.ts`.

- [ ] **Step 5: Run tests**

Run: `pnpm vitest run --project="@soda3js/cache-fs"`
Expected: PASS (existing tests still work)

- [ ] **Step 6: Commit**

```
git add packages/cache-fs/
git commit -m "refactor(cache-fs): migrate from local xdg.ts to @soda3js/config

Replace cacheDir()/stateDir() with Soda3Config.cacheDir()/stateDir().
Delete local xdg.ts and its tests (now in config package).

Signed-off-by: C. Spencer Beggs <spencer@savvyweb.systems>"
```

---

### Task 8: Migrate cache-sqlite

**Files:**
- Delete: `packages/cache-sqlite/src/lib/xdg.ts`
- Modify: `packages/cache-sqlite/package.json`
- Modify: `packages/cache-sqlite/src/node.ts`

- [ ] **Step 1: Add @soda3js/config dependency**

Add to `packages/cache-sqlite/package.json` dependencies:
```json
"@soda3js/config": "workspace:*"
```

- [ ] **Step 2: Update node.ts import**

Replace:
```typescript
import { cacheDir } from "./lib/xdg.js";
```
With:
```typescript
import { Soda3Config } from "@soda3js/config";
```

Replace `cacheDir()` call with `Soda3Config.cacheDir()`.

- [ ] **Step 3: Delete xdg.ts**

Delete `packages/cache-sqlite/src/lib/xdg.ts`.

- [ ] **Step 4: Run tests**

Run: `pnpm vitest run --project="@soda3js/cache-sqlite"`
Expected: PASS

- [ ] **Step 5: Commit**

```
git add packages/cache-sqlite/
git commit -m "refactor(cache-sqlite): migrate from local xdg.ts to @soda3js/config

Replace cacheDir() with Soda3Config.cacheDir(). Delete local xdg.ts.

Signed-off-by: C. Spencer Beggs <spencer@savvyweb.systems>"
```

---

### Task 9: Migrate MCP

**Files:**
- Modify: `packages/mcp/package.json`
- Modify: `packages/mcp/src/lib/config.ts`

- [ ] **Step 1: Add @soda3js/config dep, remove smol-toml**

In `packages/mcp/package.json`, add `"@soda3js/config": "workspace:*"` to dependencies and remove `"smol-toml"`.

- [ ] **Step 2: Rewrite config.ts to use Soda3Config**

```typescript
// packages/mcp/src/lib/config.ts
import { Soda3Config } from "@soda3js/config";
import type { Profile } from "@soda3js/config";

export interface McpConfig {
	readonly appToken?: string;
	readonly cachePath: string;
	readonly logLevel: string;
	readonly defaultDomain?: string;
	readonly profiles: Record<string, { domain: string; token?: string }>;
}

export function loadConfig(): McpConfig {
	const appToken = process.env.SOCRATA_APP_TOKEN;
	const cachePath = process.env.SODA3_CACHE_PATH ?? Soda3Config.cacheDir();
	const logLevel = process.env.SODA3_LOG_LEVEL ?? "info";

	const config = Soda3Config.loadSync();

	let defaultDomain: string | undefined;
	if (config.defaultProfile) {
		const profile = config.getProfile(config.defaultProfile);
		if (profile) defaultDomain = profile.domain;
	}

	const profiles: Record<string, { domain: string; token?: string }> = {};
	for (const [name, profile] of Object.entries(config.profiles)) {
		profiles[name] = { domain: profile.domain };
		if (profile.token !== undefined) {
			profiles[name].token = profile.token;
		}
	}

	return { appToken, cachePath, logLevel, defaultDomain, profiles };
}
```

- [ ] **Step 3: Run pnpm install (to pick up dep changes)**

Run: `pnpm install`

- [ ] **Step 4: Run tests**

Run: `pnpm vitest run --project="@soda3js/mcp"`
Expected: PASS

- [ ] **Step 5: Commit**

```
git add packages/mcp/
git commit -m "refactor(mcp): migrate config loading to @soda3js/config

Replace hardcoded ~/.config path with Soda3Config.loadSync() which
respects XDG_CONFIG_HOME. Remove smol-toml direct dependency.

Signed-off-by: C. Spencer Beggs <spencer@savvyweb.systems>"
```

---

### Task 10: Migrate CLI

**Files:**
- Delete: `packages/cli/src/lib/config-store.ts`
- Modify: `packages/cli/package.json`
- Modify: `packages/cli/src/lib/domain.ts`
- Modify: `packages/cli/src/lib/cache-factory.ts`
- Modify: `packages/cli/src/cli/commands/config.ts`
- Modify: `packages/cli/src/cli/commands/query.ts`
- Modify: `packages/cli/src/cli/commands/meta.ts`
- Modify: `packages/cli/src/cli/commands/export.ts`
- Modify: `packages/cli/src/cli/commands/cache.ts`

- [ ] **Step 1: Add @soda3js/config dependency**

Add `"@soda3js/config": "workspace:*"` to `packages/cli/package.json` dependencies. Remove `"smol-toml"` if present.

- [ ] **Step 2: Update command files that import readConfig**

In `query.ts`, `meta.ts`, `export.ts`, `cache.ts`, replace:
```typescript
import { readConfig } from "../../lib/config-store.js";
```
With:
```typescript
import { Soda3Config } from "@soda3js/config";
```

Replace all `readConfig()` calls with `Soda3Config.load()`. The call sites use `Effect.promise(() => readConfig())` which becomes `Effect.promise(() => Soda3Config.load())`.

- [ ] **Step 3: Update domain.ts**

Replace:
```typescript
import type { Config } from "./config-store.js";
```
With:
```typescript
import type { Config } from "@soda3js/config";
```

- [ ] **Step 4: Update cache-factory.ts**

Replace:
```typescript
import type { CacheConfig } from "./config-store.js";
```
With:
```typescript
import type { CacheConfig } from "@soda3js/config";
```

- [ ] **Step 5: Rewrite config.ts commands**

Replace all imports from `config-store.js` with `@soda3js/config`. Rewrite the helper functions to use `Soda3Config`:

```typescript
// packages/cli/src/cli/commands/config.ts
import { Command, Options } from "@effect/cli";
import { Soda3Config } from "@soda3js/config";
import type { Profile } from "@soda3js/config";
import { Console, Effect, Option } from "effect";

export async function initConfig(
	domain: string,
	token?: string,
	name?: string,
	path?: string,
): Promise<{ created: boolean; configPath: string }> {
	const filePath = path ?? Soda3Config.configPath();
	const existing = await Soda3Config.load(filePath);
	if (existing.listProfiles().length > 0) {
		return { created: false, configPath: filePath };
	}

	const profileName = name ?? "default";
	const profile: Profile = { domain };
	if (token !== undefined) {
		(profile as Record<string, unknown>).token = token;
	}

	const config = Soda3Config.empty()
		.withProfile(profileName, profile)
		.withDefault(profileName);
	await config.save(filePath);
	return { created: true, configPath: filePath };
}

export async function showConfig(path?: string): Promise<string> {
	const filePath = path ?? Soda3Config.configPath();
	const config = await Soda3Config.load(filePath);
	return config.toTOML();
}

export async function addProfileToConfig(
	name: string,
	domain: string,
	token?: string,
	path?: string,
): Promise<void> {
	const filePath = path ?? Soda3Config.configPath();
	const config = await Soda3Config.load(filePath);
	const profile: Profile = { domain };
	if (token !== undefined) {
		(profile as Record<string, unknown>).token = token;
	}
	await config.withProfile(name, profile).save(filePath);
}

// ... rest of command definitions stay the same, just use the updated helper functions
```

Read the existing `config.ts` file to preserve the command definitions exactly. Only change the import sources and helper function implementations.

- [ ] **Step 6: Delete config-store.ts**

Delete `packages/cli/src/lib/config-store.ts`.

- [ ] **Step 7: Run pnpm install**

Run: `pnpm install`

- [ ] **Step 8: Run all CLI tests**

Run: `pnpm vitest run --project="@soda3js/cli:unit" --project="@soda3js/cli:int"`
Expected: PASS

- [ ] **Step 9: Commit**

```
git add packages/cli/
git commit -m "refactor(cli): migrate config loading to @soda3js/config

Replace config-store.ts with Soda3Config class. All commands now use
Soda3Config.load() for config reading and .save() for writing.
Delete local config-store.ts.

Signed-off-by: C. Spencer Beggs <spencer@savvyweb.systems>"
```

---

### Task 11: Full Suite Verification

- [ ] **Step 1: Run all tests**

Run: `pnpm test`
Expected: All tests pass, exit code 0

- [ ] **Step 2: Run typecheck**

Run: `pnpm typecheck`
Expected: All tasks pass

- [ ] **Step 3: Run lint**

Run: `pnpm lint`
Expected: No errors

- [ ] **Step 4: Build production**

Run: `pnpm turbo run build:prod --force`
Expected: All tasks pass (including generate:json-schema)

- [ ] **Step 5: Verify JSON schemas exist**

Run: `ls -la website/public/schemas/`
Expected: `config.json`, `cache-entry.json`, `freshness.json`

- [ ] **Step 6: Verify dist artifacts**

Run: `jq '{private,exports}' packages/config/dist/npm/package.json`
Expected: `private: false`, exports rewritten
