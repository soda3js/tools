import { homedir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { cacheDir, stateDir } from "../../src/lib/xdg.js";

describe("XDG path resolution", () => {
	const originalEnv = { ...process.env };

	afterEach(() => {
		process.env = { ...originalEnv };
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

		it("falls back to ~/.local/state when XDG_STATE_HOME is not set", () => {
			delete process.env.XDG_STATE_HOME;
			expect(stateDir()).toBe(join(homedir(), ".local", "state", "soda3js"));
		});
	});
});
