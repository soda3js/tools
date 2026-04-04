import { Schema } from "effect";

export class SodaServerError extends Schema.TaggedError<SodaServerError>()("SodaServerError", {
	code: Schema.String,
	message: Schema.String,
	requestId: Schema.optional(Schema.String),
}) {}
