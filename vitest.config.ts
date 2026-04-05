import { resolve } from "node:path";
import { VitestConfig } from "@savvy-web/vitest";

export default VitestConfig.create(
	{
		coverage: VitestConfig.COVERAGE_LEVELS.strict,
		coverageTargets: VitestConfig.COVERAGE_LEVELS.standard,
		coverageExclude: [
			"packages/cli/src/cli/commands/example.ts",
			"packages/cli/src/cli/commands/config.ts",
			"packages/cli/src/cli/commands/query.ts",
			"packages/cli/src/cli/commands/meta.ts",
			"packages/cli/src/cli/commands/export.ts",
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
				"@soda3js/client": resolve(__dirname, "packages/client/src/index.ts"),
				"@soda3js/server": resolve(__dirname, "packages/server/src/index.ts"),
				"@soda3js/soql": resolve(__dirname, "packages/soql/src/index.ts"),
			},
		},
	}),
);
