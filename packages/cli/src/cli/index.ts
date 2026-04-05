/**
 * CLI entry point using `\@effect/cli`.
 *
 * Provides the `soda3` CLI application with subcommands
 *
 * @internal
 */

import { Command } from "@effect/cli";
import { NodeContext, NodeRuntime } from "@effect/platform-node";
import { Effect } from "effect";
import { configCommand } from "./commands/config.js";
import { exportCommand } from "./commands/export.js";
import { metaCommand } from "./commands/meta.js";
import { queryCommand } from "./commands/query.js";

/* v8 ignore start -- CLI registration; each command tested via exported handler */
const rootCommand = Command.make("soda3").pipe(
	Command.withSubcommands([queryCommand, exportCommand, metaCommand, configCommand]),
);

const cli = Command.run(rootCommand, {
	name: "soda3",
	version: process.env.__PACKAGE_VERSION__ ?? "0.0.0",
});

/**
 * Bootstrap and run the `soda3` CLI application.
 *
 * Creates an Effect program from the parsed `process.argv`, provides the
 * `NodeContext` layer, and hands execution to `NodeRuntime.runMain`.
 *
 * @internal
 */
const program = Effect.suspend(() => cli(process.argv)).pipe(Effect.provide(NodeContext.layer));
NodeRuntime.runMain(program);

/* v8 ignore stop */
