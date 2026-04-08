import type { CacheStore } from "@soda3js/protocol";
import { Schema } from "effect";
import type { ResponseHooks } from "../utils/hooks.js";

export class SodaClientConfig extends Schema.Class<SodaClientConfig>("SodaClientConfig")({
	appToken: Schema.optional(Schema.String),
	domains: Schema.optional(Schema.Record({ key: Schema.String, value: Schema.Struct({ appToken: Schema.String }) })),
	mode: Schema.optional(Schema.Union(Schema.Literal("auto"), Schema.Literal("soda2"), Schema.Literal("soda3"))),
	cacheTtl: Schema.optional(Schema.Number),
}) {
	cache?: CacheStore;
	hooks?: ResponseHooks;

	static withCache(
		config: ConstructorParameters<typeof SodaClientConfig>[0],
		cache: CacheStore,
		cacheTtl?: number,
	): SodaClientConfig {
		const c = new SodaClientConfig({
			...config,
			...(cacheTtl !== undefined ? { cacheTtl } : {}),
		});
		c.cache = cache;
		return c;
	}

	static withHooks(config: SodaClientConfig, hooks: ResponseHooks): SodaClientConfig {
		const c = new SodaClientConfig({ ...config });
		if (config.cache !== undefined) c.cache = config.cache;
		c.hooks = hooks;
		return c;
	}
}
