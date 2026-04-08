import { describe, expect, it } from "vitest";
import { formatMetadata, formatTable } from "../../src/lib/format.js";

describe("formatTable", () => {
	it("formats rows as markdown table", () => {
		const rows = [
			{ name: "Central Park", borough: "Manhattan" },
			{ name: "Prospect Park", borough: "Brooklyn" },
		];
		const result = formatTable(rows);
		expect(result).toContain("| name | borough |");
		expect(result).toContain("| Central Park | Manhattan |");
	});

	it("shows count when has_more is true", () => {
		const rows = [{ id: 1 }];
		const result = formatTable(rows, { total_count: 100, has_more: true });
		expect(result).toContain("Showing 1 of 100 results.");
	});

	it("returns empty message for no results", () => {
		expect(formatTable([])).toBe("No results found.");
	});

	it("truncates long values", () => {
		const longValue = "a".repeat(100);
		const rows = [{ data: longValue }];
		const result = formatTable(rows);
		expect(result).toContain("...");
		expect(result).not.toContain(longValue);
	});

	it("handles null and undefined values in cells", () => {
		const rows = [{ a: null, b: undefined, c: "ok" }];
		const result = formatTable(rows);
		expect(result).toContain("|  |  | ok |");
	});

	it("does not show pagination when has_more is false", () => {
		const rows = [{ id: 1 }];
		const result = formatTable(rows, { total_count: 1, has_more: false });
		expect(result).not.toContain("Showing");
	});
});

describe("formatMetadata", () => {
	it("formats all metadata fields", () => {
		const meta = {
			name: "NYC Parks",
			description: "A dataset of parks",
			rowsUpdatedAt: 1700000000,
		};
		const result = formatMetadata(meta);
		expect(result).toContain("**NYC Parks**");
		expect(result).toContain("A dataset of parks");
		expect(result).toContain("Last updated: 1700000000");
	});

	it("handles missing optional fields", () => {
		const result = formatMetadata({});
		expect(result).toBe("");
	});

	it("includes only name when other fields absent", () => {
		const result = formatMetadata({ name: "Test" });
		expect(result).toBe("**Test**");
	});

	it("includes only description when name absent", () => {
		const result = formatMetadata({ description: "Some data" });
		expect(result).toBe("Some data");
	});
});
