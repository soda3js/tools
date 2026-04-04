export { SoQL, SoQLBuilder } from "./lib/builder.js";
// Clause types
export type {
	Clauses,
	GroupByClause,
	HavingClause,
	LimitClause,
	OffsetClause,
	OrderByClause,
	OrderByItem,
	SearchClause,
	SelectClause,
	WhereClause,
} from "./lib/clauses.js";
// AST node types and constructors
export type {
	Alias,
	BinaryOp,
	Column,
	Expression,
	FunctionCall,
	Literal,
	Raw,
	UnaryOp,
} from "./lib/expressions.js";
export { alias, binaryOp, column, functionCall, literal, raw, unaryOp } from "./lib/expressions.js";
export type { CaseWhen } from "./lib/functions.js";

// Standalone function constructors (for @soda3js/api individual imports)
export {
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
	in_ as inList,
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
} from "./lib/functions.js";
// Type system
export type { SoQLDataType, SoQLTypeMap, SoQLValue, SortDirection } from "./lib/types.js";
