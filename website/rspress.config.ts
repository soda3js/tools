import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "@rspress/core";
import { ApiExtractorPlugin } from "rspress-plugin-api-extractor";

const __dirname = dirname(fileURLToPath(import.meta.url));
const modelsDir = join(__dirname, "lib", "models");
const model = (name: string, file?: string) => join(modelsDir, name, `${file ?? name}.api.json`);
const packageJson = (name: string) => join(modelsDir, name, "package.json");
const tsconfig = (name: string) => join(modelsDir, name, "tsconfig.json");

const theme = { light: "github-light-default", dark: "github-dark-default" } as const;

export default defineConfig({
	root: "docs",
	title: "soda3js Documentation",
	outDir: "dist",
	// builderConfig: {
	// 	source: {
	// 		define: {
	// 			"import.meta.env": "import.meta.env",
	// 		},
	// 	},
	// },
	plugins: [
		ApiExtractorPlugin({
			logLevel: "info",
			apis: [
				{
					packageName: "@soda3js/soql",
					name: "SoQL Query Builder",
					model: model("soql"),
					packageJson: packageJson("soql"),
					tsconfig: tsconfig("soql"),
					baseRoute: "/soql",
					theme,
				},
				{
					packageName: "@soda3js/protocol",
					name: "Protocol",
					model: model("protocol"),
					packageJson: packageJson("protocol"),
					tsconfig: tsconfig("protocol"),
					baseRoute: "/protocol",
					theme,
				},
				{
					packageName: "@soda3js/client",
					name: "Effect Client",
					model: model("client"),
					packageJson: packageJson("client"),
					tsconfig: tsconfig("client"),
					baseRoute: "/client",
					theme,
				},
				{
					packageName: "@soda3js/rest",
					name: "REST Client",
					model: model("rest"),
					packageJson: packageJson("rest"),
					tsconfig: tsconfig("rest"),
					baseRoute: "/rest",
					theme,
				},
				{
					packageName: "@soda3js/cli",
					name: "CLI",
					model: model("cli"),
					packageJson: packageJson("cli"),
					tsconfig: tsconfig("cli"),
					baseRoute: "/cli",
					theme,
				},
				{
					packageName: "@soda3js/config",
					name: "Configuration",
					model: model("config"),
					packageJson: packageJson("config"),
					tsconfig: tsconfig("config"),
					baseRoute: "/config",
					theme,
				},
				{
					packageName: "@soda3js/mcp",
					name: "MCP Server",
					model: model("mcp"),
					packageJson: packageJson("mcp"),
					tsconfig: tsconfig("mcp"),
					baseRoute: "/mcp",
					theme,
				},
				{
					packageName: "@soda3js/cache",
					name: "Cache",
					model: model("cache"),
					packageJson: packageJson("cache"),
					tsconfig: tsconfig("cache"),
					baseRoute: "/cache",
					theme,
				},
				{
					packageName: "@soda3js/cache-fs",
					name: "Filesystem Cache",
					model: model("cache-fs"),
					packageJson: packageJson("cache-fs"),
					tsconfig: tsconfig("cache-fs"),
					baseRoute: "/cache",
					theme,
				},
				{
					packageName: "@soda3js/cache-sqlite",
					name: "SQLite Cache",
					model: model("cache-sqlite"),
					packageJson: packageJson("cache-sqlite"),
					tsconfig: tsconfig("cache-sqlite"),
					baseRoute: "/cache",
					theme,
				},
			],
		}),
	],
	themeConfig: {
		socialLinks: [
			{
				icon: "bluesky",
				mode: "link",
				content: "https://bsky.app/profile/savvyweb.systems",
			},
			{
				icon: {
					svg: `<svg xmlns="http://www.w3.org/2000/svg" width="100%" viewBox="0 0 24 24"><path d="M1.763 0C.786 0 0 .786 0 1.763v20.474C0 23.214.786 24 1.763 24h20.474c.977 0 1.763-.786 1.763-1.763V1.763C24 .786 23.214 0 22.237 0zM5.13 5.323l13.837.019-.009 13.836h-3.464l.01-10.382h-3.456L12.04 19.17H5.113z"></svg>`,
				},
				mode: "link",
				content: "https://www.npmjs.com/org/soda3js",
			},
			{
				icon: "github",
				mode: "link",
				content: "https://github.com/soda3js",
			},
		],
	},
	route: {
		cleanUrls: true,
	},
});
