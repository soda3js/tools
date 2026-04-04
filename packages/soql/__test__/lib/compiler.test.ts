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
import { compileExpression, compileToBody, compileToParams } from "../../src/lib/compiler.js";
import { alias, binaryOp, column, functionCall, literal, raw, unaryOp } from "../../src/lib/expressions.js";
import { count, eq, gt } from "../../src/lib/functions.js";

describe("compileExpression()", () => {
	describe("Column", () => {
		it("compiles a simple column name", () => {
			expect(compileExpression(column("borough"))).toBe("borough");
		});

		it("backtick-quotes column names with spaces", () => {
			expect(compileExpression(column("first name"))).toBe("`first name`");
		});

		it("does not quote system columns starting with :", () => {
			expect(compileExpression(column(":id"))).toBe(":id");
		});

		it("backtick-quotes column names with hyphens", () => {
			expect(compileExpression(column("my-column"))).toBe("`my-column`");
		});

		it("backtick-quotes column names with dots", () => {
			expect(compileExpression(column("geo.lat"))).toBe("`geo.lat`");
		});
	});

	describe("Literal", () => {
		it("compiles a string with single quotes", () => {
			expect(compileExpression(literal("BROOKLYN"))).toBe("'BROOKLYN'");
		});

		it("escapes single quotes by doubling", () => {
			expect(compileExpression(literal("Bob's"))).toBe("'Bob''s'");
		});

		it("handles strings with multiple quotes", () => {
			expect(compileExpression(literal("it's Bob's"))).toBe("'it''s Bob''s'");
		});

		it("compiles a number", () => {
			expect(compileExpression(literal(100000))).toBe("100000");
		});

		it("compiles a float", () => {
			expect(compileExpression(literal(3.14))).toBe("3.14");
		});

		it("compiles a negative number", () => {
			expect(compileExpression(literal(-5))).toBe("-5");
		});

		it("compiles true as lowercase", () => {
			expect(compileExpression(literal(true))).toBe("true");
		});

		it("compiles false as lowercase", () => {
			expect(compileExpression(literal(false))).toBe("false");
		});

		it("compiles null", () => {
			expect(compileExpression(literal(null))).toBe("null");
		});
	});

	describe("FunctionCall", () => {
		it("compiles a function with one arg", () => {
			expect(compileExpression(functionCall("upper", [column("name")]))).toBe("upper(name)");
		});

		it("compiles a function with multiple args", () => {
			expect(
				compileExpression(
					functionCall("within_circle", [column("location"), literal(40.7128), literal(-74.006), literal(5000)]),
				),
			).toBe("within_circle(location, 40.7128, -74.006, 5000)");
		});

		it("compiles count(*) with raw star", () => {
			expect(compileExpression(functionCall("count", [raw("*")]))).toBe("count(*)");
		});

		it("literal star is quoted (not special-cased)", () => {
			expect(compileExpression(functionCall("count", [literal("*")]))).toBe("count('*')");
		});
	});

	describe("BinaryOp", () => {
		it("compiles an equality check", () => {
			expect(compileExpression(binaryOp("=", column("borough"), literal("BROOKLYN")))).toBe("borough = 'BROOKLYN'");
		});

		it("compiles arithmetic", () => {
			expect(compileExpression(binaryOp("+", column("population"), literal(1000)))).toBe("population + 1000");
		});

		it("compiles string concatenation", () => {
			expect(compileExpression(binaryOp("||", column("first"), column("last")))).toBe("first || last");
		});

		it("compiles nested binary ops with parentheses", () => {
			const inner = binaryOp("AND", binaryOp("=", column("a"), literal(1)), binaryOp("=", column("b"), literal(2)));
			expect(compileExpression(inner)).toBe("(a = 1) AND (b = 2)");
		});
	});

	describe("UnaryOp", () => {
		it("compiles prefix NOT", () => {
			expect(compileExpression(unaryOp("NOT", binaryOp("=", column("active"), literal(true)), "prefix"))).toBe(
				"NOT (active = true)",
			);
		});

		it("compiles postfix IS NULL", () => {
			expect(compileExpression(unaryOp("IS NULL", column("email"), "postfix"))).toBe("email IS NULL");
		});

		it("compiles postfix IS NOT NULL", () => {
			expect(compileExpression(unaryOp("IS NOT NULL", column("email"), "postfix"))).toBe("email IS NOT NULL");
		});
	});

	describe("Alias", () => {
		it("compiles an aliased expression", () => {
			expect(compileExpression(alias(binaryOp("/", column("pop"), column("area")), "density"))).toBe(
				"pop / area AS density",
			);
		});

		it("compiles an aliased function call", () => {
			expect(compileExpression(alias(functionCall("count", [raw("*")]), "total"))).toBe("count(*) AS total");
		});
	});

	describe("Raw", () => {
		it("passes through raw SoQL unchanged", () => {
			expect(compileExpression(raw("date_extract_y(created_date) = 2024"))).toBe("date_extract_y(created_date) = 2024");
		});
	});
});

describe("compileToParams()", () => {
	it("compiles a select-only query", () => {
		const clauses: Clauses = {
			select: selectClause([column("name"), column("borough")], false),
		};
		expect(compileToParams(clauses)).toBe("$select=name,borough");
	});

	it("compiles SELECT DISTINCT", () => {
		const clauses: Clauses = {
			select: selectClause([column("borough")], true),
		};
		expect(compileToParams(clauses)).toBe("$select=DISTINCT borough");
	});

	it("compiles a full query with all clauses", () => {
		const clauses: Clauses = {
			select: selectClause([column("borough"), alias(count("*"), "total")], false),
			where: whereClause(gt("population", 100000)),
			groupBy: groupByClause([column("borough")]),
			having: havingClause(gt(count("*"), 10)),
			orderBy: orderByClause([{ expression: column("total"), direction: "DESC" }]),
			limit: limitClause(25),
			offset: offsetClause(50),
		};
		const result = compileToParams(clauses);
		expect(result).toContain("$select=borough,count(*) AS total");
		expect(result).toContain("$where=population > 100000");
		expect(result).toContain("$group=borough");
		expect(result).toContain("$having=count(*) > 10");
		expect(result).toContain("$order=total DESC");
		expect(result).toContain("$limit=25");
		expect(result).toContain("$offset=50");
	});

	it("URL-encodes param values", () => {
		const clauses: Clauses = {
			where: whereClause(eq("name", "Bob's Diner")),
		};
		const result = compileToParams(clauses);
		expect(result).toContain("$where=");
		expect(result).toContain("Bob''s");
	});

	it("includes $q for search clause", () => {
		const clauses: Clauses = {
			search: searchClause("fire alarm"),
		};
		expect(compileToParams(clauses)).toBe("$q=fire alarm");
	});

	it("returns empty string for empty clauses", () => {
		expect(compileToParams({})).toBe("");
	});
});

describe("compileToBody()", () => {
	it("compiles a select-only query", () => {
		const clauses: Clauses = {
			select: selectClause([column("name"), column("borough")], false),
		};
		expect(compileToBody(clauses)).toBe("SELECT name, borough");
	});

	it("compiles SELECT DISTINCT", () => {
		const clauses: Clauses = {
			select: selectClause([column("borough")], true),
		};
		expect(compileToBody(clauses)).toBe("SELECT DISTINCT borough");
	});

	it("compiles a full query with all clauses", () => {
		const clauses: Clauses = {
			select: selectClause([column("borough"), alias(count("*"), "total")], false),
			where: whereClause(gt("population", 100000)),
			groupBy: groupByClause([column("borough")]),
			having: havingClause(gt(count("*"), 10)),
			orderBy: orderByClause([{ expression: column("total"), direction: "DESC" }]),
			limit: limitClause(25),
			offset: offsetClause(50),
		};
		expect(compileToBody(clauses)).toBe(
			"SELECT borough, count(*) AS total WHERE population > 100000 GROUP BY borough HAVING count(*) > 10 ORDER BY total DESC LIMIT 25 OFFSET 50",
		);
	});

	it("omits search clause (not supported in POST body)", () => {
		const clauses: Clauses = {
			select: selectClause([column("name")], false),
			search: searchClause("fire"),
		};
		expect(compileToBody(clauses)).toBe("SELECT name");
	});

	it("returns empty string for empty clauses", () => {
		expect(compileToBody({})).toBe("");
	});

	it("compiles where-only query", () => {
		const clauses: Clauses = {
			where: whereClause(eq("borough", "BROOKLYN")),
		};
		expect(compileToBody(clauses)).toBe("WHERE borough = 'BROOKLYN'");
	});
});
