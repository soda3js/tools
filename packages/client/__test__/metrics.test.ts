import { errorsTotal, requestDuration, requestsTotal, retriesTotal } from "@soda3js/client";
import { describe, expect, it } from "vitest";

describe("metrics", () => {
	it("requestsTotal is defined", () => {
		expect(requestsTotal).toBeDefined();
	});

	it("requestDuration is defined", () => {
		expect(requestDuration).toBeDefined();
	});

	it("errorsTotal is defined", () => {
		expect(errorsTotal).toBeDefined();
	});

	it("retriesTotal is defined", () => {
		expect(retriesTotal).toBeDefined();
	});
});
