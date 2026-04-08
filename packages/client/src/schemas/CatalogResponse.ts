import { Schema } from "effect";
import { DiscoveryResult } from "./DiscoveryResult.js";

export class CatalogResponse extends Schema.Class<CatalogResponse>("CatalogResponse")({
	results: Schema.Array(DiscoveryResult),
	resultSetSize: Schema.Number,
}) {}
