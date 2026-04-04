import type { BinaryOp, Expression, FunctionCall, UnaryOp } from "./expressions.js";
import { binaryOp, column, functionCall, literal, raw, unaryOp } from "./expressions.js";
import type { SoQLValue } from "./types.js";

// ---------------------------------------------------------------------------
// Argument coercion
// ---------------------------------------------------------------------------

/** Coerce a string to Column, a SoQLValue to Literal, or pass through Expression. */
export function toExpression(val: string | number | boolean | null | Expression): Expression {
	if (typeof val === "object" && val !== null && "_tag" in val) {
		return val as Expression;
	}
	if (typeof val === "string") {
		return column(val);
	}
	return literal(val as SoQLValue);
}

/** Coerce a value meant for the right-hand side (values, not columns). */
function toValue(val: string | number | boolean | null | Expression): Expression {
	if (typeof val === "object" && val !== null && "_tag" in val) {
		return val as Expression;
	}
	return literal(val as SoQLValue);
}

// ---------------------------------------------------------------------------
// Comparison
// ---------------------------------------------------------------------------

export function eq(col: string | Expression, value: string | number | boolean | null | Expression): BinaryOp {
	return binaryOp("=", toExpression(col), toValue(value));
}

export function neq(col: string | Expression, value: string | number | boolean | null | Expression): BinaryOp {
	return binaryOp("!=", toExpression(col), toValue(value));
}

export function gt(col: string | Expression, value: string | number | boolean | null | Expression): BinaryOp {
	return binaryOp(">", toExpression(col), toValue(value));
}

export function gte(col: string | Expression, value: string | number | boolean | null | Expression): BinaryOp {
	return binaryOp(">=", toExpression(col), toValue(value));
}

export function lt(col: string | Expression, value: string | number | boolean | null | Expression): BinaryOp {
	return binaryOp("<", toExpression(col), toValue(value));
}

export function lte(col: string | Expression, value: string | number | boolean | null | Expression): BinaryOp {
	return binaryOp("<=", toExpression(col), toValue(value));
}

export function between(col: string | Expression, low: number, high: number): Expression {
	return binaryOp("BETWEEN", toExpression(col), binaryOp("AND", literal(low), literal(high)));
}

export function notBetween(col: string | Expression, low: number, high: number): Expression {
	return binaryOp("NOT BETWEEN", toExpression(col), binaryOp("AND", literal(low), literal(high)));
}

export function isNull(col: string | Expression): UnaryOp {
	return unaryOp("IS NULL", toExpression(col), "postfix");
}

export function isNotNull(col: string | Expression): UnaryOp {
	return unaryOp("IS NOT NULL", toExpression(col), "postfix");
}

export function in_(col: string | Expression, values: ReadonlyArray<string | number | boolean>): Expression {
	const list = values.map((v) => literal(v as SoQLValue));
	return binaryOp("IN", toExpression(col), functionCall("__list", list));
}

export function notIn(col: string | Expression, values: ReadonlyArray<string | number | boolean>): Expression {
	const list = values.map((v) => literal(v as SoQLValue));
	return binaryOp("NOT IN", toExpression(col), functionCall("__list", list));
}

export function like(col: string | Expression, pattern: string): BinaryOp {
	return binaryOp("LIKE", toExpression(col), literal(pattern));
}

export function notLike(col: string | Expression, pattern: string): BinaryOp {
	return binaryOp("NOT LIKE", toExpression(col), literal(pattern));
}

export function startsWith(col: string | Expression, prefix: string): FunctionCall {
	return functionCall("starts_with", [toExpression(col), literal(prefix)]);
}

// ---------------------------------------------------------------------------
// Boolean
// ---------------------------------------------------------------------------

export function and(...conditions: Expression[]): Expression {
	if (conditions.length === 0) throw new Error("and() requires at least one condition");
	if (conditions.length === 1) return conditions[0] as Expression;
	return conditions.reduce((acc, cond) => binaryOp("AND", acc, cond));
}

export function or(...conditions: Expression[]): Expression {
	if (conditions.length === 0) throw new Error("or() requires at least one condition");
	if (conditions.length === 1) return conditions[0] as Expression;
	return conditions.reduce((acc, cond) => binaryOp("OR", acc, cond));
}

export function not(condition: Expression): UnaryOp {
	return unaryOp("NOT", condition, "prefix");
}

// ---------------------------------------------------------------------------
// Aggregate
// ---------------------------------------------------------------------------

export function count(col: string | Expression): FunctionCall {
	const arg = typeof col === "string" && col === "*" ? raw("*") : toExpression(col);
	return functionCall("count", [arg]);
}

export function sum(col: string | Expression): FunctionCall {
	return functionCall("sum", [toExpression(col)]);
}

export function avg(col: string | Expression): FunctionCall {
	return functionCall("avg", [toExpression(col)]);
}

export function min(col: string | Expression): FunctionCall {
	return functionCall("min", [toExpression(col)]);
}

export function max(col: string | Expression): FunctionCall {
	return functionCall("max", [toExpression(col)]);
}

// ---------------------------------------------------------------------------
// String
// ---------------------------------------------------------------------------

export function upper(col: string | Expression): FunctionCall {
	return functionCall("upper", [toExpression(col)]);
}

export function lower(col: string | Expression): FunctionCall {
	return functionCall("lower", [toExpression(col)]);
}

export function concat(...args: Array<string | Expression>): Expression {
	const exprs = args.map(toExpression);
	if (exprs.length < 2) throw new Error("concat() requires at least two arguments");
	return exprs.reduce((acc, expr) => binaryOp("||", acc, expr));
}

// ---------------------------------------------------------------------------
// Arithmetic
// ---------------------------------------------------------------------------

export function add(left: string | number | Expression, right: string | number | Expression): BinaryOp {
	return binaryOp("+", toExpression(left), toExpression(right));
}

export function sub(left: string | number | Expression, right: string | number | Expression): BinaryOp {
	return binaryOp("-", toExpression(left), toExpression(right));
}

export function mul(left: string | number | Expression, right: string | number | Expression): BinaryOp {
	return binaryOp("*", toExpression(left), toExpression(right));
}

export function div(left: string | number | Expression, right: string | number | Expression): BinaryOp {
	return binaryOp("/", toExpression(left), toExpression(right));
}

// ---------------------------------------------------------------------------
// Case
// ---------------------------------------------------------------------------

export interface CaseWhen {
	readonly when: Expression;
	readonly result: Expression;
}

export function case_(branches: ReadonlyArray<CaseWhen>, elseExpr: Expression): FunctionCall {
	return functionCall("__case", [...branches.flatMap((b) => [b.when, b.result]), elseExpr]);
}
