import { describe, expect, it } from "vitest";
import type { Expression } from "../../src/lib/expressions.js";
import { alias, binaryOp, column, functionCall, literal, raw, unaryOp } from "../../src/lib/expressions.js";

/**
 * AST Contract Tests
 *
 * These tests lock down the shape of AST node types for cross-package
 * consumers (specifically @soda3js/api's SoQL-to-SQL transpiler).
 * If you change a node's structure, these tests should fail loudly
 * so the transpiler can be updated.
 */
describe("AST contract: node shapes", () => {
	it("Column has exactly _tag and name", () => {
		const node = column("borough");
		expect(Object.keys(node).sort()).toEqual(["_tag", "name"]);
		expect(node._tag).toBe("Column");
		expect(typeof node.name).toBe("string");
	});

	it("Literal has exactly _tag and value", () => {
		const node = literal("BROOKLYN");
		expect(Object.keys(node).sort()).toEqual(["_tag", "value"]);
		expect(node._tag).toBe("Literal");
	});

	it("FunctionCall has exactly _tag, name, and args", () => {
		const node = functionCall("upper", [column("name")]);
		expect(Object.keys(node).sort()).toEqual(["_tag", "args", "name"]);
		expect(node._tag).toBe("FunctionCall");
		expect(typeof node.name).toBe("string");
		expect(Array.isArray(node.args)).toBe(true);
	});

	it("BinaryOp has exactly _tag, op, left, and right", () => {
		const node = binaryOp("=", column("a"), literal(1));
		expect(Object.keys(node).sort()).toEqual(["_tag", "left", "op", "right"]);
		expect(node._tag).toBe("BinaryOp");
		expect(typeof node.op).toBe("string");
	});

	it("UnaryOp has exactly _tag, op, operand, and position", () => {
		const node = unaryOp("NOT", literal(true), "prefix");
		expect(Object.keys(node).sort()).toEqual(["_tag", "op", "operand", "position"]);
		expect(node._tag).toBe("UnaryOp");
		expect(node.position === "prefix" || node.position === "postfix").toBe(true);
	});

	it("Alias has exactly _tag, expression, and name", () => {
		const node = alias(column("x"), "y");
		expect(Object.keys(node).sort()).toEqual(["_tag", "expression", "name"]);
		expect(node._tag).toBe("Alias");
	});

	it("Raw has exactly _tag and soql", () => {
		const node = raw("1=1");
		expect(Object.keys(node).sort()).toEqual(["_tag", "soql"]);
		expect(node._tag).toBe("Raw");
		expect(typeof node.soql).toBe("string");
	});
});

describe("AST contract: Expression union exhaustiveness", () => {
	it("every variant is discriminable via _tag", () => {
		const nodes: Expression[] = [
			column("x"),
			literal(1),
			functionCall("f", []),
			binaryOp("=", column("a"), literal(1)),
			unaryOp("NOT", literal(true), "prefix"),
			alias(column("x"), "y"),
			raw("1=1"),
		];

		for (const node of nodes) {
			switch (node._tag) {
				case "Column":
				case "Literal":
				case "FunctionCall":
				case "BinaryOp":
				case "UnaryOp":
				case "Alias":
				case "Raw":
					break;
				default: {
					// Compile-time exhaustiveness check
					const _exhaustive: never = node;
					throw new Error(`Unknown _tag: ${(_exhaustive as Expression)._tag}`);
				}
			}
		}

		expect(nodes).toHaveLength(7);
	});
});
