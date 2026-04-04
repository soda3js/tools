import { describe, expect, it } from "vitest";

describe("node entry", () => {
	it("exports Soda3Client", async () => {
		const mod = await import("../src/node.js");
		expect(mod.Soda3Client).toBeDefined();
	});

	it("exports NodeSodaClientLive", async () => {
		const mod = await import("../src/node.js");
		expect(mod.NodeSodaClientLive).toBeDefined();
	});

	it("NodeSodaClientLive returns a Layer", async () => {
		const mod = await import("../src/node.js");
		const layer = mod.NodeSodaClientLive();
		expect(layer).toBeDefined();
	});

	it("Soda3Client constructs with platform layer", async () => {
		const mod = await import("../src/node.js");
		const client = new mod.Soda3Client({ domain: "data.example.com" });
		expect(client).toBeDefined();
	});

	it("re-exports SodaClient from client", async () => {
		const mod = await import("../src/node.js");
		expect(mod.SodaClient).toBeDefined();
	});

	it("re-exports SoQL from client", async () => {
		const mod = await import("../src/node.js");
		expect(mod.SoQL).toBeDefined();
	});
});

describe("bun entry", () => {
	it("exports Soda3Client", async () => {
		const mod = await import("../src/bun.js");
		expect(mod.Soda3Client).toBeDefined();
	});

	it("exports BunSodaClientLive", async () => {
		const mod = await import("../src/bun.js");
		expect(mod.BunSodaClientLive).toBeDefined();
	});

	it("BunSodaClientLive returns a Layer", async () => {
		const mod = await import("../src/bun.js");
		const layer = mod.BunSodaClientLive();
		expect(layer).toBeDefined();
	});

	it("Soda3Client constructs with platform layer", async () => {
		const mod = await import("../src/bun.js");
		const client = new mod.Soda3Client({ domain: "data.example.com" });
		expect(client).toBeDefined();
	});
});

describe("browser entry", () => {
	it("exports Soda3Client", async () => {
		const mod = await import("../src/browser.js");
		expect(mod.Soda3Client).toBeDefined();
	});

	it("exports BrowserSodaClientLive", async () => {
		const mod = await import("../src/browser.js");
		expect(mod.BrowserSodaClientLive).toBeDefined();
	});

	it("BrowserSodaClientLive returns a Layer", async () => {
		const mod = await import("../src/browser.js");
		const layer = mod.BrowserSodaClientLive();
		expect(layer).toBeDefined();
	});

	it("Soda3Client constructs with platform layer", async () => {
		const mod = await import("../src/browser.js");
		const client = new mod.Soda3Client({ domain: "data.example.com" });
		expect(client).toBeDefined();
	});
});
