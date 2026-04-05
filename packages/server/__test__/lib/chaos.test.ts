import { describe, expect, it } from "vitest";
import { createChaosMonkey } from "../../src/lib/chaos.js";
import type { ChaosConfig } from "../../src/lib/types.js";

describe("createChaosMonkey", () => {
	const config: ChaosConfig = {
		enabled: true,
		probability: 0.5,
		seed: 42,
		faults: [
			{ status: 429, weight: 3 },
			{ status: 500, weight: 1 },
		],
	};

	it("returns null when disabled", () => {
		const monkey = createChaosMonkey({ ...config, enabled: false });
		const results = Array.from({ length: 100 }, () => monkey.maybeFault());
		expect(results.every((r) => r === null)).toBe(true);
	});

	it("produces reproducible results with a seed", () => {
		const monkey1 = createChaosMonkey(config);
		const monkey2 = createChaosMonkey(config);
		const results1 = Array.from({ length: 50 }, () => monkey1.maybeFault());
		const results2 = Array.from({ length: 50 }, () => monkey2.maybeFault());
		expect(results1).toEqual(results2);
	});

	it("respects probability - ~50% of calls should fault", () => {
		const monkey = createChaosMonkey({ ...config, probability: 0.5, seed: 123 });
		const results = Array.from({ length: 1000 }, () => monkey.maybeFault());
		const faultCount = results.filter((r) => r !== null).length;
		expect(faultCount).toBeGreaterThan(350);
		expect(faultCount).toBeLessThan(650);
	});

	it("selects faults according to weight distribution", () => {
		const monkey = createChaosMonkey({
			...config,
			probability: 1.0,
			seed: 99,
		});
		const results = Array.from({ length: 1000 }, () => monkey.maybeFault());
		const count429 = results.filter((r) => r?.status === 429).length;
		const count500 = results.filter((r) => r?.status === 500).length;
		expect(count429).toBeGreaterThan(600);
		expect(count500).toBeGreaterThan(100);
	});

	it("adds latency jitter when configured", () => {
		const monkey = createChaosMonkey({
			...config,
			probability: 1.0,
			seed: 7,
			latency: { min_ms: 100, max_ms: 500 },
		});
		const result = monkey.maybeFault();
		expect(result).not.toBeNull();
		expect(result?.delay_ms).toBeGreaterThanOrEqual(100);
		expect(result?.delay_ms).toBeLessThanOrEqual(500);
	});
});
