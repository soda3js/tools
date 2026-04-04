import { Effect, Schema } from "effect";
import { describe, expect, it } from "vitest";
import { SodaAuthError } from "../src/errors/SodaAuthError.js";
import { SodaNotFoundError } from "../src/errors/SodaNotFoundError.js";
import { SodaQueryError } from "../src/errors/SodaQueryError.js";
import { SodaRateLimitError } from "../src/errors/SodaRateLimitError.js";
import { SodaServerError } from "../src/errors/SodaServerError.js";
import { SodaTimeoutError } from "../src/errors/SodaTimeoutError.js";

import error400 from "./fixtures/responses/error-400.json" with { type: "json" };
import error401 from "./fixtures/responses/error-401.json" with { type: "json" };
import error403 from "./fixtures/responses/error-403.json" with { type: "json" };
import error404 from "./fixtures/responses/error-404.json" with { type: "json" };
import error500 from "./fixtures/responses/error-500.json" with { type: "json" };

describe("SodaRateLimitError", () => {
	it("has correct _tag", () => {
		const err = new SodaRateLimitError({ retryAfter: 5000 });
		expect(err._tag).toBe("SodaRateLimitError");
	});

	it("exposes retryAfter field", () => {
		const err = new SodaRateLimitError({ retryAfter: 5000 });
		expect(err.retryAfter).toBe(5000);
	});

	it("has descriptive message containing 'Rate limited'", () => {
		const err = new SodaRateLimitError({ retryAfter: 5000 });
		expect(err.message).toContain("Rate limited");
	});
});

describe("SodaTimeoutError", () => {
	it("has correct _tag", () => {
		const err = new SodaTimeoutError({ timeout: 30000 });
		expect(err._tag).toBe("SodaTimeoutError");
	});

	it("exposes timeout field", () => {
		const err = new SodaTimeoutError({ timeout: 30000 });
		expect(err.timeout).toBe(30000);
	});

	it("has descriptive message containing 'timed out'", () => {
		const err = new SodaTimeoutError({ timeout: 30000 });
		expect(err.message).toContain("timed out");
	});
});

describe("SodaAuthError", () => {
	it("has correct _tag", () => {
		const err = new SodaAuthError({ code: "authentication_required", message: "Auth required." });
		expect(err._tag).toBe("SodaAuthError");
	});

	it("can be constructed with { code, message }", () => {
		const err = new SodaAuthError({ code: "authentication_required", message: "Auth required." });
		expect(err.code).toBe("authentication_required");
		expect(err.message).toBe("Auth required.");
	});

	it("can be decoded from 401 API response JSON via Schema.decode", async () => {
		// Schema.TaggedError encodes with _tag; middleware supplies _tag from HTTP status
		const input = { _tag: "SodaAuthError" as const, ...error401 };
		const result = await Effect.runPromise(Schema.decode(SodaAuthError)(input));
		expect(result._tag).toBe("SodaAuthError");
		expect(result.code).toBe("authentication_required");
	});

	it("can be decoded from 403 API response JSON via Schema.decode", async () => {
		const input = { _tag: "SodaAuthError" as const, ...error403 };
		const result = await Effect.runPromise(Schema.decode(SodaAuthError)(input));
		expect(result._tag).toBe("SodaAuthError");
		expect(result.code).toBe("permission_denied");
	});
});

describe("SodaQueryError", () => {
	it("has correct _tag", () => {
		const err = new SodaQueryError({ code: "query.compiler.malformed", message: "Bad query", soql: "SELEC *" });
		expect(err._tag).toBe("SodaQueryError");
	});

	it("includes soql field", () => {
		const err = new SodaQueryError({ code: "query.compiler.malformed", message: "Bad query", soql: "SELEC *" });
		expect(err.soql).toBe("SELEC *");
	});

	it("includes optional data field", () => {
		const err = new SodaQueryError({
			code: "query.compiler.malformed",
			message: "Bad query",
			soql: "SELEC *",
			data: { query: "SELEC *" },
		});
		expect(err.data).toEqual({ query: "SELEC *" });
	});

	it("can be decoded from 400 API response JSON via Schema.decode", async () => {
		// Middleware maps data.query -> soql before decode, or supplies soql directly
		const input = {
			_tag: "SodaQueryError" as const,
			...error400,
			soql: (error400.data as { query: string }).query,
		};
		const result = await Effect.runPromise(Schema.decode(SodaQueryError)(input));
		expect(result._tag).toBe("SodaQueryError");
		expect(result.soql).toBe("SELEC *");
	});
});

describe("SodaNotFoundError", () => {
	it("has correct _tag", () => {
		const err = new SodaNotFoundError({
			code: "not_found",
			message: "Not found.",
			domain: "data.cityofchicago.org",
			datasetId: "abcd-1234",
		});
		expect(err._tag).toBe("SodaNotFoundError");
	});

	it("exposes domain and datasetId fields", () => {
		const err = new SodaNotFoundError({
			code: "not_found",
			message: "Not found.",
			domain: "data.cityofchicago.org",
			datasetId: "abcd-1234",
		});
		expect(err.domain).toBe("data.cityofchicago.org");
		expect(err.datasetId).toBe("abcd-1234");
	});

	it("can be decoded from 404 API response JSON with domain and datasetId", async () => {
		const input = {
			_tag: "SodaNotFoundError" as const,
			...error404,
			domain: "data.cityofchicago.org",
			datasetId: "abcd-1234",
		};
		const result = await Effect.runPromise(Schema.decode(SodaNotFoundError)(input));
		expect(result._tag).toBe("SodaNotFoundError");
		expect(result.domain).toBe("data.cityofchicago.org");
		expect(result.datasetId).toBe("abcd-1234");
	});
});

describe("SodaServerError", () => {
	it("has correct _tag", () => {
		const err = new SodaServerError({ code: "internal_error", message: "Unexpected error." });
		expect(err._tag).toBe("SodaServerError");
	});

	it("includes optional requestId field", () => {
		const err = new SodaServerError({
			code: "internal_error",
			message: "Unexpected error.",
			requestId: "abc-123-def",
		});
		expect(err.requestId).toBe("abc-123-def");
	});

	it("requestId is optional", () => {
		const err = new SodaServerError({ code: "internal_error", message: "Unexpected error." });
		expect(err.requestId).toBeUndefined();
	});

	it("can be decoded from 500 API response JSON", async () => {
		const input = {
			_tag: "SodaServerError" as const,
			...error500,
			requestId: (error500.data as { requestId: string }).requestId,
		};
		const result = await Effect.runPromise(Schema.decode(SodaServerError)(input));
		expect(result._tag).toBe("SodaServerError");
		expect(result.requestId).toBe("abc-123-def");
	});
});
