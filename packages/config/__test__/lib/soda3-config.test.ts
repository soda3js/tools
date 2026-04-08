import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { Soda3Config } from "../../src/lib/soda3-config.js";

describe("Soda3Config", () => {
	let tempDir: string;

	beforeEach(async () => {
		tempDir = await mkdtemp(join(tmpdir(), "soda3-config-"));
	});

	afterEach(async () => {
		await rm(tempDir, { recursive: true, force: true });
	});

	describe("static XDG methods", () => {
		it("configDir delegates to xdg module", () => {
			expect(Soda3Config.configDir()).toContain("soda3js");
		});

		it("cacheDir delegates to xdg module", () => {
			expect(Soda3Config.cacheDir()).toContain("soda3js");
		});

		it("configPath returns config.toml path", () => {
			expect(Soda3Config.configPath()).toMatch(/config\.toml$/);
		});
	});

	describe("empty", () => {
		it("returns instance with no profiles", () => {
			const config = Soda3Config.empty();
			expect(config.profiles).toEqual({});
			expect(config.defaultProfile).toBeUndefined();
			expect(config.format).toBeUndefined();
			expect(config.cache).toBeUndefined();
		});
	});

	describe("load", () => {
		it("reads and parses valid TOML", async () => {
			const toml = `
format = "table"
default_profile = "sf"

[profiles.sf]
domain = "data.sfgov.org"
token = "abc123"

[profiles.nyc]
domain = "data.cityofnewyork.us"
`;
			const filePath = join(tempDir, "config.toml");
			await writeFile(filePath, toml, "utf-8");

			const config = await Soda3Config.load(filePath);
			expect(config.format).toBe("table");
			expect(config.defaultProfile).toBe("sf");
			expect(config.listProfiles()).toEqual(["sf", "nyc"]);
			expect(config.getProfile("sf")?.token).toBe("abc123");
		});

		it("returns empty config on ENOENT", async () => {
			const config = await Soda3Config.load(join(tempDir, "nonexistent.toml"));
			expect(config.profiles).toEqual({});
		});

		it("throws on TOML parse error", async () => {
			const filePath = join(tempDir, "bad.toml");
			await writeFile(filePath, "not = [valid toml", "utf-8");
			await expect(Soda3Config.load(filePath)).rejects.toThrow();
		});
	});

	describe("loadSync", () => {
		it("reads and parses valid TOML synchronously", async () => {
			const filePath = join(tempDir, "config.toml");
			await writeFile(filePath, '[profiles.sf]\ndomain = "data.sfgov.org"\n', "utf-8");

			const config = Soda3Config.loadSync(filePath);
			expect(config.getProfile("sf")?.domain).toBe("data.sfgov.org");
		});

		it("returns empty config on ENOENT", () => {
			const config = Soda3Config.loadSync(join(tempDir, "nope.toml"));
			expect(config.profiles).toEqual({});
		});
	});

	describe("immutable operations", () => {
		it("withProfile returns new instance", () => {
			const a = Soda3Config.empty();
			const b = a.withProfile("sf", { domain: "data.sfgov.org" });
			expect(a.listProfiles()).toEqual([]);
			expect(b.listProfiles()).toEqual(["sf"]);
		});

		it("withDefault sets defaultProfile", () => {
			const config = Soda3Config.empty().withProfile("sf", { domain: "data.sfgov.org" }).withDefault("sf");
			expect(config.defaultProfile).toBe("sf");
		});

		it("withFormat sets format", () => {
			const config = Soda3Config.empty().withFormat("json");
			expect(config.format).toBe("json");
		});

		it("withCache sets cache config", () => {
			const config = Soda3Config.empty().withCache({ enabled: true, ttl: 600 });
			expect(config.cache?.enabled).toBe(true);
			expect(config.cache?.ttl).toBe(600);
		});

		it("getProfile returns undefined for missing profile", () => {
			expect(Soda3Config.empty().getProfile("nope")).toBeUndefined();
		});
	});

	describe("serialization", () => {
		it("toTOML round-trips through parse", async () => {
			const config = Soda3Config.empty()
				.withFormat("table")
				.withDefault("sf")
				.withProfile("sf", { domain: "data.sfgov.org", token: "abc" })
				.withCache({ enabled: true, ttl: 3600 });

			const toml = config.toTOML();
			const filePath = join(tempDir, "roundtrip.toml");
			await writeFile(filePath, toml, "utf-8");
			const reloaded = await Soda3Config.load(filePath);

			expect(reloaded.format).toBe("table");
			expect(reloaded.defaultProfile).toBe("sf");
			expect(reloaded.getProfile("sf")?.token).toBe("abc");
			expect(reloaded.cache?.enabled).toBe(true);
		});

		it("toTOML omits undefined optional fields", () => {
			const toml = Soda3Config.empty().withProfile("sf", { domain: "data.sfgov.org" }).toTOML();
			expect(toml).not.toContain("format");
			expect(toml).not.toContain("default_profile");
			expect(toml).not.toContain("cache");
		});

		it("save creates parent directories", async () => {
			const filePath = join(tempDir, "nested", "deep", "config.toml");
			const config = Soda3Config.empty().withProfile("sf", { domain: "data.sfgov.org" });
			await config.save(filePath);
			const contents = await readFile(filePath, "utf-8");
			expect(contents).toContain("data.sfgov.org");
		});
	});
});
