import { Chunk, Effect, Option, Stream } from "effect";

export function paginateSoda2<R, E, A>(options: {
	readonly pageSize: number;
	readonly fetchPage: (limit: number, offset: number) => Effect.Effect<ReadonlyArray<A>, E, R>;
}): Stream.Stream<A, E, R> {
	return Stream.paginateChunkEffect(0, (offset) =>
		Effect.map(options.fetchPage(options.pageSize, offset), (rows) => [
			Chunk.fromIterable(rows),
			rows.length > 0 ? Option.some(offset + options.pageSize) : Option.none(),
		]),
	);
}

export function paginateSoda3<R, E, A>(options: {
	readonly pageSize: number;
	readonly fetchPage: (pageNumber: number, pageSize: number) => Effect.Effect<ReadonlyArray<A>, E, R>;
}): Stream.Stream<A, E, R> {
	return Stream.paginateChunkEffect(1, (pageNumber) =>
		Effect.map(options.fetchPage(pageNumber, options.pageSize), (rows) => [
			Chunk.fromIterable(rows),
			rows.length > 0 ? Option.some(pageNumber + 1) : Option.none(),
		]),
	);
}
