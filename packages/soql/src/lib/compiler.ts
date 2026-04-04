import type { Expression } from "./expressions.js";

/** Operators where binary operands need parenthesization. */
const NEEDS_PARENS = new Set(["AND", "OR"]);

function needsParens(expr: Expression, parentOp: string): boolean {
	if (expr._tag !== "BinaryOp") return false;
	if (NEEDS_PARENS.has(parentOp)) return true;
	return false;
}

function wrapIfNeeded(expr: Expression, parentOp: string): string {
	const compiled = compileExpression(expr);
	if (needsParens(expr, parentOp)) {
		return `(${compiled})`;
	}
	return compiled;
}

/** Compile a single AST expression node to a SoQL string. */
export function compileExpression(expr: Expression): string {
	switch (expr._tag) {
		case "Column": {
			if (expr.name.startsWith(":")) return expr.name;
			if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(expr.name)) return `\`${expr.name}\``;
			return expr.name;
		}
		case "Literal": {
			if (expr.value === null) return "null";
			if (typeof expr.value === "boolean") return String(expr.value);
			if (typeof expr.value === "number") return String(expr.value);
			if (typeof expr.value === "string") {
				const escaped = expr.value.replace(/'/g, "''");
				return `'${escaped}'`;
			}
			return String(expr.value);
		}
		case "FunctionCall": {
			// CASE WHEN ... THEN ... ELSE ... END
			if (expr.name === "__case") {
				const parts = expr.args;
				const elseExpr = parts.at(-1);
				if (elseExpr === undefined) throw new Error("__case requires at least one argument");
				const branches = parts.slice(0, -1);
				let result = "CASE";
				for (let i = 0; i < branches.length; i += 2) {
					const whenExpr = branches[i];
					const thenExpr = branches[i + 1];
					if (whenExpr === undefined || thenExpr === undefined) break;
					result += ` WHEN ${compileExpression(whenExpr)} THEN ${compileExpression(thenExpr)}`;
				}
				result += ` ELSE ${compileExpression(elseExpr)} END`;
				return result;
			}
			const args = expr.args.map((a) => compileExpression(a)).join(", ");
			return `${expr.name}(${args})`;
		}
		case "BinaryOp": {
			// BETWEEN / NOT BETWEEN: col BETWEEN low AND high
			if (expr.op === "BETWEEN" || expr.op === "NOT BETWEEN") {
				const col = compileExpression(expr.left);
				if (expr.right._tag === "BinaryOp" && expr.right.op === "AND") {
					const low = compileExpression(expr.right.left);
					const high = compileExpression(expr.right.right);
					return `${col} ${expr.op} ${low} AND ${high}`;
				}
			}
			// IN / NOT IN: col IN (val1, val2, ...)
			if (expr.op === "IN" || expr.op === "NOT IN") {
				const col = compileExpression(expr.left);
				if (expr.right._tag === "FunctionCall" && expr.right.name === "__list") {
					const items = expr.right.args.map((a) => compileExpression(a)).join(", ");
					return `${col} ${expr.op} (${items})`;
				}
			}
			const left = wrapIfNeeded(expr.left, expr.op);
			const right = wrapIfNeeded(expr.right, expr.op);
			return `${left} ${expr.op} ${right}`;
		}
		case "UnaryOp": {
			if (expr.position === "prefix") {
				const operand =
					expr.operand._tag === "BinaryOp" ? `(${compileExpression(expr.operand)})` : compileExpression(expr.operand);
				return `${expr.op} ${operand}`;
			}
			return `${compileExpression(expr.operand)} ${expr.op}`;
		}
		case "Alias": {
			return `${compileExpression(expr.expression)} AS ${expr.name}`;
		}
		case "Raw": {
			return expr.soql;
		}
	}
}

import type { Clauses } from "./clauses.js";

/** Compile a select clause's expressions to a comma-separated string. */
function compileSelect(clauses: Clauses, separator = ", "): string | undefined {
	if (!clauses.select) return undefined;
	const exprs = clauses.select.expressions.map((e) => compileExpression(e)).join(separator);
	if (clauses.select.distinct) return `DISTINCT ${exprs}`;
	return exprs;
}

/** Compile order by items to "col DIR, col DIR" format. */
function compileOrderBy(clauses: Clauses): string | undefined {
	if (!clauses.orderBy) return undefined;
	return clauses.orderBy.items.map((item) => `${compileExpression(item.expression)} ${item.direction}`).join(", ");
}

/** Compile group by expressions to comma-separated string. */
function compileGroupBy(clauses: Clauses): string | undefined {
	if (!clauses.groupBy) return undefined;
	return clauses.groupBy.expressions.map((e) => compileExpression(e)).join(", ");
}

/**
 * Compile clauses to SODA2 URL params string.
 * Format: $select=...&$where=...&$limit=...
 */
export function compileToParams(clauses: Clauses): string {
	const parts: string[] = [];

	const select = compileSelect(clauses, ",");
	if (select) parts.push(`$select=${select}`);

	if (clauses.where) parts.push(`$where=${compileExpression(clauses.where.expression)}`);

	const groupBy = compileGroupBy(clauses);
	if (groupBy) parts.push(`$group=${groupBy}`);

	if (clauses.having) parts.push(`$having=${compileExpression(clauses.having.expression)}`);

	const orderBy = compileOrderBy(clauses);
	if (orderBy) parts.push(`$order=${orderBy}`);

	if (clauses.limit) parts.push(`$limit=${clauses.limit.count}`);
	if (clauses.offset) parts.push(`$offset=${clauses.offset.count}`);
	if (clauses.search) parts.push(`$q=${clauses.search.term}`);

	return parts.join("&");
}

/**
 * Compile clauses to SODA3 POST body query string.
 * Format: SELECT ... WHERE ... ORDER BY ... LIMIT ...
 * Search ($q) is silently omitted — not supported in POST body.
 */
export function compileToBody(clauses: Clauses): string {
	const parts: string[] = [];

	const select = compileSelect(clauses);
	if (select) parts.push(`SELECT ${select}`);

	if (clauses.where) parts.push(`WHERE ${compileExpression(clauses.where.expression)}`);

	const groupBy = compileGroupBy(clauses);
	if (groupBy) parts.push(`GROUP BY ${groupBy}`);

	if (clauses.having) parts.push(`HAVING ${compileExpression(clauses.having.expression)}`);

	const orderBy = compileOrderBy(clauses);
	if (orderBy) parts.push(`ORDER BY ${orderBy}`);

	if (clauses.limit) parts.push(`LIMIT ${clauses.limit.count}`);
	if (clauses.offset) parts.push(`OFFSET ${clauses.offset.count}`);

	return parts.join(" ");
}
