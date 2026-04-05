import { describe, expect, it } from "vitest";
import { createFaultInjector } from "../../src/lib/fault-injector.js";
import type { FaultRule, ParsedRequest } from "../../src/lib/types.js";

function makeReq(overrides: Partial<ParsedRequest> = {}): ParsedRequest {
	return {
		method: "GET",
		path: "/resource/test-1234.json",
		query: {},
		headers: {},
		body: null,
		...overrides,
	};
}

describe("createFaultInjector", () => {
	it("returns null when no rules match", () => {
		const injector = createFaultInjector([]);
		expect(injector.check(makeReq())).toBeNull();
	});

	it("matches by dataset ID in path", () => {
		const rules: FaultRule[] = [{ match: "test-1234", status: 429 }];
		const injector = createFaultInjector(rules);
		const result = injector.check(makeReq());
		expect(result).not.toBeNull();
		expect(result?.status).toBe(429);
	});

	it("does not match unrelated dataset", () => {
		const rules: FaultRule[] = [{ match: "other-5678", status: 429 }];
		const injector = createFaultInjector(rules);
		expect(injector.check(makeReq())).toBeNull();
	});

	it("matches wildcard rule", () => {
		const rules: FaultRule[] = [{ match: "*", status: 500 }];
		const injector = createFaultInjector(rules);
		expect(injector.check(makeReq())?.status).toBe(500);
	});

	it("matches route pattern with glob", () => {
		const rules: FaultRule[] = [{ match: "/api/views/*/json", type: "timeout", delay_ms: 5000 }];
		const injector = createFaultInjector(rules);
		const req = makeReq({ path: "/api/views/test-1234/rows.json" });
		const result = injector.check(req);
		expect(result).not.toBeNull();
		expect(result?.type).toBe("timeout");
	});

	it("respects after count - skips first N requests", () => {
		const rules: FaultRule[] = [{ match: "test-1234", after: 2, status: 429 }];
		const injector = createFaultInjector(rules);
		const req = makeReq();
		expect(injector.check(req)).toBeNull();
		expect(injector.check(req)).toBeNull();
		expect(injector.check(req)?.status).toBe(429);
		expect(injector.check(req)?.status).toBe(429);
	});

	it("matches without_auth when no token header present", () => {
		const rules: FaultRule[] = [{ match: "*", without_auth: true, status: 401 }];
		const injector = createFaultInjector(rules);
		expect(injector.check(makeReq())?.status).toBe(401);
		expect(injector.check(makeReq({ headers: { "x-app-token": "valid" } }))).toBeNull();
	});
});
