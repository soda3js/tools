import { Schema } from "effect";

export class DiscoveryResource extends Schema.Class<DiscoveryResource>("DiscoveryResource")({
	id: Schema.String,
	name: Schema.String,
	description: Schema.optionalWith(Schema.String, { default: () => "" }),
	type: Schema.String,
	updatedAt: Schema.String,
	columnsFieldName: Schema.Array(Schema.String),
	columnsDataType: Schema.Array(Schema.String),
}) {}

export class DiscoveryClassification extends Schema.Class<DiscoveryClassification>("DiscoveryClassification")({
	categories: Schema.Array(Schema.String),
	tags: Schema.Array(Schema.String),
	domain_category: Schema.optionalWith(Schema.String, { default: () => "" }),
	domain_tags: Schema.Array(Schema.String),
}) {}

export class DiscoveryResult extends Schema.Class<DiscoveryResult>("DiscoveryResult")({
	resource: DiscoveryResource,
	classification: DiscoveryClassification,
	metadata: Schema.Struct({ domain: Schema.String }),
	permalink: Schema.String,
}) {}
