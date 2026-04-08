import { Effect } from "effect";
import { describe, expect, it, vi } from "vitest";
import type { ResponseContext, ResponseHooks } from "../src/utils/hooks.js";
import { runHook } from "../src/utils/hooks.js";

describe("response hooks", () => {
	it("invokes hook with result and context", async () => {
		const spy = vi.fn(() => Effect.void);
		const hooks: ResponseHooks = {
			query: { onResponse: spy },
		};
		const ctx: ResponseContext = {
			domain: "data.sfgov.org",
			datasetId: "yitu-d5am",
			endpoint: "query",
			timing: { requestMs: 42 },
		};
		await Effect.runPromise(runHook(hooks, "query", { data: "test" }, ctx));
		expect(spy).toHaveBeenCalledWith({ data: "test" }, ctx);
	});

	it("silently catches hook errors", async () => {
		const hooks: ResponseHooks = {
			query: {
				onResponse: () => Effect.die(new Error("hook failed")),
			},
		};
		const ctx: ResponseContext = {
			domain: "example.com",
			endpoint: "query",
			timing: { requestMs: 10 },
		};
		// Should not throw
		await Effect.runPromise(runHook(hooks, "query", [], ctx));
	});

	it("does nothing when no hook registered for endpoint", async () => {
		const hooks: ResponseHooks = {};
		const ctx: ResponseContext = {
			domain: "example.com",
			endpoint: "metadata",
			timing: { requestMs: 10 },
		};
		await Effect.runPromise(runHook(hooks, "metadata", {}, ctx));
	});
});
