import type { ChaosConfig } from "./types.js";

export interface ChaosFaultResult {
	status?: number;
	type?: "timeout" | "reset";
	delay_ms?: number;
}

function mulberry32(seed: number): () => number {
	let s = seed | 0;
	return () => {
		s = (s + 0x6d2b79f5) | 0;
		let t = Math.imul(s ^ (s >>> 15), 1 | s);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

export function createChaosMonkey(config: ChaosConfig) {
	const rand = mulberry32(config.seed ?? Date.now());

	const totalWeight = config.faults.reduce((sum, f) => sum + f.weight, 0);
	const cumulativeWeights: number[] = [];
	let cumulative = 0;
	for (const fault of config.faults) {
		cumulative += fault.weight / totalWeight;
		cumulativeWeights.push(cumulative);
	}

	return {
		maybeFault(): ChaosFaultResult | null {
			if (!config.enabled) return null;
			if (rand() > config.probability) return null;

			const roll = rand();
			let selectedIndex = 0;
			for (let i = 0; i < cumulativeWeights.length; i++) {
				if (roll <= cumulativeWeights[i]) {
					selectedIndex = i;
					break;
				}
			}

			const fault = config.faults[selectedIndex];
			let delay_ms = fault.delay_ms;

			if (config.latency) {
				const jitter = config.latency.min_ms + rand() * (config.latency.max_ms - config.latency.min_ms);
				delay_ms = (delay_ms ?? 0) + Math.round(jitter);
			}

			const result: ChaosFaultResult = {};
			if (fault.status !== undefined) result.status = fault.status;
			if (fault.type !== undefined) result.type = fault.type;
			if (delay_ms !== undefined) result.delay_ms = delay_ms;
			return result;
		},
	};
}
