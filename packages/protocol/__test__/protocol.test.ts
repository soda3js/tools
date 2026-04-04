import type { ColumnShape, DatasetMetadataShape, OwnerShape, SodaErrorResponseShape } from "@soda3js/protocol";
import { describe, expectTypeOf, it } from "vitest";

describe("protocol interfaces", () => {
	it("DatasetMetadataShape has required fields", () => {
		expectTypeOf<DatasetMetadataShape>().toHaveProperty("id");
		expectTypeOf<DatasetMetadataShape>().toHaveProperty("name");
		expectTypeOf<DatasetMetadataShape>().toHaveProperty("columns");
		expectTypeOf<DatasetMetadataShape>().toHaveProperty("owner");
		expectTypeOf<DatasetMetadataShape>().toHaveProperty("rowsUpdatedAt");
		expectTypeOf<DatasetMetadataShape>().toHaveProperty("viewLastModified");
	});

	it("DatasetMetadataShape columns is ColumnShape array", () => {
		expectTypeOf<DatasetMetadataShape["columns"]>().toEqualTypeOf<ColumnShape[]>();
	});

	it("DatasetMetadataShape owner is OwnerShape", () => {
		expectTypeOf<DatasetMetadataShape["owner"]>().toEqualTypeOf<OwnerShape>();
	});

	it("ColumnShape has required fields", () => {
		expectTypeOf<ColumnShape>().toHaveProperty("id");
		expectTypeOf<ColumnShape>().toHaveProperty("fieldName");
		expectTypeOf<ColumnShape>().toHaveProperty("dataTypeName");
		expectTypeOf<ColumnShape>().toHaveProperty("renderTypeName");
		expectTypeOf<ColumnShape>().toHaveProperty("position");
	});

	it("OwnerShape has required fields", () => {
		expectTypeOf<OwnerShape>().toHaveProperty("id");
		expectTypeOf<OwnerShape>().toHaveProperty("displayName");
	});

	it("SodaErrorResponseShape has required fields", () => {
		expectTypeOf<SodaErrorResponseShape>().toHaveProperty("code");
		expectTypeOf<SodaErrorResponseShape>().toHaveProperty("error");
		expectTypeOf<SodaErrorResponseShape>().toHaveProperty("message");
	});

	it("SodaErrorResponseShape.error is literal true", () => {
		expectTypeOf<SodaErrorResponseShape["error"]>().toEqualTypeOf<true>();
	});

	it("concrete object satisfies DatasetMetadataShape", () => {
		const obj = {
			id: "xxxx-yyyy",
			name: "Test",
			columns: [{ id: 1, fieldName: "col", dataTypeName: "text", renderTypeName: "text", position: 1 }],
			owner: { id: "owner-1", displayName: "Owner" },
			rowsUpdatedAt: 1234567890,
			viewLastModified: 1234567890,
		} satisfies DatasetMetadataShape;
		expectTypeOf(obj).toMatchTypeOf<DatasetMetadataShape>();
	});
});
