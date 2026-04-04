import { Schema } from "effect";

export class SodaQueryError extends Schema.TaggedError<SodaQueryError>()("SodaQueryError", {
	code: Schema.String,
	message: Schema.String,
	soql: Schema.String,
	data: Schema.optional(Schema.Unknown),
}) {}
