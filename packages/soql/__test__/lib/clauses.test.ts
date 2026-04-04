import { describe, expect, it } from "vitest";
import type { Clauses } from "../../src/lib/clauses.js";
import {
	groupByClause,
	havingClause,
	limitClause,
	offsetClause,
	orderByClause,
	searchClause,
	selectClause,
	whereClause,
} from "../../src/lib/clauses.js";
import { column } from "../../src/lib/expressions.js";
import { eq } from "../../src/lib/functions.js";

describe("selectClause()", () => {
	it("creates a Select clause", () => {
		const clause = selectClause([column("name"), column("borough")], false);
		expect(clause).toEqual({
			_tag: "Select",
			expressions: [
				{ _tag: "Column", name: "name" },
				{ _tag: "Column", name: "borough" },
			],
			distinct: false,
		});
	});

	it("creates a SELECT DISTINCT clause", () => {
		const clause = selectClause([column("borough")], true);
		expect(clause.distinct).toBe(true);
	});
});

describe("whereClause()", () => {
	it("creates a Where clause", () => {
		const clause = whereClause(eq("borough", "BROOKLYN"));
		expect(clause._tag).toBe("Where");
		expect(clause.expression._tag).toBe("BinaryOp");
	});
});

describe("orderByClause()", () => {
	it("creates an OrderBy clause with ASC default", () => {
		const clause = orderByClause([{ expression: column("name"), direction: "ASC" }]);
		expect(clause).toEqual({
			_tag: "OrderBy",
			items: [{ expression: { _tag: "Column", name: "name" }, direction: "ASC" }],
		});
	});

	it("supports multiple order items", () => {
		const clause = orderByClause([
			{ expression: column("borough"), direction: "ASC" },
			{ expression: column("name"), direction: "DESC" },
		]);
		expect(clause.items).toHaveLength(2);
	});
});

describe("groupByClause()", () => {
	it("creates a GroupBy clause", () => {
		const clause = groupByClause([column("borough")]);
		expect(clause).toEqual({
			_tag: "GroupBy",
			expressions: [{ _tag: "Column", name: "borough" }],
		});
	});
});

describe("havingClause()", () => {
	it("creates a Having clause", () => {
		const clause = havingClause(eq("total", 10));
		expect(clause._tag).toBe("Having");
	});
});

describe("limitClause()", () => {
	it("creates a Limit clause", () => {
		expect(limitClause(25)).toEqual({ _tag: "Limit", count: 25 });
	});
});

describe("offsetClause()", () => {
	it("creates an Offset clause", () => {
		expect(offsetClause(50)).toEqual({ _tag: "Offset", count: 50 });
	});
});

describe("searchClause()", () => {
	it("creates a Search clause", () => {
		expect(searchClause("fire")).toEqual({ _tag: "Search", term: "fire" });
	});
});

describe("Clauses bag", () => {
	it("allows partial clause sets", () => {
		const clauses: Clauses = {
			select: selectClause([column("name")], false),
			limit: limitClause(10),
		};
		expect(clauses.select).toBeDefined();
		expect(clauses.where).toBeUndefined();
		expect(clauses.limit).toBeDefined();
	});

	it("allows a fully populated clause set", () => {
		const clauses: Clauses = {
			select: selectClause([column("name")], false),
			where: whereClause(eq("borough", "BROOKLYN")),
			orderBy: orderByClause([{ expression: column("name"), direction: "ASC" }]),
			groupBy: groupByClause([column("borough")]),
			having: havingClause(eq("total", 10)),
			limit: limitClause(25),
			offset: offsetClause(50),
			search: searchClause("fire"),
		};
		expect(Object.keys(clauses)).toHaveLength(8);
	});
});
