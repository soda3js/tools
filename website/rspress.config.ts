import { defineConfig } from "@rspress/core";

export default defineConfig({
	root: "docs",
	title: "soda3js Documentation",
	outDir: "dist",
	builderConfig: {
		source: {
			define: {
				"import.meta.env": "import.meta.env",
			},
		},
	},
	route: {
		cleanUrls: true,
	},
});
