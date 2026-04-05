import { describe, expect, it } from "vitest";
import { formatMetadataTable, metaCommand } from "../../../src/cli/commands/meta.js";

const mockMetadata = {
	id: "abcd-1234",
	name: "Chicago Crime Data",
	description: "Reported crimes in the City of Chicago",
	assetType: "dataset",
	category: "Public Safety",
	tags: ["crime", "police"],
	columns: [
		{
			id: 1,
			fieldName: "case_number",
			dataTypeName: "text",
			description: "Unique case identifier",
			renderTypeName: "text",
			position: 1,
		},
		{
			id: 2,
			fieldName: "primary_type",
			dataTypeName: "text",
			description: "Primary crime classification",
			renderTypeName: "text",
			position: 2,
		},
		{
			id: 3,
			fieldName: "latitude",
			dataTypeName: "number",
			description: "",
			renderTypeName: "number",
			position: 3,
		},
	],
	owner: { id: "owner-1", displayName: "City of Chicago" },
	rowsUpdatedAt: 1705312800, // 2024-01-15T10:00:00.000Z
	viewLastModified: 1705315200,
};

describe("formatMetadataTable", () => {
	it("includes the dataset name", () => {
		const result = formatMetadataTable(mockMetadata as never);
		expect(result).toContain("Name: Chicago Crime Data");
	});

	it("includes the dataset ID", () => {
		const result = formatMetadataTable(mockMetadata as never);
		expect(result).toContain("ID: abcd-1234");
	});

	it("includes the description", () => {
		const result = formatMetadataTable(mockMetadata as never);
		expect(result).toContain("Description: Reported crimes in the City of Chicago");
	});

	it("includes the category", () => {
		const result = formatMetadataTable(mockMetadata as never);
		expect(result).toContain("Category: Public Safety");
	});

	it("converts rowsUpdatedAt to ISO date string", () => {
		const result = formatMetadataTable(mockMetadata as never);
		expect(result).toContain("Last Updated: 2024-01-15T10:00:00.000Z");
	});

	it("renders column field names in the table", () => {
		const result = formatMetadataTable(mockMetadata as never);
		expect(result).toContain("case_number");
		expect(result).toContain("primary_type");
		expect(result).toContain("latitude");
	});

	it("renders column data types in the table", () => {
		const result = formatMetadataTable(mockMetadata as never);
		expect(result).toContain("text");
		expect(result).toContain("number");
	});

	it("renders column descriptions in the table", () => {
		const result = formatMetadataTable(mockMetadata as never);
		expect(result).toContain("Unique case identifier");
		expect(result).toContain("Primary crime classification");
	});

	it("includes table separator characters", () => {
		const result = formatMetadataTable(mockMetadata as never);
		expect(result).toContain("\u2502"); // vertical bar
		expect(result).toContain("\u2500"); // horizontal line
		expect(result).toContain("\u253C"); // cross
	});

	it("omits description line when not present", () => {
		const minimal = { ...mockMetadata, description: undefined, category: undefined };
		const result = formatMetadataTable(minimal as never);
		expect(result).not.toContain("Description:");
		expect(result).not.toContain("Category:");
	});

	it("handles empty columns array", () => {
		const noColumns = { ...mockMetadata, columns: [] };
		const result = formatMetadataTable(noColumns as never);
		expect(result).toContain("Name: Chicago Crime Data");
		expect(result).not.toContain("Columns:");
	});
});

describe("metaCommand", () => {
	it("is defined", () => {
		expect(metaCommand).toBeDefined();
	});
});
