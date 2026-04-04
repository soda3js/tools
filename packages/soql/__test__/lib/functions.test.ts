import { describe, expect, it } from "vitest";
import { compileExpression } from "../../src/lib/compiler.js";
import { column, literal } from "../../src/lib/expressions.js";
import {
	add,
	and,
	avg,
	between,
	case_,
	concat,
	count,
	div,
	eq,
	gt,
	gte,
	in_,
	isNotNull,
	isNull,
	like,
	lower,
	lt,
	lte,
	max,
	min,
	mul,
	neq,
	not,
	notBetween,
	notIn,
	notLike,
	or,
	startsWith,
	sub,
	sum,
	upper,
} from "../../src/lib/functions.js";

// Helper: build and compile for readability
const compile = compileExpression;

describe("Comparison functions", () => {
	it("eq", () => {
		expect(compile(eq("borough", "BROOKLYN"))).toBe("borough = 'BROOKLYN'");
	});

	it("eq with Expression as rhs value", () => {
		// Exercises the toValue() branch where an Expression is passed directly
		expect(compile(eq("a", column("b")))).toBe("a = b");
		expect(compile(eq("count", literal(42)))).toBe("count = 42");
	});

	it("neq", () => {
		expect(compile(neq("status", "CLOSED"))).toBe("status != 'CLOSED'");
	});

	it("gt", () => {
		expect(compile(gt("population", 100000))).toBe("population > 100000");
	});

	it("gte", () => {
		expect(compile(gte("score", 90))).toBe("score >= 90");
	});

	it("lt", () => {
		expect(compile(lt("age", 18))).toBe("age < 18");
	});

	it("lte", () => {
		expect(compile(lte("price", 9.99))).toBe("price <= 9.99");
	});

	it("between", () => {
		expect(compile(between("age", 18, 65))).toBe("age BETWEEN 18 AND 65");
	});

	it("notBetween", () => {
		expect(compile(notBetween("score", 0, 50))).toBe("score NOT BETWEEN 0 AND 50");
	});

	it("isNull", () => {
		expect(compile(isNull("email"))).toBe("email IS NULL");
	});

	it("isNotNull", () => {
		expect(compile(isNotNull("email"))).toBe("email IS NOT NULL");
	});

	it("in_", () => {
		expect(compile(in_("borough", ["BROOKLYN", "QUEENS"]))).toBe("borough IN ('BROOKLYN', 'QUEENS')");
	});

	it("in_ with numbers", () => {
		expect(compile(in_("zip", [11201, 11215]))).toBe("zip IN (11201, 11215)");
	});

	it("notIn", () => {
		expect(compile(notIn("status", ["CLOSED", "ARCHIVED"]))).toBe("status NOT IN ('CLOSED', 'ARCHIVED')");
	});

	it("like", () => {
		expect(compile(like("name", "%smith%"))).toBe("name LIKE '%smith%'");
	});

	it("notLike", () => {
		expect(compile(notLike("name", "%test%"))).toBe("name NOT LIKE '%test%'");
	});

	it("startsWith", () => {
		expect(compile(startsWith("name", "John"))).toBe("starts_with(name, 'John')");
	});

	it("startsWith escapes single quotes", () => {
		expect(compile(startsWith("name", "O'Brien"))).toBe("starts_with(name, 'O''Brien')");
	});
});

describe("Boolean functions", () => {
	it("and with two conditions", () => {
		expect(compile(and(eq("a", 1), eq("b", 2)))).toBe("(a = 1) AND (b = 2)");
	});

	it("and with three conditions (left-folds)", () => {
		expect(compile(and(eq("a", 1), eq("b", 2), eq("c", 3)))).toBe("((a = 1) AND (b = 2)) AND (c = 3)");
	});

	it("or with two conditions", () => {
		expect(compile(or(eq("a", 1), eq("b", 2)))).toBe("(a = 1) OR (b = 2)");
	});

	it("or with three conditions (left-folds)", () => {
		expect(compile(or(eq("a", 1), eq("b", 2), eq("c", 3)))).toBe("((a = 1) OR (b = 2)) OR (c = 3)");
	});

	it("not", () => {
		expect(compile(not(eq("active", true)))).toBe("NOT (active = true)");
	});
});

describe("Aggregate functions", () => {
	it("count", () => {
		expect(compile(count("*"))).toBe("count(*)");
	});

	it("count with column", () => {
		expect(compile(count("borough"))).toBe("count(borough)");
	});

	it("sum", () => {
		expect(compile(sum("amount"))).toBe("sum(amount)");
	});

	it("avg", () => {
		expect(compile(avg("score"))).toBe("avg(score)");
	});

	it("min", () => {
		expect(compile(min("price"))).toBe("min(price)");
	});

	it("max", () => {
		expect(compile(max("price"))).toBe("max(price)");
	});
});

describe("String functions", () => {
	it("upper", () => {
		expect(compile(upper("name"))).toBe("upper(name)");
	});

	it("lower", () => {
		expect(compile(lower("name"))).toBe("lower(name)");
	});

	it("concat", () => {
		expect(compile(concat("first", "last"))).toBe("first || last");
	});

	it("concat with expression args", () => {
		expect(compile(concat(column("first"), literal(" "), column("last")))).toBe("first || ' ' || last");
	});
});

describe("Arithmetic functions", () => {
	it("add", () => {
		expect(compile(add("a", "b"))).toBe("a + b");
	});

	it("sub", () => {
		expect(compile(sub("total", "discount"))).toBe("total - discount");
	});

	it("mul", () => {
		expect(compile(mul("price", "quantity"))).toBe("price * quantity");
	});

	it("div", () => {
		expect(compile(div("population", "area"))).toBe("population / area");
	});

	it("arithmetic with literal values", () => {
		expect(compile(add("score", 10))).toBe("score + 10");
	});
});

describe("case_", () => {
	it("compiles a simple CASE expression", () => {
		const expr = case_([{ when: gt("pop", 1000000), result: literal("big") }], literal("small"));
		expect(compile(expr)).toBe("CASE WHEN pop > 1000000 THEN 'big' ELSE 'small' END");
	});

	it("compiles multiple WHEN branches", () => {
		const expr = case_(
			[
				{ when: gt("pop", 1000000), result: literal("big") },
				{ when: gt("pop", 100000), result: literal("medium") },
			],
			literal("small"),
		);
		expect(compile(expr)).toBe("CASE WHEN pop > 1000000 THEN 'big' WHEN pop > 100000 THEN 'medium' ELSE 'small' END");
	});
});
