import { SodaClient } from "@soda3js/client";
import { Effect, Layer } from "effect";
import { CatalogService } from "../services/CatalogService.js";

export function makeCatalogServiceLive(seedDomains?: readonly string[]) {
	return Layer.effect(
		CatalogService,
		Effect.gen(function* () {
			const soda = yield* SodaClient;
			const knownDomains = new Set<string>(seedDomains);

			return {
				search: (params) =>
					soda.discover(params).pipe(
						Effect.tap((response) =>
							Effect.sync(() => {
								for (const r of response.results) {
									knownDomains.add(r.metadata.domain);
								}
							}),
						),
						Effect.catchAll((e) => Effect.die(e)),
					),
				listDomains: () => Effect.succeed([...knownDomains] as const),
			};
		}),
	);
}
