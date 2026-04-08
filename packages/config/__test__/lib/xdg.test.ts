import { homedir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { cacheDir, configDir, configPath, dataDir, runtimeDir, stateDir } from "../../src/lib/xdg.js";

describe("XDG path resolution", () => {
	const originalEnv = { ...process.env };

	afterEach(() => {
		process.env = { ...originalEnv };
	});

	describe("configDir", () => {
		it("uses XDG_CONFIG_HOME when set", () => {
			process.env.XDG_CONFIG_HOME = "/custom/config";
			expect(configDir()).toBe("/custom/config/soda3js");
		});

		it("falls back to ~/.config when XDG_CONFIG_HOME is not set", () => {
			delete process.env.XDG_CONFIG_HOME;
			expect(configDir()).toBe(join(homedir(), ".config", "soda3js"));
		});

		it("ignores empty string XDG_CONFIG_HOME", () => {
			process.env.XDG_CONFIG_HOME = "";
			expect(configDir()).toBe(join(homedir(), ".config", "soda3js"));
		});
	});

	describe("cacheDir", () => {
		it("uses XDG_CACHE_HOME when set", () => {
			process.env.XDG_CACHE_HOME = "/custom/cache";
			expect(cacheDir()).toBe("/custom/cache/soda3js");
		});

		it("falls back to ~/.cache when XDG_CACHE_HOME is not set", () => {
			delete process.env.XDG_CACHE_HOME;
			expect(cacheDir()).toBe(join(homedir(), ".cache", "soda3js"));
		});
	});

	describe("stateDir", () => {
		it("uses XDG_STATE_HOME when set", () => {
			process.env.XDG_STATE_HOME = "/custom/state";
			expect(stateDir()).toBe("/custom/state/soda3js");
		});

		it("falls back to ~/.local/state when not set", () => {
			delete process.env.XDG_STATE_HOME;
			expect(stateDir()).toBe(join(homedir(), ".local", "state", "soda3js"));
		});
	});

	describe("dataDir", () => {
		it("uses XDG_DATA_HOME when set", () => {
			process.env.XDG_DATA_HOME = "/custom/data";
			expect(dataDir()).toBe("/custom/data/soda3js");
		});

		it("falls back to ~/.local/share when not set", () => {
			delete process.env.XDG_DATA_HOME;
			expect(dataDir()).toBe(join(homedir(), ".local", "share", "soda3js"));
		});
	});

	describe("runtimeDir", () => {
		it("uses XDG_RUNTIME_DIR when set", () => {
			process.env.XDG_RUNTIME_DIR = "/run/user/1000";
			expect(runtimeDir()).toBe("/run/user/1000/soda3js");
		});

		it("returns undefined when XDG_RUNTIME_DIR is not set", () => {
			delete process.env.XDG_RUNTIME_DIR;
			expect(runtimeDir()).toBeUndefined();
		});
	});

	describe("configPath", () => {
		it("returns config.toml inside configDir", () => {
			process.env.XDG_CONFIG_HOME = "/custom/config";
			expect(configPath()).toBe("/custom/config/soda3js/config.toml");
		});
	});
});
