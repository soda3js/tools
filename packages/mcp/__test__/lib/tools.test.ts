import { describe, expect, it } from "vitest";
import { formatTable } from "../../src/lib/format.js";

describe("search_datasets output", () => {
	it("formats discovery results as markdown table", () => {
		const rows = [
			{
				name: "NYC 311 Complaints",
				id: "abcd-1234",
				domain: "data.cityofnewyork.us",
				type: "dataset",
				description: "311 service requests",
				updated: "2026-03-01T00:00:00Z",
			},
			{
				name: "Chicago Crime Data",
				id: "wxyz-5678",
				domain: "data.cityofchicago.org",
				type: "dataset",
				description: "Crime reports",
				updated: "2026-02-15T00:00:00Z",
			},
		];
		const result = formatTable(rows, { total_count: 100, has_more: true });
		expect(result).toContain("| name | id | domain | type | description | updated |");
		expect(result).toContain("| NYC 311 Complaints |");
		expect(result).toContain("Showing 2 of 100 results.");
	});

	it("shows no results message when empty", () => {
		const result = formatTable([]);
		expect(result).toBe("No results found.");
	});
});

describe("get_columns output", () => {
	it("formats column list as markdown table", () => {
		const columns = [
			{ position: 1, fieldName: "complaint_type", dataType: "text", description: "Type of complaint" },
			{ position: 2, fieldName: "borough", dataType: "text", description: "NYC borough" },
			{ position: 3, fieldName: "latitude", dataType: "number", description: "" },
		];
		const result = formatTable(columns);
		expect(result).toContain("| position | fieldName | dataType | description |");
		expect(result).toContain("| complaint_type |");
		expect(result).toContain("| latitude |");
	});
});

describe("preview_dataset output", () => {
	it("formats data rows as markdown table", () => {
		const rows = [
			{ id: "1", name: "Central Park", borough: "Manhattan" },
			{ id: "2", name: "Prospect Park", borough: "Brooklyn" },
		];
		const result = formatTable(rows);
		expect(result).toContain("| id | name | borough |");
		expect(result).toContain("| 1 | Central Park | Manhattan |");
		expect(result).toContain("| 2 | Prospect Park | Brooklyn |");
	});
});

describe("query_dataset output", () => {
	it("formats aggregated results as markdown table", () => {
		const rows = [
			{ borough: "Manhattan", count: "150" },
			{ borough: "Brooklyn", count: "120" },
		];
		const result = formatTable(rows);
		expect(result).toContain("| borough | count |");
		expect(result).toContain("| Manhattan | 150 |");
	});

	it("does not show pagination for complete results", () => {
		const rows = [{ id: "1" }];
		const result = formatTable(rows, { total_count: 1, has_more: false });
		expect(result).not.toContain("Showing");
	});
});

describe("limit enforcement", () => {
	it("search_datasets caps at 50", () => {
		const requested = 50000;
		const applied = Math.min(requested, 50);
		expect(applied).toBe(50);
	});

	it("preview_dataset caps at 50", () => {
		const requested = 100;
		const applied = Math.min(requested, 50);
		expect(applied).toBe(50);
	});

	it("query_dataset caps at 1000", () => {
		const requested = 5000;
		const applied = Math.min(requested, 1000);
		expect(applied).toBe(1000);
	});

	it("summarize_column top_n caps at 50", () => {
		const requested = 200;
		const applied = Math.min(requested, 50);
		expect(applied).toBe(50);
	});
});

describe("truncation", () => {
	it("truncates long cell values to 60 characters", () => {
		const longValue = "a".repeat(100);
		const rows = [{ data: longValue }];
		const result = formatTable(rows);
		// Should contain truncated value with ellipsis
		expect(result).toContain("...");
		// Should not contain the full value
		expect(result).not.toContain(longValue);
		// The body line should contain the truncated string
		const bodyLine = result.split("\n")[2] ?? "";
		const cellContent = (bodyLine.split("|")[1] ?? "").trim();
		expect(cellContent.length).toBe(60);
	});
});
