import { resolve } from "node:path";
import { VitestConfig } from "@savvy-web/vitest";

export default VitestConfig.create(
	{
		coverage: VitestConfig.COVERAGE_LEVELS.strict,
		coverageTargets: VitestConfig.COVERAGE_LEVELS.standard,
		coverageExclude: ["packages/cli/src/cli/commands/example.ts"],
	},
	(config) => ({
		...config,
		resolve: {
			...config.resolve,
			alias: {
				"@soda3js/client": resolve(__dirname, "packages/client/src/index.ts"),
				"@soda3js/soql": resolve(__dirname, "packages/soql/src/index.ts"),
			},
		},
	}),
);
