import { Schema } from "effect";

export class SodaNotFoundError extends Schema.TaggedError<SodaNotFoundError>()("SodaNotFoundError", {
	code: Schema.String,
	message: Schema.String,
	domain: Schema.String,
	datasetId: Schema.String,
}) {}
