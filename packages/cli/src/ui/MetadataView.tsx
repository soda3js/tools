import { Box, Text } from "ink";
import type React from "react";

export interface MetadataColumn {
	readonly fieldName: string;
	readonly dataTypeName: string;
	readonly description: string | undefined;
}

export interface MetadataViewProps {
	readonly name: string;
	readonly id: string;
	readonly description: string | undefined;
	readonly category: string | undefined;
	readonly rowsUpdatedAt: number;
	readonly columns: readonly MetadataColumn[];
}

export function MetadataView(props: MetadataViewProps): React.ReactElement {
	const updatedAt = new Date(props.rowsUpdatedAt * 1000).toISOString();

	return (
		<Box flexDirection="column">
			<Box>
				<Text bold color="cyan">
					{props.name}
				</Text>
			</Box>
			<Box paddingLeft={2}>
				<Text dimColor>ID: </Text>
				<Text>{props.id}</Text>
			</Box>
			{props.description !== undefined && (
				<Box paddingLeft={2}>
					<Text dimColor>Description: </Text>
					<Text>{props.description}</Text>
				</Box>
			)}
			{props.category !== undefined && (
				<Box paddingLeft={2}>
					<Text dimColor>Category: </Text>
					<Text>{props.category}</Text>
				</Box>
			)}
			<Box paddingLeft={2}>
				<Text dimColor>Last Updated: </Text>
				<Text>{updatedAt}</Text>
			</Box>

			{props.columns.length > 0 && (
				<Box flexDirection="column" marginTop={1}>
					<Text bold>Columns:</Text>
					<Box>
						<Box width={24}>
							<Text bold color="cyan">
								fieldName
							</Text>
						</Box>
						<Box width={16}>
							<Text bold color="cyan">
								dataTypeName
							</Text>
						</Box>
						<Box>
							<Text bold color="cyan">
								description
							</Text>
						</Box>
					</Box>
					<Box>
						<Box width={24}>
							<Text dimColor>{"\u2500".repeat(22)}</Text>
						</Box>
						<Box width={16}>
							<Text dimColor>{"\u2500".repeat(14)}</Text>
						</Box>
						<Box>
							<Text dimColor>{"\u2500".repeat(20)}</Text>
						</Box>
					</Box>
					{props.columns.map((col) => (
						<Box key={col.fieldName}>
							<Box width={24}>
								<Text>{col.fieldName}</Text>
							</Box>
							<Box width={16}>
								<Text color="green">{col.dataTypeName}</Text>
							</Box>
							<Box>
								<Text dimColor>{col.description ?? ""}</Text>
							</Box>
						</Box>
					))}
				</Box>
			)}
		</Box>
	);
}
