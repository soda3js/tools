import type { SoQLValue } from "./types.js";

/** Column reference. */
export interface Column {
	readonly _tag: "Column";
	readonly name: string;
}

/** Value literal. */
export interface Literal {
	readonly _tag: "Literal";
	readonly value: SoQLValue;
}

/** SoQL function call. */
export interface FunctionCall {
	readonly _tag: "FunctionCall";
	readonly name: string;
	readonly args: ReadonlyArray<Expression>;
}

/** Binary operator (=, !=, \>, AND, OR, +, ||, etc.). */
export interface BinaryOp {
	readonly _tag: "BinaryOp";
	readonly op: string;
	readonly left: Expression;
	readonly right: Expression;
}

/** Unary operator (NOT, IS NULL, IS NOT NULL). */
export interface UnaryOp {
	readonly _tag: "UnaryOp";
	readonly op: string;
	readonly operand: Expression;
	readonly position: "prefix" | "postfix";
}

/** Aliased expression (expr AS name). */
export interface Alias {
	readonly _tag: "Alias";
	readonly expression: Expression;
	readonly name: string;
}

/** Raw SoQL string escape hatch. */
export interface Raw {
	readonly _tag: "Raw";
	readonly soql: string;
}

/** Union of all AST node types. */
export type Expression = Column | Literal | FunctionCall | BinaryOp | UnaryOp | Alias | Raw;

/** Create a Column node. */
export function column(name: string): Column {
	return { _tag: "Column", name };
}

/** Create a Literal node. Rejects undefined. */
export function literal(value: SoQLValue): Literal {
	if (value === undefined) {
		throw new Error("literal() does not accept undefined — use null instead");
	}
	return { _tag: "Literal", value };
}

/** Create a FunctionCall node. */
export function functionCall(name: string, args: ReadonlyArray<Expression>): FunctionCall {
	return { _tag: "FunctionCall", name, args };
}

/** Create a BinaryOp node. */
export function binaryOp(op: string, left: Expression, right: Expression): BinaryOp {
	return { _tag: "BinaryOp", op, left, right };
}

/** Create a UnaryOp node. */
export function unaryOp(op: string, operand: Expression, position: "prefix" | "postfix"): UnaryOp {
	return { _tag: "UnaryOp", op, operand, position };
}

/** Create an Alias node. */
export function alias(expression: Expression, name: string): Alias {
	return { _tag: "Alias", expression, name };
}

/** Create a Raw SoQL escape hatch node. */
export function raw(soql: string): Raw {
	return { _tag: "Raw", soql };
}
