import { Schema } from "effect";

export class SodaErrorResponse extends Schema.Class<SodaErrorResponse>("SodaErrorResponse")({
	code: Schema.String,
	error: Schema.Literal(true),
	message: Schema.String,
	data: Schema.optional(Schema.Unknown),
}) {}
