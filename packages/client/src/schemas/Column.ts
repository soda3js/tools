import { Schema } from "effect";

export class Column extends Schema.Class<Column>("Column")({
	id: Schema.Number,
	fieldName: Schema.String,
	dataTypeName: Schema.String,
	description: Schema.optional(Schema.String),
	renderTypeName: Schema.String,
	position: Schema.Number,
}) {}
