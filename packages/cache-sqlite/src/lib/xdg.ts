import { homedir } from "node:os";
import { join } from "node:path";

const APP_NAME = "soda3js";

export function cacheDir(): string {
	const base = process.env.XDG_CACHE_HOME ?? join(homedir(), ".cache");
	return join(base, APP_NAME);
}
