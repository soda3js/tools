import { Chunk, Effect, Stream } from "effect";
import { describe, expect, it } from "vitest";
import { paginateSoda2, paginateSoda3 } from "../src/utils/pagination.js";

describe("paginateSoda2()", () => {
	it("fetches pages until empty response", async () => {
		const pages = [[{ id: 1 }, { id: 2 }], [{ id: 3 }, { id: 4 }], []];
		let pageIndex = 0;

		const stream = paginateSoda2({
			pageSize: 2,
			fetchPage: (_limit, _offset) => Effect.succeed(pages[pageIndex++] as Array<{ id: number }>),
		});

		const result = await Effect.runPromise(Stream.runCollect(stream).pipe(Effect.map(Chunk.toReadonlyArray)));
		expect(result).toEqual([{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }]);
	});

	it("passes correct limit and offset to fetchPage", async () => {
		const calls: Array<{ limit: number; offset: number }> = [];
		const pages = [[{ id: 1 }], []];
		let pageIndex = 0;

		const stream = paginateSoda2({
			pageSize: 10,
			fetchPage: (limit, offset) => {
				calls.push({ limit, offset });
				return Effect.succeed(pages[pageIndex++] as Array<{ id: number }>);
			},
		});

		await Effect.runPromise(Stream.runCollect(stream));
		expect(calls).toEqual([
			{ limit: 10, offset: 0 },
			{ limit: 10, offset: 10 },
		]);
	});

	it("handles single empty page", async () => {
		const stream = paginateSoda2({
			pageSize: 10,
			fetchPage: () => Effect.succeed([]),
		});
		const result = await Effect.runPromise(Stream.runCollect(stream).pipe(Effect.map(Chunk.toReadonlyArray)));
		expect(result).toEqual([]);
	});
});

describe("paginateSoda3()", () => {
	it("fetches pages using page number", async () => {
		const pages = [[{ id: 1 }, { id: 2 }], []];
		let pageIndex = 0;

		const stream = paginateSoda3({
			pageSize: 2,
			fetchPage: (_pageNumber, _pageSize) => Effect.succeed(pages[pageIndex++] as Array<{ id: number }>),
		});

		const result = await Effect.runPromise(Stream.runCollect(stream).pipe(Effect.map(Chunk.toReadonlyArray)));
		expect(result).toEqual([{ id: 1 }, { id: 2 }]);
	});

	it("passes correct page number and size", async () => {
		const calls: Array<{ pageNumber: number; pageSize: number }> = [];
		const pages = [[{ id: 1 }], []];
		let pageIndex = 0;

		const stream = paginateSoda3({
			pageSize: 50,
			fetchPage: (pageNumber, pageSize) => {
				calls.push({ pageNumber, pageSize });
				return Effect.succeed(pages[pageIndex++] as Array<{ id: number }>);
			},
		});

		await Effect.runPromise(Stream.runCollect(stream));
		expect(calls).toEqual([
			{ pageNumber: 1, pageSize: 50 },
			{ pageNumber: 2, pageSize: 50 },
		]);
	});
});
