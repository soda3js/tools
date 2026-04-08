import { Box, Text } from "ink";
import type React from "react";

export interface SearchResult {
	readonly id: string;
	readonly name: string;
	readonly description: string;
	readonly type: string;
	readonly domain: string;
	readonly permalink: string;
}

export interface SearchResultsProps {
	readonly results: readonly SearchResult[];
	readonly totalCount: number;
}

function truncate(value: string, max: number): string {
	if (value.length <= max) return value;
	return `${value.slice(0, max - 3)}...`;
}

export function SearchResults({ results, totalCount }: SearchResultsProps): React.ReactElement {
	if (results.length === 0) {
		return <Text dimColor>(no results)</Text>;
	}

	return (
		<Box flexDirection="column">
			<Box marginBottom={1}>
				<Text>
					Found <Text bold>{totalCount}</Text> result(s)
				</Text>
			</Box>
			{results.map((result) => (
				<Box key={result.id} flexDirection="column" marginBottom={1}>
					<Box>
						<Text bold color="cyan">
							{truncate(result.name, 70)}
						</Text>
						<Text dimColor> ({result.type})</Text>
					</Box>
					<Box paddingLeft={2}>
						<Text dimColor>ID: </Text>
						<Text>{result.id}</Text>
						<Text dimColor> | Domain: </Text>
						<Text>{result.domain}</Text>
					</Box>
					{result.description.length > 0 && (
						<Box paddingLeft={2}>
							<Text dimColor>{truncate(result.description, 100)}</Text>
						</Box>
					)}
				</Box>
			))}
		</Box>
	);
}
