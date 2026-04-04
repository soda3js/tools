import { isColumnShape, isDatasetMetadataShape, isOwnerShape, isSodaErrorResponseShape } from "@soda3js/protocol";
import { describe, expect, it } from "vitest";

const validColumn = { id: 1, fieldName: "col", dataTypeName: "text", renderTypeName: "text", position: 1 };
const validOwner = { id: "owner-1", displayName: "Owner" };
const validMetadata = {
	id: "xxxx-yyyy",
	name: "Test Dataset",
	columns: [validColumn],
	owner: validOwner,
	rowsUpdatedAt: 1234567890,
	viewLastModified: 1234567890,
};

describe("isColumnShape", () => {
	it("accepts valid column", () => {
		expect(isColumnShape(validColumn)).toBe(true);
	});

	it("accepts column with extra fields", () => {
		expect(isColumnShape({ ...validColumn, extra: "ignored" })).toBe(true);
	});

	it("rejects null", () => {
		expect(isColumnShape(null)).toBe(false);
	});

	it("rejects array", () => {
		expect(isColumnShape([])).toBe(false);
	});

	it("rejects missing fieldName", () => {
		expect(isColumnShape({ id: 1, dataTypeName: "text", renderTypeName: "text", position: 1 })).toBe(false);
	});

	it("rejects wrong id type", () => {
		expect(isColumnShape({ ...validColumn, id: "not-a-number" })).toBe(false);
	});
});

describe("isOwnerShape", () => {
	it("accepts valid owner", () => {
		expect(isOwnerShape(validOwner)).toBe(true);
	});

	it("rejects missing displayName", () => {
		expect(isOwnerShape({ id: "owner-1" })).toBe(false);
	});

	it("rejects non-object", () => {
		expect(isOwnerShape("string")).toBe(false);
	});
});

describe("isDatasetMetadataShape", () => {
	it("accepts valid metadata", () => {
		expect(isDatasetMetadataShape(validMetadata)).toBe(true);
	});

	it("accepts metadata with optional fields", () => {
		expect(
			isDatasetMetadataShape({
				...validMetadata,
				description: "A dataset",
				category: "Public Safety",
				tags: ["crime", "police"],
			}),
		).toBe(true);
	});

	it("rejects missing id", () => {
		const { id: _, ...rest } = validMetadata;
		expect(isDatasetMetadataShape(rest)).toBe(false);
	});

	it("rejects invalid column in array", () => {
		expect(isDatasetMetadataShape({ ...validMetadata, columns: [{ bad: true }] })).toBe(false);
	});

	it("rejects non-array columns", () => {
		expect(isDatasetMetadataShape({ ...validMetadata, columns: "not-array" })).toBe(false);
	});

	it("rejects invalid owner", () => {
		expect(isDatasetMetadataShape({ ...validMetadata, owner: { missing: true } })).toBe(false);
	});

	it("rejects non-object", () => {
		expect(isDatasetMetadataShape(42)).toBe(false);
	});
});

describe("isSodaErrorResponseShape", () => {
	it("accepts valid error response", () => {
		expect(isSodaErrorResponseShape({ code: "not_found", error: true, message: "Not found" })).toBe(true);
	});

	it("accepts error with optional data", () => {
		expect(
			isSodaErrorResponseShape({ code: "query_error", error: true, message: "Bad query", data: { details: [] } }),
		).toBe(true);
	});

	it("rejects error: false", () => {
		expect(isSodaErrorResponseShape({ code: "x", error: false, message: "y" })).toBe(false);
	});

	it("rejects missing code", () => {
		expect(isSodaErrorResponseShape({ error: true, message: "y" })).toBe(false);
	});

	it("rejects non-object", () => {
		expect(isSodaErrorResponseShape(null)).toBe(false);
	});
});
