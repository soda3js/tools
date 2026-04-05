import { mkdir, readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { parse, stringify } from "smol-toml";

export interface Profile {
	domain: string;
	token?: string;
}

export interface Config {
	format?: string;
	default_profile?: string;
	profiles: Record<string, Profile>;
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
			profiles: (parsed.profiles as Record<string, Profile>) ?? {},
		};
		if (typeof parsed.format === "string") {
			config.format = parsed.format;
		}
		if (typeof parsed.default_profile === "string") {
			config.default_profile = parsed.default_profile;
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
	if (Object.keys(config.profiles).length > 0) {
		obj.profiles = config.profiles;
	}
	return obj;
}

function isNodeError(err: unknown): err is NodeJS.ErrnoException {
	return err instanceof Error && "code" in err;
}
