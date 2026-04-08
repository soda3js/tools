/**
 * Domain and profile resolution for CLI commands.
 *
 * Resolution order (highest to lowest priority):
 * 1. `--profile` flag -- look up in config profiles
 * 2. `--domain` flag -- use directly (no token, SODA2 mode)
 * 3. `default_profile` from config -- look up in config profiles
 * 4. Error -- no domain could be resolved
 */

import type { Soda3Config } from "@soda3js/config";

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
export function resolveDomain(config: Soda3Config, options: { profile?: string; domain?: string }): ResolvedDomain {
	// 1. Explicit --profile flag
	if (options.profile !== undefined) {
		const profile = config.profiles[options.profile];
		if (profile === undefined) {
			throw new DomainResolutionError(`Profile "${options.profile}" not found in config`);
		}
		return { domain: profile.domain, ...(profile.token !== undefined ? { appToken: profile.token } : {}) };
	}

	// 2. Explicit --domain flag (no token -> SODA2 mode)
	if (options.domain !== undefined) {
		return { domain: options.domain };
	}

	// 3. defaultProfile from config
	if (config.defaultProfile !== undefined) {
		const profile = config.profiles[config.defaultProfile];
		if (profile === undefined) {
			throw new DomainResolutionError(`Default profile "${config.defaultProfile}" not found in config`);
		}
		return { domain: profile.domain, ...(profile.token !== undefined ? { appToken: profile.token } : {}) };
	}

	// 4. No resolution possible
	throw new DomainResolutionError(
		"No domain could be resolved. Provide --profile, --domain, or set default_profile in config.",
	);
}
