import { describe, expect, it } from "vitest";
import { resolveMode } from "../src/utils/mode.js";

describe("resolveMode()", () => {
	it("returns soda2 when no token and mode is auto", () => {
		expect(resolveMode({ mode: "auto" })).toBe("soda2");
	});

	it("returns soda3 when token present and mode is auto", () => {
		expect(resolveMode({ mode: "auto", appToken: "tok_123" })).toBe("soda3");
	});

	it("returns soda2 when explicitly forced, even with token", () => {
		expect(resolveMode({ mode: "soda2", appToken: "tok_123" })).toBe("soda2");
	});

	it("returns soda3 when explicitly forced, even without token", () => {
		expect(resolveMode({ mode: "soda3" })).toBe("soda3");
	});

	it("defaults mode to auto when not specified", () => {
		expect(resolveMode({})).toBe("soda2");
		expect(resolveMode({ appToken: "tok_123" })).toBe("soda3");
	});
});
