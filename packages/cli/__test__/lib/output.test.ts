import { describe, expect, it } from "vitest";
import { detectFormat, formatCsv, formatJson, formatNdjson, formatOutput, formatTable } from "../../src/lib/output.js";

const sampleRows = [
	{ name: "Alice", age: 30, city: "New York" },
	{ name: "Bob", age: 25, city: "Chicago" },
];

describe("detectFormat", () => {
	it("returns ndjson for non-TTY", () => {
		expect(detectFormat(10, false)).toBe("ndjson");
	});

	it("returns table for TTY with small results", () => {
		expect(detectFormat(50, true)).toBe("table");
	});

	it("returns json for TTY with large results", () => {
		expect(detectFormat(51, true)).toBe("json");
	});
});

describe("formatJson", () => {
	it("returns pretty-printed JSON array", () => {
		const result = formatJson(sampleRows);
		expect(JSON.parse(result)).toEqual(sampleRows);
		expect(result).toContain("\n"); // pretty-printed
	});

	it("handles empty array", () => {
		expect(formatJson([])).toBe("[]");
	});
});

describe("formatNdjson", () => {
	it("returns one JSON object per line", () => {
		const result = formatNdjson(sampleRows);
		const lines = result.split("\n");
		expect(lines).toHaveLength(2);
		expect(JSON.parse(lines[0])).toEqual(sampleRows[0]);
		expect(JSON.parse(lines[1])).toEqual(sampleRows[1]);
	});

	it("handles empty array", () => {
		expect(formatNdjson([])).toBe("");
	});
});

describe("formatCsv", () => {
	it("produces CSV with headers", () => {
		const result = formatCsv(sampleRows);
		const lines = result.split("\n");
		expect(lines[0]).toBe("name,age,city");
		expect(lines[1]).toBe("Alice,30,New York");
		expect(lines[2]).toBe("Bob,25,Chicago");
	});

	it("escapes fields with commas", () => {
		const rows = [{ value: "hello, world" }];
		const result = formatCsv(rows);
		expect(result).toContain('"hello, world"');
	});

	it("escapes fields with quotes", () => {
		const rows = [{ value: 'say "hi"' }];
		const result = formatCsv(rows);
		expect(result).toContain('"say ""hi"""');
	});

	it("returns empty string for empty array", () => {
		expect(formatCsv([])).toBe("");
	});
});

describe("formatTable", () => {
	it("returns aligned table with headers and separator", () => {
		const result = formatTable(sampleRows);
		const lines = result.split("\n");
		expect(lines).toHaveLength(4); // header + separator + 2 data rows
		expect(lines[0]).toContain("name");
		expect(lines[0]).toContain("age");
		expect(lines[0]).toContain("city");
		expect(lines[1]).toContain("─");
		expect(lines[1]).toContain("┼");
	});

	it("returns no-results message for empty array", () => {
		expect(formatTable([])).toBe("(no results)");
	});

	it("pads columns to max width", () => {
		const rows = [
			{ x: "short", y: "a" },
			{ x: "a", y: "longer value" },
		];
		const result = formatTable(rows);
		const lines = result.split("\n");
		// All data lines should have the same length due to padding
		expect(lines[2].length).toBe(lines[3].length);
	});
});

describe("formatOutput", () => {
	it("dispatches to table formatter", () => {
		expect(formatOutput(sampleRows, "table")).toBe(formatTable(sampleRows));
	});

	it("dispatches to json formatter", () => {
		expect(formatOutput(sampleRows, "json")).toBe(formatJson(sampleRows));
	});

	it("dispatches to ndjson formatter", () => {
		expect(formatOutput(sampleRows, "ndjson")).toBe(formatNdjson(sampleRows));
	});

	it("dispatches to csv formatter", () => {
		expect(formatOutput(sampleRows, "csv")).toBe(formatCsv(sampleRows));
	});
});
