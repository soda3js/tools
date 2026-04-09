import { NodeLibraryBuilder } from "@savvy-web/rslib-builder";

export default NodeLibraryBuilder.create({
	externals: [
		"effect",
		"@effect/platform",
		"@effect/platform-node",
		"@effect/experimental",
		"@effect/sql",
		"@effect/sql-sqlite-node",
		"@effect/sql-sqlite-bun",
		"better-sqlite3",
	],
	apiModel: {
		localPaths: ["../../website/lib/models/cache-sqlite"],
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
