import { Schema } from "effect";

export const CacheConfigSchema = Schema.Struct({
	enabled: Schema.optional(Schema.Boolean).annotations({
		description: "Enable response caching",
	}),
	ttl: Schema.optional(Schema.Number).annotations({
		description: "Cache time-to-live in seconds",
	}),
}).annotations({
	identifier: "CacheConfig",
	description: "Cache behavior settings",
});

export const ProfileSchema = Schema.Struct({
	domain: Schema.String.annotations({
		description: "Socrata portal domain (e.g. data.sfgov.org)",
	}),
	token: Schema.optional(Schema.String).annotations({
		description: "Socrata app token for this portal",
	}),
	cache: Schema.optional(CacheConfigSchema).annotations({
		description: "Per-profile cache override",
	}),
}).annotations({
	identifier: "Profile",
	description: "Named portal configuration",
});

export const ConfigSchema = Schema.Struct({
	format: Schema.optional(Schema.String).annotations({
		description: "Default output format (table, json, ndjson, csv)",
	}),
	default_profile: Schema.optional(Schema.String).annotations({
		description: "Name of the active profile",
	}),
	cache: Schema.optional(CacheConfigSchema).annotations({
		description: "Global cache settings",
	}),
	profiles: Schema.optionalWith(Schema.Record({ key: Schema.String, value: ProfileSchema }), {
		default: () => ({}),
	}).annotations({
		description: "Named portal profiles",
	}),
}).annotations({
	identifier: "Soda3Config",
	title: "Soda3Config",
	description: "Configuration file for soda3js tools",
});

export type CacheConfig = typeof CacheConfigSchema.Type;
export type Profile = typeof ProfileSchema.Type;
export type Config = typeof ConfigSchema.Type;
