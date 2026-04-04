import { redactHeaders, redactUrl } from "@soda3js/client";
import { describe, expect, it } from "vitest";

describe("redactUrl", () => {
	it("redacts $$app_token query parameter", () => {
		const url = "https://data.example.com/resource/xxxx-yyyy.json?$$app_token=secret123&$limit=10";
		expect(redactUrl(url)).toBe("https://data.example.com/resource/xxxx-yyyy.json?$$app_token=[REDACTED]&$limit=10");
	});

	it("returns url unchanged when no token present", () => {
		const url = "https://data.example.com/resource/xxxx-yyyy.json?$limit=10";
		expect(redactUrl(url)).toBe(url);
	});

	it("handles url with only token parameter", () => {
		const url = "https://data.example.com/resource/xxxx-yyyy.json?$$app_token=secret";
		expect(redactUrl(url)).toBe("https://data.example.com/resource/xxxx-yyyy.json?$$app_token=[REDACTED]");
	});

	it("handles url with no query string", () => {
		const url = "https://data.example.com/resource/xxxx-yyyy.json";
		expect(redactUrl(url)).toBe(url);
	});
});

describe("redactHeaders", () => {
	it("redacts x-app-token header", () => {
		const headers: Record<string, string> = {
			"x-app-token": "secret123",
			"content-type": "application/json",
		};
		const result = redactHeaders(headers);
		expect(result["x-app-token"]).toBe("[REDACTED]");
		expect(result["content-type"]).toBe("application/json");
	});

	it("is case-insensitive for header names", () => {
		const headers: Record<string, string> = {
			"X-App-Token": "secret123",
		};
		const result = redactHeaders(headers);
		expect(result["X-App-Token"]).toBe("[REDACTED]");
	});

	it("returns copy, does not mutate input", () => {
		const headers: Record<string, string> = {
			"x-app-token": "secret123",
		};
		const result = redactHeaders(headers);
		expect(headers["x-app-token"]).toBe("secret123");
		expect(result["x-app-token"]).toBe("[REDACTED]");
	});

	it("returns unchanged copy when no sensitive headers", () => {
		const headers: Record<string, string> = {
			"content-type": "application/json",
		};
		const result = redactHeaders(headers);
		expect(result).toEqual(headers);
		expect(result).not.toBe(headers);
	});
});
