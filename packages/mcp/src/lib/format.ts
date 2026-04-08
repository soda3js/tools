export interface FormatMeta {
	readonly total_count?: number;
	readonly has_more?: boolean;
	readonly next_offset?: number;
	readonly columns?: readonly string[];
	readonly cache_hint?: "stable" | "live";
	readonly response_time_ms?: number;
}

export function formatTable(rows: ReadonlyArray<Record<string, unknown>>, meta?: FormatMeta): string {
	if (rows.length === 0) return "No results found.";
	const first = rows[0];
	if (!first) return "No results found.";
	const cols = Object.keys(first);
	const header = `| ${cols.join(" | ")} |`;
	const sep = `| ${cols.map(() => "---").join(" | ")} |`;
	const body = rows.map((r) => `| ${cols.map((c) => truncate(String(r[c] ?? ""), 60)).join(" | ")} |`).join("\n");
	let result = `${header}\n${sep}\n${body}`;
	if (meta?.total_count !== undefined && meta.has_more) {
		result += `\n\nShowing ${rows.length} of ${meta.total_count} results.`;
	}
	return result;
}

export function formatMetadata(meta: Record<string, unknown>): string {
	const lines: string[] = [];
	if (meta.name) lines.push(`**${meta.name}**`);
	if (meta.description) lines.push(String(meta.description));
	if (meta.rowsUpdatedAt) lines.push(`Last updated: ${meta.rowsUpdatedAt}`);
	return lines.join("\n\n");
}

function truncate(str: string, max: number): string {
	return str.length > max ? `${str.slice(0, max - 3)}...` : str;
}
