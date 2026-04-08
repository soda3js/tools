import { SodaClient } from "@soda3js/client";
import { SoQL, alias, count, max, min } from "@soda3js/soql";
import { Effect, Layer } from "effect";
import type { ColumnSummary } from "../services/QueryService.js";
import { QueryService } from "../services/QueryService.js";

export const QueryServiceLive = Layer.effect(
	QueryService,
	Effect.gen(function* () {
		const soda = yield* SodaClient;

		return {
			getMetadata: (domain, datasetId) => soda.metadata(domain, datasetId).pipe(Effect.catchAll((e) => Effect.die(e))),

			preview: (domain, datasetId, limit) =>
				soda.query(domain, datasetId, SoQL.query().limit(limit)).pipe(
					Effect.map((rows) => rows as ReadonlyArray<Record<string, unknown>>),
					Effect.catchAll((e) => Effect.die(e)),
				),

			query: (domain, datasetId, params) => {
				let q = SoQL.query();
				if (params.select) q = q.select(...params.select.split(",").map((s) => s.trim()));
				if (params.where) q = q.whereRaw(params.where);
				if (params.groupBy) q = q.groupBy(...params.groupBy.split(",").map((s) => s.trim()));
				if (params.orderBy) {
					const parts = params.orderBy.split(",");
					for (const part of parts) {
						const [col, dir] = part.trim().split(/\s+/);
						if (col) q = q.orderBy(col, dir?.toUpperCase() === "DESC" ? "DESC" : "ASC");
					}
				}
				if (params.limit !== undefined) q = q.limit(params.limit);
				if (params.offset !== undefined) q = q.offset(params.offset);
				return soda.query(domain, datasetId, q).pipe(
					Effect.map((rows) => rows as ReadonlyArray<Record<string, unknown>>),
					Effect.catchAll((e) => Effect.die(e)),
				);
			},

			summarizeColumn: (domain, datasetId, column, topN) => {
				const statsQuery = SoQL.query().select(
					alias(count("*"), "total"),
					alias(count(column, { distinct: true }), "distinct_cnt"),
					alias(min(column), "col_min"),
					alias(max(column), "col_max"),
				);
				const topQuery = SoQL.query()
					.select(column, alias(count("*"), "cnt"))
					.groupBy(column)
					.orderBy("cnt", "DESC")
					.limit(topN);
				const nullQuery = SoQL.query()
					.select(alias(count("*"), "null_cnt"))
					.whereRaw(`${column} IS NULL`);

				return Effect.all([
					soda.query(domain, datasetId, statsQuery),
					soda.query(domain, datasetId, topQuery),
					soda.query(domain, datasetId, nullQuery),
				]).pipe(
					Effect.map(([stats, top, nulls]) => {
						const s = (stats[0] as Record<string, unknown>) ?? {};
						const n = (nulls[0] as Record<string, unknown>) ?? {};
						return {
							fieldName: column,
							dataType: "unknown",
							totalCount: Number(s.total ?? 0),
							distinctCount: Number(s.distinct_cnt ?? 0),
							min: String(s.col_min ?? ""),
							max: String(s.col_max ?? ""),
							topValues: (top as ReadonlyArray<Record<string, unknown>>).map((r) => ({
								value: String(r[column] ?? ""),
								count: Number(r.cnt ?? 0),
							})),
							nullCount: Number(n.null_cnt ?? 0),
						} satisfies ColumnSummary;
					}),
					Effect.catchAll((e) => Effect.die(e)),
				);
			},
		};
	}),
);
