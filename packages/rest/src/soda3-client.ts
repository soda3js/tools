import type { HttpClient } from "@effect/platform";
import { FetchHttpClient } from "@effect/platform";
import type { DatasetMetadata } from "@soda3js/client";
import { SodaClient, SodaClientConfig } from "@soda3js/client";
import { SoQL } from "@soda3js/soql";
import { Effect, Layer, Stream } from "effect";

export type { DatasetMetadata } from "@soda3js/client";

type SortDirection = "ASC" | "DESC";

function parseOrderBy(orderBy: string): [string, SortDirection] {
	const idx = orderBy.lastIndexOf(":");
	if (idx === -1) return [orderBy, "ASC"];
	const col = orderBy.slice(0, idx);
	const dir = orderBy.slice(idx + 1).toUpperCase();
	return [col, dir === "DESC" ? "DESC" : "ASC"];
}

export interface Soda3ClientConfig {
	readonly domain: string;
	readonly appToken?: string;
	readonly mode?: "auto" | "soda2" | "soda3";
}

export interface QueryOptions {
	readonly select?: ReadonlyArray<string>;
	readonly where?: string;
	readonly limit?: number;
	readonly offset?: number;
	readonly orderBy?: string;
}

export class Soda3ClientBase {
	private readonly domain: string;
	private readonly layer: Layer.Layer<SodaClient>;

	constructor(config: Soda3ClientConfig, platformLayer: Layer.Layer<HttpClient.HttpClient> = FetchHttpClient.layer) {
		this.domain = config.domain;

		const sodaConfig = new SodaClientConfig({
			...(config.appToken !== undefined ? { appToken: config.appToken } : {}),
			...(config.mode !== undefined ? { mode: config.mode } : {}),
		});

		this.layer = Layer.effect(SodaClient, SodaClient.makeSodaClient(sodaConfig)).pipe(Layer.provide(platformLayer));
	}

	private run<A>(f: (soda: SodaClient["Type"]) => Effect.Effect<A, never>): Promise<A> {
		const program = Effect.gen(function* () {
			const soda = yield* SodaClient;
			return yield* f(soda);
		});
		return Effect.runPromise(Effect.provide(program, this.layer));
	}

	query(datasetId: string, options: QueryOptions = {}): Promise<ReadonlyArray<Record<string, unknown>>> {
		let soql = SoQL.query();
		if (options.select) soql = soql.select(...options.select);
		if (options.where) soql = soql.where(SoQL.raw(options.where));
		if (options.limit !== undefined) soql = soql.limit(options.limit);
		if (options.offset !== undefined) soql = soql.offset(options.offset);
		if (options.orderBy) {
			const [col, dir] = parseOrderBy(options.orderBy);
			soql = soql.orderBy(col, dir);
		}

		return this.run((soda) => soda.query(this.domain, datasetId, soql).pipe(Effect.orDie));
	}

	metadata(datasetId: string): Promise<DatasetMetadata> {
		return this.run((soda) => soda.metadata(this.domain, datasetId).pipe(Effect.orDie));
	}

	async *queryAll(datasetId: string, options: QueryOptions = {}): AsyncIterableIterator<Record<string, unknown>> {
		let soql = SoQL.query();
		if (options.select) soql = soql.select(...options.select);
		if (options.where) soql = soql.where(SoQL.raw(options.where));
		if (options.limit !== undefined) soql = soql.limit(options.limit);
		if (options.offset !== undefined) soql = soql.offset(options.offset);
		if (options.orderBy) {
			const [col, dir] = parseOrderBy(options.orderBy);
			soql = soql.orderBy(col, dir);
		}

		const domain = this.domain;
		const stream = await this.run((soda) => soda.queryAll(domain, datasetId, soql).pipe(Effect.orDie));

		yield* Stream.toAsyncIterable(stream);
	}

	export_(datasetId: string, format: "csv" | "json" | "tsv"): ReadableStream<Uint8Array> {
		const domain = this.domain;
		const layer = this.layer;

		return new ReadableStream<Uint8Array>({
			start(controller) {
				const program = Effect.gen(function* () {
					const soda = yield* SodaClient;
					const stream = yield* soda.export_(domain, datasetId, format).pipe(Effect.orDie);
					yield* Stream.runForEach(stream, (chunk) => Effect.sync(() => controller.enqueue(chunk))).pipe(Effect.orDie);
				});

				Effect.runPromise(Effect.provide(program, layer))
					.then(() => controller.close())
					.catch((error) => controller.error(error));
			},
		});
	}
}
