import { Schema } from "effect";

export class Owner extends Schema.Class<Owner>("Owner")({
	id: Schema.String,
	displayName: Schema.String,
}) {}
