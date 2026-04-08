import { readFileSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { Schema } from "effect";
import { parse, stringify } from "smol-toml";
import type { CacheConfig, Profile } from "../schemas/config.js";
import { ConfigSchema } from "../schemas/config.js";
import { cacheDir, configDir, configPath, dataDir, runtimeDir, stateDir } from "./xdg.js";

export class Soda3Config {
	readonly profiles: Readonly<Record<string, Profile>>;
	readonly defaultProfile: string | undefined;
	readonly format: string | undefined;
	readonly cache: CacheConfig | undefined;

	private constructor(data: {
		profiles: Record<string, Profile>;
		defaultProfile?: string | undefined;
		format?: string | undefined;
		cache?: CacheConfig | undefined;
	}) {
		this.profiles = data.profiles;
		this.defaultProfile = data.defaultProfile;
		this.format = data.format;
		this.cache = data.cache;
	}

	// --- Static: XDG directories ---

	static configDir(): string {
		return configDir();
	}

	static cacheDir(): string {
		return cacheDir();
	}

	static stateDir(): string {
		return stateDir();
	}

	static dataDir(): string {
		return dataDir();
	}

	static runtimeDir(): string | undefined {
		return runtimeDir();
	}

	static configPath(): string {
		return configPath();
	}

	// --- Static: factories ---

	static empty(): Soda3Config {
		return new Soda3Config({ profiles: {} });
	}

	static async load(path?: string): Promise<Soda3Config> {
		const filePath = path ?? configPath();
		try {
			const contents = await readFile(filePath, "utf-8");
			return Soda3Config.fromTOML(contents);
		} catch (err: unknown) {
			if (isNodeError(err) && err.code === "ENOENT") {
				return Soda3Config.empty();
			}
			throw err;
		}
	}

	static loadSync(path?: string): Soda3Config {
		const filePath = path ?? configPath();
		try {
			const contents = readFileSync(filePath, "utf-8");
			return Soda3Config.fromTOML(contents);
		} catch (err: unknown) {
			if (isNodeError(err) && err.code === "ENOENT") {
				return Soda3Config.empty();
			}
			throw err;
		}
	}

	// --- Instance: queries ---

	getProfile(name: string): Profile | undefined {
		return this.profiles[name];
	}

	listProfiles(): string[] {
		return Object.keys(this.profiles);
	}

	// --- Instance: immutable builders ---

	withProfile(name: string, profile: Profile): Soda3Config {
		return new Soda3Config({
			profiles: { ...this.profiles, [name]: profile },
			defaultProfile: this.defaultProfile,
			format: this.format,
			cache: this.cache,
		});
	}

	withDefault(name: string): Soda3Config {
		return new Soda3Config({
			profiles: { ...this.profiles },
			defaultProfile: name,
			format: this.format,
			cache: this.cache,
		});
	}

	withFormat(format: string): Soda3Config {
		return new Soda3Config({
			profiles: { ...this.profiles },
			defaultProfile: this.defaultProfile,
			format,
			cache: this.cache,
		});
	}

	withCache(cache: CacheConfig): Soda3Config {
		return new Soda3Config({
			profiles: { ...this.profiles },
			defaultProfile: this.defaultProfile,
			format: this.format,
			cache,
		});
	}

	// --- Instance: serialization ---

	toTOML(): string {
		return stringify(toTomlShape(this));
	}

	async save(path?: string): Promise<void> {
		const filePath = path ?? configPath();
		await mkdir(dirname(filePath), { recursive: true });
		await writeFile(filePath, this.toTOML(), "utf-8");
	}

	// --- Private ---

	private static fromTOML(contents: string): Soda3Config {
		const parsed = parse(contents);
		const decoded = Schema.decodeUnknownSync(ConfigSchema)(parsed);
		return new Soda3Config({
			profiles: decoded.profiles as Record<string, Profile>,
			defaultProfile: decoded.default_profile,
			format: decoded.format,
			cache: decoded.cache,
		});
	}
}

function toTomlShape(config: Soda3Config): Record<string, unknown> {
	const obj: Record<string, unknown> = {};
	if (config.format !== undefined) obj.format = config.format;
	if (config.defaultProfile !== undefined) obj.default_profile = config.defaultProfile;
	if (config.cache !== undefined) {
		const c: Record<string, unknown> = {};
		if (config.cache.enabled !== undefined) c.enabled = config.cache.enabled;
		if (config.cache.ttl !== undefined) c.ttl = config.cache.ttl;
		if (Object.keys(c).length > 0) obj.cache = c;
	}
	if (Object.keys(config.profiles).length > 0) {
		const profiles: Record<string, unknown> = {};
		for (const [name, profile] of Object.entries(config.profiles)) {
			const p: Record<string, unknown> = { domain: profile.domain };
			if (profile.token !== undefined) p.token = profile.token;
			if (profile.cache !== undefined) {
				const pc: Record<string, unknown> = {};
				if (profile.cache.enabled !== undefined) pc.enabled = profile.cache.enabled;
				if (profile.cache.ttl !== undefined) pc.ttl = profile.cache.ttl;
				if (Object.keys(pc).length > 0) p.cache = pc;
			}
			profiles[name] = p;
		}
		obj.profiles = profiles;
	}
	return obj;
}

function isNodeError(err: unknown): err is NodeJS.ErrnoException {
	return err instanceof Error && "code" in err;
}
