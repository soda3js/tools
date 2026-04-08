import { Schema } from "effect";

export class SodaParseError extends Schema.TaggedError<SodaParseError>()("SodaParseError", {
	message: Schema.String,
	errors: Schema.Unknown,
}) {}
