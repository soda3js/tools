import { describe, expect, it } from "vitest";
import type { Expression } from "../../src/lib/expressions.js";
import { alias, binaryOp, column, functionCall, literal, raw, unaryOp } from "../../src/lib/expressions.js";

describe("column()", () => {
	it("creates a Column node", () => {
		const node = column("borough");
		expect(node).toEqual({ _tag: "Column", name: "borough" });
	});

	it("preserves column names with spaces", () => {
		const node = column("first name");
		expect(node).toEqual({ _tag: "Column", name: "first name" });
	});
});

describe("literal()", () => {
	it("creates a Literal from a string", () => {
		const node = literal("BROOKLYN");
		expect(node).toEqual({ _tag: "Literal", value: "BROOKLYN" });
	});

	it("creates a Literal from a number", () => {
		const node = literal(100000);
		expect(node).toEqual({ _tag: "Literal", value: 100000 });
	});

	it("creates a Literal from a boolean", () => {
		const node = literal(true);
		expect(node).toEqual({ _tag: "Literal", value: true });
	});

	it("creates a Literal from null", () => {
		const node = literal(null);
		expect(node).toEqual({ _tag: "Literal", value: null });
	});

	it("rejects undefined", () => {
		// @ts-expect-error - undefined is not a valid SoQLValue
		expect(() => literal(undefined)).toThrow();
	});
});

describe("functionCall()", () => {
	it("creates a FunctionCall node", () => {
		const node = functionCall("upper", [column("name")]);
		expect(node).toEqual({
			_tag: "FunctionCall",
			name: "upper",
			args: [{ _tag: "Column", name: "name" }],
		});
	});

	it("accepts empty args", () => {
		const node = functionCall("count", [literal("*")]);
		expect(node._tag).toBe("FunctionCall");
		expect(node.args).toHaveLength(1);
	});
});

describe("binaryOp()", () => {
	it("creates a BinaryOp node", () => {
		const node = binaryOp("=", column("borough"), literal("BROOKLYN"));
		expect(node).toEqual({
			_tag: "BinaryOp",
			op: "=",
			left: { _tag: "Column", name: "borough" },
			right: { _tag: "Literal", value: "BROOKLYN" },
		});
	});
});

describe("unaryOp()", () => {
	it("creates a prefix UnaryOp", () => {
		const node = unaryOp("NOT", column("active"), "prefix");
		expect(node).toEqual({
			_tag: "UnaryOp",
			op: "NOT",
			operand: { _tag: "Column", name: "active" },
			position: "prefix",
		});
	});

	it("creates a postfix UnaryOp", () => {
		const node = unaryOp("IS NULL", column("email"), "postfix");
		expect(node).toEqual({
			_tag: "UnaryOp",
			op: "IS NULL",
			operand: { _tag: "Column", name: "email" },
			position: "postfix",
		});
	});
});

describe("alias()", () => {
	it("wraps an expression with a name", () => {
		const expr = binaryOp("/", column("population"), column("area"));
		const node = alias(expr, "density");
		expect(node).toEqual({
			_tag: "Alias",
			expression: expr,
			name: "density",
		});
	});
});

describe("raw()", () => {
	it("creates a Raw node for escape-hatch SoQL", () => {
		const node = raw("date_extract_y(created_date) = 2024");
		expect(node).toEqual({
			_tag: "Raw",
			soql: "date_extract_y(created_date) = 2024",
		});
	});
});

describe("Expression discriminated union", () => {
	it("discriminates all variants via _tag", () => {
		const expressions: Expression[] = [
			column("x"),
			literal(1),
			functionCall("upper", [column("x")]),
			binaryOp("=", column("x"), literal(1)),
			unaryOp("NOT", literal(true), "prefix"),
			alias(column("x"), "y"),
			raw("1 = 1"),
		];

		const tags = expressions.map((e) => e._tag);
		expect(tags).toEqual(["Column", "Literal", "FunctionCall", "BinaryOp", "UnaryOp", "Alias", "Raw"]);
	});
});
