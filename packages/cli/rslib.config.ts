import { pluginReact } from "@rsbuild/plugin-react";
import { NodeLibraryBuilder } from "@savvy-web/rslib-builder";

export default NodeLibraryBuilder.create({
	externals: ["effect", "@effect/cli", "@effect/platform", "@effect/platform-node", "smol-toml", "ink", "react"],
	plugins: [pluginReact()],
	apiModel: {
		localPaths: ["../../website/lib/models/cli"],
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
