import { homedir } from "node:os";
import { join } from "node:path";

const APP_NAME = "soda3js";

export function configDir(): string {
	const base = process.env.XDG_CONFIG_HOME || join(homedir(), ".config");
	return join(base, APP_NAME);
}

export function cacheDir(): string {
	const base = process.env.XDG_CACHE_HOME || join(homedir(), ".cache");
	return join(base, APP_NAME);
}

export function stateDir(): string {
	const base = process.env.XDG_STATE_HOME || join(homedir(), ".local", "state");
	return join(base, APP_NAME);
}

export function dataDir(): string {
	const base = process.env.XDG_DATA_HOME || join(homedir(), ".local", "share");
	return join(base, APP_NAME);
}

export function runtimeDir(): string | undefined {
	const base = process.env.XDG_RUNTIME_DIR;
	if (!base) return undefined;
	return join(base, APP_NAME);
}

export function configPath(): string {
	return join(configDir(), "config.toml");
}
