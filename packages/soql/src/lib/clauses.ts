import type { Expression } from "./expressions.js";
import type { SortDirection } from "./types.js";

/** SELECT clause. */
export interface SelectClause {
	readonly _tag: "Select";
	readonly expressions: ReadonlyArray<Expression>;
	readonly distinct: boolean;
}

/** WHERE clause. */
export interface WhereClause {
	readonly _tag: "Where";
	readonly expression: Expression;
}

/** ORDER BY item. */
export interface OrderByItem {
	readonly expression: Expression;
	readonly direction: SortDirection;
}

/** ORDER BY clause. */
export interface OrderByClause {
	readonly _tag: "OrderBy";
	readonly items: ReadonlyArray<OrderByItem>;
}

/** GROUP BY clause. */
export interface GroupByClause {
	readonly _tag: "GroupBy";
	readonly expressions: ReadonlyArray<Expression>;
}

/** HAVING clause. */
export interface HavingClause {
	readonly _tag: "Having";
	readonly expression: Expression;
}

/** LIMIT clause. */
export interface LimitClause {
	readonly _tag: "Limit";
	readonly count: number;
}

/** OFFSET clause. */
export interface OffsetClause {
	readonly _tag: "Offset";
	readonly count: number;
}

/** Full-text search ($q). */
export interface SearchClause {
	readonly _tag: "Search";
	readonly term: string;
}

/** Bag of all optional clauses comprising a SoQL query. */
export interface Clauses {
	readonly select?: SelectClause;
	readonly where?: WhereClause;
	readonly orderBy?: OrderByClause;
	readonly groupBy?: GroupByClause;
	readonly having?: HavingClause;
	readonly limit?: LimitClause;
	readonly offset?: OffsetClause;
	readonly search?: SearchClause;
}

export function selectClause(expressions: ReadonlyArray<Expression>, distinct: boolean): SelectClause {
	return { _tag: "Select", expressions, distinct };
}

export function whereClause(expression: Expression): WhereClause {
	return { _tag: "Where", expression };
}

export function orderByClause(items: ReadonlyArray<OrderByItem>): OrderByClause {
	return { _tag: "OrderBy", items };
}

export function groupByClause(expressions: ReadonlyArray<Expression>): GroupByClause {
	return { _tag: "GroupBy", expressions };
}

export function havingClause(expression: Expression): HavingClause {
	return { _tag: "Having", expression };
}

export function limitClause(count: number): LimitClause {
	return { _tag: "Limit", count };
}

export function offsetClause(count: number): OffsetClause {
	return { _tag: "Offset", count };
}

export function searchClause(term: string): SearchClause {
	return { _tag: "Search", term };
}
