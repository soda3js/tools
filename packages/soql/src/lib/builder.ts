import type { Clauses, OrderByItem } from "./clauses.js";
import {
	groupByClause,
	havingClause,
	limitClause,
	offsetClause,
	orderByClause,
	searchClause,
	selectClause,
	whereClause,
} from "./clauses.js";
import { compileToBody, compileToParams } from "./compiler.js";
import type { Expression } from "./expressions.js";
import { alias, column, raw } from "./expressions.js";
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
	toExpression,
	upper,
} from "./functions.js";
import type { SortDirection } from "./types.js";

// ---------------------------------------------------------------------------
// SoQLBuilder — immutable fluent builder
// ---------------------------------------------------------------------------

export class SoQLBuilder {
	#clauses: Clauses;

	constructor(clauses: Clauses = {}) {
		this.#clauses = clauses;
	}

	/** SELECT col1, col2, ... */
	select(...cols: Array<string | Expression>): SoQLBuilder {
		const expressions = cols.map(toExpression);
		return new SoQLBuilder({
			...this.#clauses,
			select: selectClause(expressions, false),
		});
	}

	/** SELECT DISTINCT col1, col2, ... */
	selectDistinct(...cols: Array<string | Expression>): SoQLBuilder {
		const expressions = cols.map(toExpression);
		return new SoQLBuilder({
			...this.#clauses,
			select: selectClause(expressions, true),
		});
	}

	/** WHERE expression — AND-folded with any prior WHERE clause. */
	where(expression: Expression): SoQLBuilder {
		const existing = this.#clauses.where;
		const next = existing ? and(existing.expression, expression) : expression;
		return new SoQLBuilder({
			...this.#clauses,
			where: whereClause(next),
		});
	}

	/** ORDER BY col [ASC|DESC] — appended to any prior ORDER BY items. */
	orderBy(col: string | Expression, direction: SortDirection = "ASC"): SoQLBuilder {
		const expr = toExpression(col);
		const item: OrderByItem = { expression: expr, direction };
		const existing = this.#clauses.orderBy?.items ?? [];
		return new SoQLBuilder({
			...this.#clauses,
			orderBy: orderByClause([...existing, item]),
		});
	}

	/** GROUP BY col1, col2, ... */
	groupBy(...cols: Array<string | Expression>): SoQLBuilder {
		const expressions = cols.map(toExpression);
		return new SoQLBuilder({
			...this.#clauses,
			groupBy: groupByClause(expressions),
		});
	}

	/** HAVING expression */
	having(expression: Expression): SoQLBuilder {
		return new SoQLBuilder({
			...this.#clauses,
			having: havingClause(expression),
		});
	}

	/** $limit / LIMIT n */
	limit(n: number): SoQLBuilder {
		return new SoQLBuilder({
			...this.#clauses,
			limit: limitClause(n),
		});
	}

	/** $offset / OFFSET n */
	offset(n: number): SoQLBuilder {
		return new SoQLBuilder({
			...this.#clauses,
			offset: offsetClause(n),
		});
	}

	/** $q full-text search (params only, omitted from body) */
	q(term: string): SoQLBuilder {
		return new SoQLBuilder({
			...this.#clauses,
			search: searchClause(term),
		});
	}

	/** Compile to SODA URL query params string. */
	toParams(): string {
		return compileToParams(this.#clauses);
	}

	/** Compile to SODA3 POST body SQL string. */
	toBody(): string {
		return compileToBody(this.#clauses);
	}
}

// ---------------------------------------------------------------------------
// SoQL — static entry point
// ---------------------------------------------------------------------------

export class SoQL {
	private constructor() {}

	// Factory
	static query(): SoQLBuilder {
		return new SoQLBuilder();
	}

	// Expression wrappers
	static alias = alias;
	static column = column;
	static raw = raw;

	// Comparison
	static eq = eq;
	static neq = neq;
	static gt = gt;
	static gte = gte;
	static lt = lt;
	static lte = lte;
	static between = between;
	static notBetween = notBetween;
	static isNull = isNull;
	static isNotNull = isNotNull;
	static like = like;
	static notLike = notLike;
	static startsWith = startsWith;

	// in is a reserved word — delegate to in_
	static in = in_;
	// case is a reserved word — delegate to case_
	static case = case_;

	// List
	static inList = in_;
	static notIn = notIn;

	// Boolean
	static and = and;
	static or = or;
	static not = not;

	// Aggregate
	static count = count;
	static sum = sum;
	static avg = avg;
	static min = min;
	static max = max;

	// String
	static upper = upper;
	static lower = lower;
	static concat = concat;

	// Arithmetic
	static add = add;
	static sub = sub;
	static mul = mul;
	static div = div;
}
