import { NodeHttpClient } from "@effect/platform-node";
import { SodaClient, SodaClientConfig } from "@soda3js/client";
import { Layer } from "effect";
import type { McpConfig } from "../lib/config.js";
import { makeCatalogServiceLive } from "./CatalogServiceLive.js";
import { QueryServiceLive } from "./QueryServiceLive.js";

export function McpLive(config: McpConfig) {
	const domains = Object.fromEntries(
		Object.entries(config.profiles)
			.filter(([, p]) => p.token !== undefined)
			.map(([, p]) => [p.domain, { appToken: p.token as string }]),
	);

	const sodaConfig = new SodaClientConfig({
		...(config.appToken ? { appToken: config.appToken } : {}),
		...(Object.keys(domains).length > 0 ? { domains } : {}),
	});

	const sodaClientLayer = Layer.effect(SodaClient, SodaClient.makeSodaClient(sodaConfig)).pipe(
		Layer.provide(NodeHttpClient.layerUndici),
	);

	const seedDomains = Object.values(config.profiles).map((p) => p.domain);
	const catalogLayer = makeCatalogServiceLive(seedDomains);

	return Layer.mergeAll(catalogLayer, QueryServiceLive).pipe(Layer.provide(sodaClientLayer));
}
