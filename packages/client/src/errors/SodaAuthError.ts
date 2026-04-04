import { Schema } from "effect";

export class SodaAuthError extends Schema.TaggedError<SodaAuthError>()("SodaAuthError", {
	code: Schema.String,
	message: Schema.String,
}) {}
