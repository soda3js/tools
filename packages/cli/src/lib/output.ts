/**
 * Output formatters for CLI query results.
 *
 * Supports table, json, ndjson, and csv formats with TTY auto-detection.
 */

export type OutputFormat = "table" | "json" | "ndjson" | "csv";

/**
 * Detect the best default output format based on TTY status and result size.
 *
 * - TTY + small results (≤ 50 rows): table
 * - TTY + large results: json
 * - Non-TTY (piped): ndjson
 */
export function detectFormat(rowCount: number, isTTY = process.stdout.isTTY ?? false): OutputFormat {
	if (!isTTY) return "ndjson";
	return rowCount <= 50 ? "table" : "json";
}

/**
 * Format rows as pretty-printed JSON array.
 */
export function formatJson(rows: ReadonlyArray<Record<string, unknown>>): string {
	return JSON.stringify(rows, null, 2);
}

/**
 * Format rows as newline-delimited JSON (one object per line).
 */
export function formatNdjson(rows: ReadonlyArray<Record<string, unknown>>): string {
	return rows.map((row) => JSON.stringify(row)).join("\n");
}

/**
 * Format rows as CSV with headers derived from the first row.
 */
export function formatCsv(rows: ReadonlyArray<Record<string, unknown>>): string {
	if (rows.length === 0) return "";

	const headers = Object.keys(rows[0]);
	const lines = [headers.map(escapeCsvField).join(",")];

	for (const row of rows) {
		const values = headers.map((h) => escapeCsvField(String(row[h] ?? "")));
		lines.push(values.join(","));
	}

	return lines.join("\n");
}

function escapeCsvField(value: string): string {
	if (value.includes(",") || value.includes('"') || value.includes("\n")) {
		return `"${value.replace(/"/g, '""')}"`;
	}
	return value;
}

/**
 * Format rows as an aligned text table for terminal display.
 */
export function formatTable(rows: ReadonlyArray<Record<string, unknown>>): string {
	if (rows.length === 0) return "(no results)";

	const headers = Object.keys(rows[0]);
	const stringRows = rows.map((row) => headers.map((h) => String(row[h] ?? "")));

	// Calculate column widths
	const widths = headers.map((h, i) => Math.max(h.length, ...stringRows.map((r) => r[i].length)));

	const separator = widths.map((w) => "─".repeat(w + 2)).join("┼");
	const headerLine = headers.map((h, i) => ` ${h.padEnd(widths[i])} `).join("│");
	const dataLines = stringRows.map((row) => row.map((cell, i) => ` ${cell.padEnd(widths[i])} `).join("│"));

	return [headerLine, separator, ...dataLines].join("\n");
}

/**
 * Format rows using the specified format.
 */
export function formatOutput(rows: ReadonlyArray<Record<string, unknown>>, format: OutputFormat): string {
	switch (format) {
		case "table":
			return formatTable(rows);
		case "json":
			return formatJson(rows);
		case "ndjson":
			return formatNdjson(rows);
		case "csv":
			return formatCsv(rows);
	}
}
