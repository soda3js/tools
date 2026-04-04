import { Args, Command, Options } from "@effect/cli";
import { Console } from "effect";

const dirArg = Args.directory({ name: "dir" }).pipe(Args.withDefault(".changeset"));

const quietOption = Options.boolean("quiet").pipe(
	Options.withAlias("q"),
	Options.withDescription("Only output errors, no summary"),
	Options.withDefault(false),
);

export const exampleCommand = Command.make("lint", { dir: dirArg, quiet: quietOption }, ({ dir, quiet }) =>
	Console.log(`Running example command with dir=${dir} and quiet=${quiet}`),
).pipe(Command.withDescription("Example command"));
