/**
 * Domain and profile resolution for CLI commands.
 *
 * Resolution order (highest to lowest priority):
 * 1. `--profile <name>` flag → look up in config profiles
 * 2. `--domain <domain>` flag → use directly (no token, SODA2 mode)
 * 3. `default_profile` from config → look up in config profiles
 * 4. Error — no domain could be resolved
 */

import type { Config } from "./config-store.js";

export interface ResolvedDomain {
	domain: string;
	appToken?: string;
}

export class DomainResolutionError extends Error {
	readonly _tag = "DomainResolutionError";

	constructor(message: string) {
		super(message);
		this.name = "DomainResolutionError";
	}
}

/**
 * Resolve domain and token from CLI flags and config.
 *
 * Maps the config's `token` field to `appToken` for `SodaClientConfig` compatibility.
 */
export function resolveDomain(config: Config, options: { profile?: string; domain?: string }): ResolvedDomain {
	// 1. Explicit --profile flag
	if (options.profile !== undefined) {
		const profile = config.profiles[options.profile];
		if (profile === undefined) {
			throw new DomainResolutionError(`Profile "${options.profile}" not found in config`);
		}
		return { domain: profile.domain, ...(profile.token !== undefined ? { appToken: profile.token } : {}) };
	}

	// 2. Explicit --domain flag (no token → SODA2 mode)
	if (options.domain !== undefined) {
		return { domain: options.domain };
	}

	// 3. default_profile from config
	if (config.default_profile !== undefined) {
		const profile = config.profiles[config.default_profile];
		if (profile === undefined) {
			throw new DomainResolutionError(`Default profile "${config.default_profile}" not found in config`);
		}
		return { domain: profile.domain, ...(profile.token !== undefined ? { appToken: profile.token } : {}) };
	}

	// 4. No resolution possible
	throw new DomainResolutionError(
		"No domain could be resolved. Provide --profile, --domain, or set default_profile in config.",
	);
}
