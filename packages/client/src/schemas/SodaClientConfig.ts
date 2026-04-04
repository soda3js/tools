import { Schema } from "effect";

export class SodaClientConfig extends Schema.Class<SodaClientConfig>("SodaClientConfig")({
	appToken: Schema.optional(Schema.String),
	domains: Schema.optional(Schema.Record({ key: Schema.String, value: Schema.Struct({ appToken: Schema.String }) })),
	mode: Schema.optional(Schema.Union(Schema.Literal("auto"), Schema.Literal("soda2"), Schema.Literal("soda3"))),
}) {}
