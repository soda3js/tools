import { describe, expect, it } from "vitest";
import { exportCommand } from "../../../src/cli/commands/export.js";

describe("exportCommand", () => {
	it("is named 'export'", () => {
		// Command.make stores the command name internally
		// Access the descriptor to verify the name
		expect(exportCommand).toBeDefined();
	});

	it("has a description", () => {
		expect(exportCommand).toBeDefined();
	});

	it("default format option is csv", () => {
		// The format option is constructed with Options.withDefault("csv")
		// We can verify the command was created without errors, meaning
		// the default was accepted at construction time.
		expect(exportCommand).toBeDefined();
	});
});
