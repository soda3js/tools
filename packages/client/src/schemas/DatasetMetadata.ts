import { Schema } from "effect";
import { Column } from "./Column.js";
import { Owner } from "./Owner.js";

export class DatasetMetadata extends Schema.Class<DatasetMetadata>("DatasetMetadata")({
	id: Schema.String,
	name: Schema.String,
	description: Schema.optional(Schema.String),
	assetType: Schema.optional(Schema.String),
	category: Schema.optional(Schema.String),
	tags: Schema.optional(Schema.Array(Schema.String)),
	columns: Schema.Array(Column),
	owner: Owner,
	rowsUpdatedAt: Schema.Number,
	viewLastModified: Schema.Number,
}) {}
