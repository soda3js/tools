import { Effect, Exit, Schema } from "effect";
import { describe, expect, it } from "vitest";
import { Column } from "../src/schemas/Column.js";
import { DatasetMetadata } from "../src/schemas/DatasetMetadata.js";
import { Owner } from "../src/schemas/Owner.js";
import { SodaClientConfig } from "../src/schemas/SodaClientConfig.js";
import { SodaErrorResponse } from "../src/schemas/SodaErrorResponse.js";

import error400 from "./fixtures/responses/error-400.json" with { type: "json" };
import error401 from "./fixtures/responses/error-401.json" with { type: "json" };
import error500 from "./fixtures/responses/error-500.json" with { type: "json" };
import metadata from "./fixtures/responses/metadata.json" with { type: "json" };

// Use decodeUnknown throughout: we're testing runtime validation of arbitrary input
const decodeColumn = Schema.decodeUnknown(Column);
const decodeOwner = Schema.decodeUnknown(Owner);
const decodeMetadata = Schema.decodeUnknown(DatasetMetadata);
const decodeErrorResponse = Schema.decodeUnknown(SodaErrorResponse);

describe("Column", () => {
	it("decodes a valid column object", async () => {
		const input = {
			id: 552689589,
			fieldName: "unique_key",
			dataTypeName: "text",
			description: "Unique identifier",
			renderTypeName: "text",
			position: 1,
		};
		const result = await Effect.runPromise(decodeColumn(input));
		expect(result.id).toBe(552689589);
		expect(result.fieldName).toBe("unique_key");
		expect(result.dataTypeName).toBe("text");
		expect(result.description).toBe("Unique identifier");
		expect(result.renderTypeName).toBe("text");
		expect(result.position).toBe(1);
	});

	it("decodes a column without optional description", async () => {
		const input = {
			id: 552689589,
			fieldName: "unique_key",
			dataTypeName: "text",
			renderTypeName: "text",
			position: 1,
		};
		const result = await Effect.runPromise(decodeColumn(input));
		expect(result.description).toBeUndefined();
	});

	it("rejects column missing required fieldName", async () => {
		const input = { id: 552689589, dataTypeName: "text", renderTypeName: "text", position: 1 };
		const exit = await Effect.runPromiseExit(decodeColumn(input));
		expect(Exit.isFailure(exit)).toBe(true);
	});

	it("rejects column missing required id", async () => {
		const input = { fieldName: "unique_key", dataTypeName: "text", renderTypeName: "text", position: 1 };
		const exit = await Effect.runPromiseExit(decodeColumn(input));
		expect(Exit.isFailure(exit)).toBe(true);
	});
});

describe("Owner", () => {
	it("decodes a valid owner object", async () => {
		const input = { id: "txun-eb7e", displayName: "NYC OpenData" };
		const result = await Effect.runPromise(decodeOwner(input));
		expect(result.id).toBe("txun-eb7e");
		expect(result.displayName).toBe("NYC OpenData");
	});

	it("rejects owner missing displayName", async () => {
		const input = { id: "txun-eb7e" };
		const exit = await Effect.runPromiseExit(decodeOwner(input));
		expect(Exit.isFailure(exit)).toBe(true);
	});
});

describe("DatasetMetadata", () => {
	it("decodes the full metadata fixture", async () => {
		const result = await Effect.runPromise(decodeMetadata(metadata));
		expect(result.id).toBe("erm2-nwe9");
		expect(result.name).toBe("311 Service Requests from 2010 to Present");
	});

	it("timestamps are numbers (Unix epoch integers)", async () => {
		const result = await Effect.runPromise(decodeMetadata(metadata));
		expect(typeof result.rowsUpdatedAt).toBe("number");
		expect(typeof result.viewLastModified).toBe("number");
		expect(result.rowsUpdatedAt).toBe(1712200000);
		expect(result.viewLastModified).toBe(1712100000);
	});

	it("decodes columns array with correct length", async () => {
		const result = await Effect.runPromise(decodeMetadata(metadata));
		expect(result.columns).toHaveLength(3);
		expect(result.columns[0].fieldName).toBe("unique_key");
	});

	it("decodes owner sub-object", async () => {
		const result = await Effect.runPromise(decodeMetadata(metadata));
		expect(result.owner.id).toBe("txun-eb7e");
		expect(result.owner.displayName).toBe("NYC OpenData");
	});

	it("handles optional fields present in fixture", async () => {
		const result = await Effect.runPromise(decodeMetadata(metadata));
		expect(result.description).toBe("All 311 Service Requests from 2010 to present.");
		expect(result.assetType).toBe("dataset");
		expect(result.category).toBe("Social Services");
		expect(result.tags).toEqual(["311", "service request"]);
	});

	it("handles optional fields absent", async () => {
		const minimal = {
			id: "abcd-1234",
			name: "Minimal Dataset",
			columns: [],
			owner: { id: "user-1", displayName: "User One" },
			rowsUpdatedAt: 1712200000,
			viewLastModified: 1712100000,
		};
		const result = await Effect.runPromise(decodeMetadata(minimal));
		expect(result.description).toBeUndefined();
		expect(result.assetType).toBeUndefined();
		expect(result.category).toBeUndefined();
		expect(result.tags).toBeUndefined();
	});

	it("rejects metadata missing required id", async () => {
		const input = {
			name: "Missing ID",
			columns: [],
			owner: { id: "user-1", displayName: "User One" },
			rowsUpdatedAt: 1712200000,
			viewLastModified: 1712100000,
		};
		const exit = await Effect.runPromiseExit(decodeMetadata(input));
		expect(Exit.isFailure(exit)).toBe(true);
	});
});

describe("SodaErrorResponse", () => {
	it("decodes a 400 error response", async () => {
		const result = await Effect.runPromise(decodeErrorResponse(error400));
		expect(result.code).toBe("query.compiler.malformed");
		expect(result.error).toBe(true);
		expect(result.message).toContain("SoQL");
	});

	it("decodes a 401 error response", async () => {
		const result = await Effect.runPromise(decodeErrorResponse(error401));
		expect(result.code).toBe("authentication_required");
		expect(result.error).toBe(true);
	});

	it("decodes a 500 error response", async () => {
		const result = await Effect.runPromise(decodeErrorResponse(error500));
		expect(result.code).toBe("internal_error");
		expect(result.error).toBe(true);
	});

	it("decodes optional data field when present", async () => {
		const result = await Effect.runPromise(decodeErrorResponse(error400));
		expect(result.data).toBeDefined();
	});

	it("decodes when optional data field is absent", async () => {
		const result = await Effect.runPromise(decodeErrorResponse(error401));
		expect(result.data).toBeUndefined();
	});

	it("rejects { error: false }", async () => {
		const input = { code: "some_error", error: false, message: "Something went wrong" };
		const exit = await Effect.runPromiseExit(decodeErrorResponse(input));
		expect(Exit.isFailure(exit)).toBe(true);
	});

	it("rejects missing error field", async () => {
		const input = { code: "some_error", message: "Something went wrong" };
		const exit = await Effect.runPromiseExit(decodeErrorResponse(input));
		expect(Exit.isFailure(exit)).toBe(true);
	});
});

describe("SodaClientConfig", () => {
	it("decodes a full config", async () => {
		const input = {
			appToken: "my-token",
			mode: "auto",
		};
		const result = await Effect.runPromise(Schema.decodeUnknown(SodaClientConfig)(input));
		expect(result.appToken).toBe("my-token");
		expect(result.mode).toBe("auto");
	});

	it("decodes an empty config (all optional)", async () => {
		const result = await Effect.runPromise(Schema.decodeUnknown(SodaClientConfig)({}));
		expect(result.appToken).toBeUndefined();
	});

	it("rejects invalid mode", async () => {
		const exit = await Effect.runPromiseExit(Schema.decodeUnknown(SodaClientConfig)({ mode: "invalid" }));
		expect(Exit.isFailure(exit)).toBe(true);
	});
});
