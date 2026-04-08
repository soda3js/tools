import { Soda3Config } from "@soda3js/config";

export interface McpConfig {
	readonly appToken?: string | undefined;
	readonly cachePath: string;
	readonly logLevel: string;
	readonly defaultDomain?: string | undefined;
	readonly profiles: Record<string, { domain: string; token?: string | undefined }>;
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

	const profiles: Record<string, { domain: string; token?: string | undefined }> = {};
	for (const [name, profile] of Object.entries(config.profiles)) {
		profiles[name] = { domain: profile.domain };
		if (profile.token !== undefined) {
			profiles[name].token = profile.token;
		}
	}

	return { appToken, cachePath, logLevel, defaultDomain, profiles };
}
