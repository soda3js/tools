import type { HttpClient } from "@effect/platform";
import { HttpClientRequest, HttpClientResponse } from "@effect/platform";
import { Effect, Schema } from "effect";
import { SodaServerError } from "../errors/SodaServerError.js";
import { CatalogResponse } from "../schemas/CatalogResponse.js";

const DISCOVERY_BASE_URL = "https://api.us.socrata.com/api/catalog/v1";

export interface DiscoveryParams {
	readonly q?: string;
	readonly domains?: readonly string[];
	readonly categories?: readonly string[];
	readonly tags?: readonly string[];
	readonly only?: readonly string[];
	readonly limit?: number;
	readonly offset?: number;
	readonly order?: string;
}

export function discoveryEndpoint(
	baseClient: HttpClient.HttpClient,
	params: DiscoveryParams,
): Effect.Effect<CatalogResponse, SodaServerError> {
	const searchParams = new URLSearchParams();
	if (params.q) searchParams.set("q", params.q);
	if (params.domains) {
		for (const d of params.domains) searchParams.append("domains", d);
	}
	if (params.categories) {
		for (const c of params.categories) searchParams.append("categories", c);
	}
	if (params.tags) {
		for (const t of params.tags) searchParams.append("tags", t);
	}
	if (params.only) {
		for (const o of params.only) searchParams.append("only", o);
	}
	if (params.limit !== undefined) searchParams.set("limit", String(params.limit));
	if (params.offset !== undefined) searchParams.set("offset", String(params.offset));
	if (params.order) searchParams.set("order", params.order);

	const qs = searchParams.toString();
	const url = qs ? `${DISCOVERY_BASE_URL}?${qs}` : DISCOVERY_BASE_URL;

	return baseClient.execute(HttpClientRequest.get(url)).pipe(
		Effect.flatMap(HttpClientResponse.filterStatusOk),
		Effect.flatMap((response) => response.json),
		Effect.flatMap((json) => Schema.decodeUnknown(CatalogResponse)(json)),
		Effect.catchTag("ParseError", () =>
			Effect.fail(new SodaServerError({ code: "parse_error", message: "Failed to decode discovery response" })),
		),
		Effect.catchTag("RequestError", () =>
			Effect.fail(new SodaServerError({ code: "request_error", message: "Discovery request failed" })),
		),
		Effect.catchTag("ResponseError", () =>
			Effect.fail(new SodaServerError({ code: "server_error", message: "Discovery API returned an error" })),
		),
	);
}
