import { mkdtemp, rm } from "node:fs/promises";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Config, Profile } from "../../src/lib/config-store.js";
import {
	addProfile,
	configPath,
	getProfile,
	listProfiles,
	readConfig,
	writeConfig,
} from "../../src/lib/config-store.js";

describe("configPath", () => {
	const originalXdg = process.env.XDG_CONFIG_HOME;

	afterEach(() => {
		if (originalXdg === undefined) {
			delete process.env.XDG_CONFIG_HOME;
		} else {
			process.env.XDG_CONFIG_HOME = originalXdg;
		}
	});

	it("returns XDG path when XDG_CONFIG_HOME is set", () => {
		process.env.XDG_CONFIG_HOME = "/custom/config";
		expect(configPath()).toBe("/custom/config/soda3js/config.toml");
	});

	it("falls back to ~/.config/soda3js/config.toml", () => {
		delete process.env.XDG_CONFIG_HOME;
		expect(configPath()).toBe(join(homedir(), ".config", "soda3js", "config.toml"));
	});
});

describe("readConfig", () => {
	let tmpDir: string;

	beforeEach(async () => {
		tmpDir = await mkdtemp(join(tmpdir(), "soda3js-test-"));
	});

	afterEach(async () => {
		await rm(tmpDir, { recursive: true, force: true });
	});

	it("returns default config when file does not exist", async () => {
		const path = join(tmpDir, "nonexistent", "config.toml");
		const config = await readConfig(path);
		expect(config).toEqual({ profiles: {} });
	});
});

describe("writeConfig + readConfig round-trip", () => {
	let tmpDir: string;

	beforeEach(async () => {
		tmpDir = await mkdtemp(join(tmpdir(), "soda3js-test-"));
	});

	afterEach(async () => {
		await rm(tmpDir, { recursive: true, force: true });
	});

	it("round-trips a full config through TOML", async () => {
		const path = join(tmpDir, "soda3js", "config.toml");

		const original: Config = {
			format: "table",
			default_profile: "nyc",
			profiles: {
				nyc: { domain: "data.cityofnewyork.us", token: "abc123" },
				chicago: { domain: "data.cityofchicago.org" },
			},
		};

		await writeConfig(original, path);
		const loaded = await readConfig(path);

		expect(loaded.format).toBe("table");
		expect(loaded.default_profile).toBe("nyc");
		expect(loaded.profiles.nyc).toEqual({
			domain: "data.cityofnewyork.us",
			token: "abc123",
		});
		expect(loaded.profiles.chicago).toEqual({
			domain: "data.cityofchicago.org",
		});
	});

	it("round-trips an empty-profiles config", async () => {
		const path = join(tmpDir, "soda3js", "config.toml");

		const original: Config = { profiles: {} };
		await writeConfig(original, path);
		const loaded = await readConfig(path);

		expect(loaded).toEqual({ profiles: {} });
	});
});

describe("getProfile", () => {
	const config: Config = {
		profiles: {
			nyc: { domain: "data.cityofnewyork.us", token: "abc123" },
		},
	};

	it("returns the profile when it exists", () => {
		expect(getProfile(config, "nyc")).toEqual({
			domain: "data.cityofnewyork.us",
			token: "abc123",
		});
	});

	it("returns undefined when the profile does not exist", () => {
		expect(getProfile(config, "missing")).toBeUndefined();
	});
});

describe("listProfiles", () => {
	it("returns profile names", () => {
		const config: Config = {
			profiles: {
				nyc: { domain: "data.cityofnewyork.us" },
				chicago: { domain: "data.cityofchicago.org" },
			},
		};
		expect(listProfiles(config)).toEqual(["nyc", "chicago"]);
	});

	it("returns empty array for empty profiles", () => {
		expect(listProfiles({ profiles: {} })).toEqual([]);
	});
});

describe("addProfile", () => {
	it("returns new config with the profile added", () => {
		const original: Config = {
			format: "table",
			profiles: {
				nyc: { domain: "data.cityofnewyork.us" },
			},
		};

		const profile: Profile = {
			domain: "data.cityofchicago.org",
			token: "xyz789",
		};

		const updated = addProfile(original, "chicago", profile);

		expect(updated.profiles.chicago).toEqual(profile);
		expect(updated.profiles.nyc).toEqual({ domain: "data.cityofnewyork.us" });
		expect(updated.format).toBe("table");
	});

	it("does not mutate the original config", () => {
		const original: Config = {
			profiles: {
				nyc: { domain: "data.cityofnewyork.us" },
			},
		};

		const updated = addProfile(original, "chicago", {
			domain: "data.cityofchicago.org",
		});

		expect(original.profiles.chicago).toBeUndefined();
		expect(updated.profiles.chicago).toBeDefined();
	});

	it("replaces an existing profile", () => {
		const original: Config = {
			profiles: {
				nyc: { domain: "data.cityofnewyork.us", token: "old" },
			},
		};

		const updated = addProfile(original, "nyc", {
			domain: "data.cityofnewyork.us",
			token: "new",
		});

		expect(updated.profiles.nyc.token).toBe("new");
		expect(original.profiles.nyc.token).toBe("old");
	});
});
