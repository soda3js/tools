import { mkdir, readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { parse, stringify } from "smol-toml";

export interface CacheConfig {
	enabled?: boolean;
	ttl?: number;
}

export interface Profile {
	domain: string;
	token?: string;
	cache?: CacheConfig;
}

export interface Config {
	format?: string;
	default_profile?: string;
	profiles: Record<string, Profile>;
	cache?: CacheConfig;
}

const CONFIG_DIR = "soda3js";
const CONFIG_FILE = "config.toml";

/**
 * Returns the path to the TOML config file.
 * Respects `XDG_CONFIG_HOME` if set, otherwise falls back to `~/.config`.
 */
export function configPath(): string {
	const base = process.env.XDG_CONFIG_HOME || join(homedir(), ".config");
	return join(base, CONFIG_DIR, CONFIG_FILE);
}

/**
 * Reads and parses the TOML config file.
 * Returns a default empty config if the file does not exist.
 */
export async function readConfig(path?: string): Promise<Config> {
	const filePath = path ?? configPath();
	try {
		const contents = await readFile(filePath, "utf-8");
		const parsed = parse(contents) as Record<string, unknown>;
		const config: Config = {
			profiles: {},
		};
		if (typeof parsed.format === "string") {
			config.format = parsed.format;
		}
		if (typeof parsed.default_profile === "string") {
			config.default_profile = parsed.default_profile;
		}
		if (typeof parsed.cache === "object" && parsed.cache !== null) {
			const cacheObj = parsed.cache as Record<string, unknown>;
			config.cache = {};
			if (typeof cacheObj.enabled === "boolean") config.cache.enabled = cacheObj.enabled;
			if (typeof cacheObj.ttl === "number") config.cache.ttl = cacheObj.ttl;
		}
		if (typeof parsed.profiles === "object" && parsed.profiles !== null) {
			const rawProfiles = parsed.profiles as Record<string, unknown>;
			for (const [name, raw] of Object.entries(rawProfiles)) {
				if (typeof raw !== "object" || raw === null) continue;
				const rawProfile = raw as Record<string, unknown>;
				if (typeof rawProfile.domain !== "string") continue;
				const profile: Profile = { domain: rawProfile.domain };
				if (typeof rawProfile.token === "string") profile.token = rawProfile.token;
				if (typeof rawProfile.cache === "object" && rawProfile.cache !== null) {
					const profileCacheObj = rawProfile.cache as Record<string, unknown>;
					profile.cache = {};
					if (typeof profileCacheObj.enabled === "boolean") profile.cache.enabled = profileCacheObj.enabled;
					if (typeof profileCacheObj.ttl === "number") profile.cache.ttl = profileCacheObj.ttl;
				}
				config.profiles[name] = profile;
			}
		}
		return config;
	} catch (err: unknown) {
		if (isNodeError(err) && err.code === "ENOENT") {
			return { profiles: {} };
		}
		throw err;
	}
}

/**
 * Writes the config to disk as TOML, creating parent directories if needed.
 */
export async function writeConfig(config: Config, path?: string): Promise<void> {
	const filePath = path ?? configPath();
	await mkdir(dirname(filePath), { recursive: true });
	const toml = stringify(toTomlShape(config));
	await writeFile(filePath, toml, "utf-8");
}

/**
 * Returns the profile with the given name, or `undefined` if it doesn't exist.
 */
export function getProfile(config: Config, name: string): Profile | undefined {
	return config.profiles[name];
}

/**
 * Returns an array of all profile names in the config.
 */
export function listProfiles(config: Config): string[] {
	return Object.keys(config.profiles);
}

/**
 * Returns a new config with the given profile added (or replaced).
 * Does not mutate the original config.
 */
export function addProfile(config: Config, name: string, profile: Profile): Config {
	return {
		...config,
		profiles: {
			...config.profiles,
			[name]: profile,
		},
	};
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Converts the Config object into the shape expected by smol-toml's stringify.
 * Top-level optional fields are only included when defined.
 */
function toTomlShape(config: Config): Record<string, unknown> {
	const obj: Record<string, unknown> = {};
	if (config.format !== undefined) {
		obj.format = config.format;
	}
	if (config.default_profile !== undefined) {
		obj.default_profile = config.default_profile;
	}
	if (config.cache !== undefined) {
		const cacheObj: Record<string, unknown> = {};
		if (config.cache.enabled !== undefined) cacheObj.enabled = config.cache.enabled;
		if (config.cache.ttl !== undefined) cacheObj.ttl = config.cache.ttl;
		if (Object.keys(cacheObj).length > 0) obj.cache = cacheObj;
	}
	if (Object.keys(config.profiles).length > 0) {
		const profiles: Record<string, unknown> = {};
		for (const [name, profile] of Object.entries(config.profiles)) {
			const profileObj: Record<string, unknown> = { domain: profile.domain };
			if (profile.token !== undefined) profileObj.token = profile.token;
			if (profile.cache !== undefined) {
				const profileCacheObj: Record<string, unknown> = {};
				if (profile.cache.enabled !== undefined) profileCacheObj.enabled = profile.cache.enabled;
				if (profile.cache.ttl !== undefined) profileCacheObj.ttl = profile.cache.ttl;
				if (Object.keys(profileCacheObj).length > 0) profileObj.cache = profileCacheObj;
			}
			profiles[name] = profileObj;
		}
		obj.profiles = profiles;
	}
	return obj;
}

function isNodeError(err: unknown): err is NodeJS.ErrnoException {
	return err instanceof Error && "code" in err;
}
