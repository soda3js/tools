import { execFile } from "node:child_process";
import { resolve } from "node:path";
import { promisify } from "node:util";
import { describe, expect, it } from "vitest";

const execFileAsync = promisify(execFile);
const CLI_ENTRY = resolve(import.meta.dirname, "../../src/cli/index.ts");
const TSX = resolve(import.meta.dirname, "../../../../node_modules/.bin/tsx");

const HAS_TOKEN = !!process.env.SOCRATA_APP_TOKEN;

async function runCli(args: string[]): Promise<{ stdout: string; stderr: string; exitCode: number }> {
	try {
		const { stdout, stderr } = await execFileAsync(TSX, [CLI_ENTRY, ...args], {
			timeout: 30_000,
			env: { ...process.env, NO_COLOR: "1" },
		});
		return { stdout, stderr, exitCode: 0 };
	} catch (error) {
		const e = error as { stdout?: string; stderr?: string; code?: number };
		return {
			stdout: e.stdout ?? "",
			stderr: e.stderr ?? "",
			exitCode: e.code ?? 1,
		};
	}
}

describe.skipIf(!HAS_TOKEN)("CLI e2e against live portals", () => {
	it("queries SF Films dataset via CLI", async () => {
		const result = await runCli([
			"query",
			"yitu-d5am",
			"--domain",
			"data.sfgov.org",
			"--limit",
			"3",
			"--format",
			"json",
		]);
		expect(result.exitCode).toBe(0);
		const rows = JSON.parse(result.stdout);
		expect(Array.isArray(rows)).toBe(true);
		expect(rows.length).toBeGreaterThan(0);
	}, 30_000);

	it("fetches SF Films metadata via CLI", async () => {
		const result = await runCli(["meta", "yitu-d5am", "--domain", "data.sfgov.org", "--format", "json"]);
		expect(result.exitCode).toBe(0);
		expect(result.stdout).toContain("yitu-d5am");
	}, 30_000);
});
