import type { FaultRule, ParsedRequest } from "./types.js";

export interface FaultResult {
	status?: number;
	type?: "timeout" | "reset";
	delay_ms?: number;
}

interface RuleState {
	rule: FaultRule;
	hitCount: number;
}

function globToRegex(glob: string): RegExp {
	// Split on * to preserve glob wildcards while escaping the rest
	const parts = glob.split("*");
	const escaped = parts.map((part) => part.replace(/[.+^${}()|[\]\\]/g, "\\$&")).join(".*");
	return new RegExp(`^${escaped}`);
}

function matchesRule(rule: FaultRule, req: ParsedRequest): boolean {
	if (rule.match === "*") return true;
	if (rule.match.includes("/")) {
		// Try exact glob match first
		const re = globToRegex(rule.match);
		if (re.test(req.path)) return true;
		// Also treat a trailing /ext as [./]ext to handle .json vs /json
		const relaxedGlob = rule.match.replace(/\/(\w+)$/, "[./]$1");
		const relaxedParts = relaxedGlob.split("*");
		const relaxedEscaped = relaxedParts.map((part) => part.replace(/[.+^${}()|\\]/g, "\\$&")).join(".*");
		return new RegExp(`^${relaxedEscaped}`).test(req.path);
	}
	return req.path.includes(rule.match);
}

export function createFaultInjector(rules: FaultRule[]) {
	const states: RuleState[] = rules.map((rule) => ({ rule, hitCount: 0 }));

	return {
		check(req: ParsedRequest): FaultResult | null {
			for (const state of states) {
				const { rule } = state;
				if (!matchesRule(rule, req)) continue;

				if (rule.without_auth) {
					const token = typeof req.headers["x-app-token"] === "string" ? req.headers["x-app-token"] : undefined;
					if (token) continue;
				}

				state.hitCount++;

				if (rule.after != null && state.hitCount <= rule.after) continue;

				const result: FaultResult = {};
				if (rule.status !== undefined) result.status = rule.status;
				if (rule.type !== undefined) result.type = rule.type;
				if (rule.delay_ms !== undefined) result.delay_ms = rule.delay_ms;
				return result;
			}
			return null;
		},

		reset() {
			for (const state of states) {
				state.hitCount = 0;
			}
		},
	};
}
