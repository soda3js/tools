import { resolve } from "node:path";
import { VitestConfig } from "@savvy-web/vitest";

export default VitestConfig.create(
	{
		coverage: VitestConfig.COVERAGE_LEVELS.strict,
		coverageTargets: VitestConfig.COVERAGE_LEVELS.standard,
		coverageExclude: [
			"packages/cache/src/lib/browser-cache.ts",
			"packages/cache/src/lib/cache-key.ts",
			"packages/cache-fs/src/lib/fs-cache.ts",
			"packages/cache-fs/src/index.ts",
			"packages/cache-fs/src/node.ts",
			"packages/cache-fs/src/bun.ts",
			"packages/cache-fs/src/lib/xdg.ts",
			"packages/cache-sqlite/src/index.ts",
			"packages/cache-sqlite/src/node.ts",
			"packages/cache-sqlite/src/bun.ts",
			"packages/cache-sqlite/src/lib/xdg.ts",
			"packages/cache-sqlite/src/lib/migrations/0001-initial.ts",
			"packages/cli/src/cli/commands/cache.ts",
			"packages/cli/src/lib/cache-factory.ts",
			"packages/cli/src/lib/config-store.ts",
			"packages/cli/src/cli/commands/example.ts",
			"packages/cli/src/cli/commands/config.ts",
			"packages/cli/src/cli/commands/query.ts",
			"packages/cli/src/cli/commands/meta.ts",
			"packages/cli/src/cli/commands/export.ts",
			"packages/client/src/schemas/SodaClientConfig.ts",
			"packages/client/src/services/SodaClient.ts",
			"packages/rest/src/soda3-client.ts",
			"packages/server/src/lib/recorder.ts",
			"packages/server/src/standalone.ts",
			"packages/server/src/plugin.ts",
		],
	},
	(config) => ({
		...config,
		resolve: {
			...config.resolve,
			alias: {
				"@soda3js/cache": resolve(__dirname, "packages/cache/src/index.ts"),
				"@soda3js/cache-fs": resolve(__dirname, "packages/cache-fs/src/index.ts"),
				"@soda3js/cache-sqlite": resolve(__dirname, "packages/cache-sqlite/src/index.ts"),
				"@soda3js/client": resolve(__dirname, "packages/client/src/index.ts"),
				"@soda3js/server": resolve(__dirname, "packages/server/src/index.ts"),
				"@soda3js/soql": resolve(__dirname, "packages/soql/src/index.ts"),
			},
		},
	}),
);
