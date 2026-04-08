import type { DatasetMetadata } from "@soda3js/client";
import type { Effect } from "effect";
import { Context } from "effect";

export interface ColumnSummary {
	readonly fieldName: string;
	readonly dataType: string;
	readonly nullCount: number;
	readonly totalCount: number;
	readonly distinctCount: number;
	readonly topValues: readonly { value: string; count: number }[];
	readonly min?: string | undefined;
	readonly max?: string | undefined;
	readonly avg?: number | undefined;
}

export class QueryService extends Context.Tag("@soda3js/mcp/QueryService")<
	QueryService,
	{
		readonly getMetadata: (domain: string, datasetId: string) => Effect.Effect<DatasetMetadata>;
		readonly preview: (
			domain: string,
			datasetId: string,
			limit: number,
		) => Effect.Effect<ReadonlyArray<Record<string, unknown>>>;
		readonly query: (
			domain: string,
			datasetId: string,
			params: {
				select?: string | undefined;
				where?: string | undefined;
				groupBy?: string | undefined;
				orderBy?: string | undefined;
				limit?: number | undefined;
				offset?: number | undefined;
			},
		) => Effect.Effect<ReadonlyArray<Record<string, unknown>>>;
		readonly summarizeColumn: (
			domain: string,
			datasetId: string,
			column: string,
			topN: number,
		) => Effect.Effect<ColumnSummary>;
	}
>() {}
