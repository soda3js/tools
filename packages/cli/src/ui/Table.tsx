import { Box, Text } from "ink";
import type React from "react";

export interface TableColumn {
	readonly key: string;
	readonly label?: string;
	readonly maxWidth?: number;
}

export interface TableProps {
	readonly data: ReadonlyArray<Record<string, unknown>>;
	readonly columns?: readonly TableColumn[];
	readonly maxColumnWidth?: number;
}

function truncate(value: string, max: number): string {
	if (value.length <= max) return value;
	return `${value.slice(0, max - 3)}...`;
}

function resolveColumns(
	data: ReadonlyArray<Record<string, unknown>>,
	columns?: readonly TableColumn[],
): readonly TableColumn[] {
	if (columns !== undefined && columns.length > 0) return columns;
	if (data.length === 0) return [];
	return Object.keys(data[0]).map((key) => ({ key }));
}

function computeWidths(
	cols: readonly TableColumn[],
	data: ReadonlyArray<Record<string, unknown>>,
	maxColumnWidth: number,
): readonly number[] {
	return cols.map((col) => {
		const label = col.label ?? col.key;
		const maxData = data.reduce((max, row) => {
			const val = String(row[col.key] ?? "");
			return Math.max(max, val.length);
		}, 0);
		const natural = Math.max(label.length, maxData);
		const limit = col.maxWidth ?? maxColumnWidth;
		return Math.min(natural, limit);
	});
}

export function Table({ data, columns, maxColumnWidth = 40 }: TableProps): React.ReactElement {
	if (data.length === 0) {
		return <Text dimColor>(no results)</Text>;
	}

	const cols = resolveColumns(data, columns);
	const widths = computeWidths(cols, data, maxColumnWidth);

	return (
		<Box flexDirection="column">
			<Box>
				{cols.map((col, i) => (
					<Box key={col.key} width={widths[i] + 2}>
						<Text bold color="cyan">
							{(col.label ?? col.key).padEnd(widths[i])}
						</Text>
					</Box>
				))}
			</Box>
			<Box>
				{cols.map((col, i) => (
					<Box key={col.key} width={widths[i] + 2}>
						<Text dimColor>{"\u2500".repeat(widths[i])}</Text>
					</Box>
				))}
			</Box>
			{data.map((row) => {
				const rowKey = cols.map((col) => String(row[col.key] ?? "")).join("|");
				return (
					<Box key={rowKey}>
						{cols.map((col, i) => {
							const val = truncate(String(row[col.key] ?? ""), widths[i]);
							return (
								<Box key={col.key} width={widths[i] + 2}>
									<Text>{val.padEnd(widths[i])}</Text>
								</Box>
							);
						})}
					</Box>
				);
			})}
		</Box>
	);
}
