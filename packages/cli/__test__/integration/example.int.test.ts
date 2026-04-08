import { execFile } from "node:child_process";
import { resolve } from "node:path";
import { promisify } from "node:util";
import { describe, expect, it } from "vitest";

const execFileAsync = promisify(execFile);
const CLI_ENTRY = resolve(import.meta.dirname, "../../src/cli/index.ts");
const TSX = resolve(import.meta.dirname, "../../../../node_modules/.bin/tsx");

async function runCli(args: string[]): Promise<{ stdout: string; stderr: string; exitCode: number }> {
	try {
		const { stdout, stderr } = await execFileAsync(TSX, [CLI_ENTRY, ...args], {
			timeout: 10_000,
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

describe("CLI binary integration", () => {
	it("shows version with --version flag", async () => {
		const result = await runCli(["--version"]);
		const output = result.stdout + result.stderr;
		expect(output).toMatch(/\d+\.\d+\.\d+/);
	});

	it("shows help with --help flag", async () => {
		const result = await runCli(["--help"]);
		const output = result.stdout + result.stderr;
		expect(output).toContain("soda3");
	});

	it("lists available subcommands in help", async () => {
		const result = await runCli(["--help"]);
		const output = result.stdout + result.stderr;
		expect(output).toContain("query");
		expect(output).toContain("meta");
	});
});
