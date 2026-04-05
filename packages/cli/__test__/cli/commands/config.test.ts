import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { addProfileToConfig, initConfig, showConfig } from "../../../src/cli/commands/config.js";

describe("config init", () => {
	let tmpDir: string;
	let cfgPath: string;

	beforeEach(async () => {
		tmpDir = await mkdtemp(join(tmpdir(), "soda3js-cfg-test-"));
		cfgPath = join(tmpDir, "soda3js", "config.toml");
	});

	afterEach(async () => {
		await rm(tmpDir, { recursive: true, force: true });
	});

	it("creates a config file with a profile", async () => {
		const result = await initConfig("data.cityofnewyork.us", "abc123", "default", cfgPath);
		expect(result.created).toBe(true);
		expect(result.configPath).toBe(cfgPath);

		const content = await readFile(cfgPath, "utf-8");
		expect(content).toContain("default_profile");
		expect(content).toContain("data.cityofnewyork.us");
		expect(content).toContain("abc123");
	});

	it("creates a config file without token when token is undefined", async () => {
		const result = await initConfig("data.cityofchicago.org", undefined, "chi", cfgPath);
		expect(result.created).toBe(true);

		const content = await readFile(cfgPath, "utf-8");
		expect(content).toContain("data.cityofchicago.org");
		expect(content).not.toContain("token");
	});

	it("does not overwrite an existing config file", async () => {
		await initConfig("data.cityofnewyork.us", undefined, "default", cfgPath);
		const result = await initConfig("data.other.org", undefined, "other", cfgPath);
		expect(result.created).toBe(false);

		const content = await readFile(cfgPath, "utf-8");
		expect(content).toContain("data.cityofnewyork.us");
		expect(content).not.toContain("data.other.org");
	});
});

describe("config show", () => {
	let tmpDir: string;
	let cfgPath: string;

	beforeEach(async () => {
		tmpDir = await mkdtemp(join(tmpdir(), "soda3js-cfg-test-"));
		cfgPath = join(tmpDir, "soda3js", "config.toml");
	});

	afterEach(async () => {
		await rm(tmpDir, { recursive: true, force: true });
	});

	it("returns exists=false when no config file exists", async () => {
		const result = await showConfig(join(tmpDir, "nonexistent", "config.toml"));
		expect(result.exists).toBe(false);
		expect(result.content).toBe("");
	});

	it("reads and returns the TOML content", async () => {
		await initConfig("data.cityofnewyork.us", "tok123", "default", cfgPath);
		const result = await showConfig(cfgPath);
		expect(result.exists).toBe(true);
		expect(result.content).toContain("data.cityofnewyork.us");
		expect(result.content).toContain("tok123");
	});
});

describe("config add-profile", () => {
	let tmpDir: string;
	let cfgPath: string;

	beforeEach(async () => {
		tmpDir = await mkdtemp(join(tmpdir(), "soda3js-cfg-test-"));
		cfgPath = join(tmpDir, "soda3js", "config.toml");
	});

	afterEach(async () => {
		await rm(tmpDir, { recursive: true, force: true });
	});

	it("adds a profile to an existing config", async () => {
		await initConfig("data.cityofnewyork.us", undefined, "default", cfgPath);
		await addProfileToConfig("chicago", "data.cityofchicago.org", "xyz789", cfgPath);

		const content = await readFile(cfgPath, "utf-8");
		expect(content).toContain("data.cityofnewyork.us");
		expect(content).toContain("data.cityofchicago.org");
		expect(content).toContain("xyz789");
	});

	it("adds a profile without token", async () => {
		await initConfig("data.cityofnewyork.us", undefined, "default", cfgPath);
		await addProfileToConfig("chicago", "data.cityofchicago.org", undefined, cfgPath);

		const content = await readFile(cfgPath, "utf-8");
		expect(content).toContain("data.cityofchicago.org");
		// The chicago profile section should not have a token key
		const chicagoSection = content.split("[profiles.chicago]")[1];
		expect(chicagoSection).toBeDefined();
		expect(chicagoSection?.split("[")[0]).not.toContain("token");
	});

	it("adds a profile to empty config when file does not exist", async () => {
		await addProfileToConfig("nyc", "data.cityofnewyork.us", "abc", cfgPath);

		const content = await readFile(cfgPath, "utf-8");
		expect(content).toContain("data.cityofnewyork.us");
		expect(content).toContain("abc");
	});
});
