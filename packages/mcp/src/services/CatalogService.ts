import type { CatalogResponse, DiscoveryParams } from "@soda3js/client";
import type { Effect } from "effect";
import { Context } from "effect";

export class CatalogService extends Context.Tag("@soda3js/mcp/CatalogService")<
	CatalogService,
	{
		readonly search: (params: DiscoveryParams) => Effect.Effect<CatalogResponse>;
		readonly listDomains: () => Effect.Effect<readonly string[]>;
	}
>() {}
