import { execSync } from "node:child_process";
import { access, readFile } from "node:fs/promises";
import { Args, Command, Options } from "@effect/cli";
import { Console, Effect, Option } from "effect";
import type { Config, Profile } from "../../lib/config-store.js";
import { addProfile, configPath, readConfig, writeConfig } from "../../lib/config-store.js";

// ---------------------------------------------------------------------------
// Exported helpers (testable with custom config paths)
// ---------------------------------------------------------------------------

export async function initConfig(
	domain: string,
	token: string | undefined,
	name: string,
	path?: string,
): Promise<{ created: boolean; configPath: string }> {
	const filePath = path ?? configPath();
	try {
		await access(filePath);
		return { created: false, configPath: filePath };
	} catch {
		// File does not exist — proceed
	}

	const profile: Profile = { domain };
	if (token !== undefined) {
		profile.token = token;
	}

	const config: Config = {
		default_profile: name,
		profiles: { [name]: profile },
	};
	await writeConfig(config, filePath);
	return { created: true, configPath: filePath };
}

export async function showConfig(path?: string): Promise<{ exists: boolean; content: string }> {
	const filePath = path ?? configPath();
	try {
		const content = await readFile(filePath, "utf-8");
		return { exists: true, content };
	} catch {
		return { exists: false, content: "" };
	}
}

export async function addProfileToConfig(
	name: string,
	domain: string,
	token: string | undefined,
	path?: string,
): Promise<void> {
	const filePath = path ?? configPath();
	const config = await readConfig(filePath);
	const profile: Profile = { domain };
	if (token !== undefined) {
		profile.token = token;
	}
	const updated = addProfile(config, name, profile);
	await writeConfig(updated, filePath);
}

// ---------------------------------------------------------------------------
// Subcommands
// ---------------------------------------------------------------------------

const initDomainOption = Options.text("domain").pipe(
	Options.withDescription("Socrata portal domain (e.g. data.cityofnewyork.us)"),
);

const initTokenOption = Options.text("token").pipe(
	Options.withDescription("App token for SODA3 mode"),
	Options.optional,
);

const initNameOption = Options.text("name").pipe(
	Options.withDescription("Profile name"),
	Options.withDefault("default"),
);

const initCommand = Command.make(
	"init",
	{ domain: initDomainOption, token: initTokenOption, name: initNameOption },
	({ domain, token, name }) =>
		Effect.gen(function* () {
			const tokenValue = Option.getOrUndefined(token);
			const result = yield* Effect.tryPromise(() => initConfig(domain, tokenValue, name));
			if (!result.created) {
				yield* Console.log(`Config already exists at ${result.configPath}`);
			} else {
				yield* Console.log(`Config created at ${result.configPath}`);
			}
		}),
).pipe(Command.withDescription("Initialize a new config file"));

const showCommand = Command.make("show", {}, () =>
	Effect.gen(function* () {
		const result = yield* Effect.tryPromise(() => showConfig());
		if (!result.exists) {
			yield* Console.log("No config file found. Run `soda3 config init` to create one.");
		} else {
			yield* Console.log(result.content);
		}
	}),
).pipe(Command.withDescription("Show the current config"));

const editCommand = Command.make("edit", {}, () =>
	Effect.gen(function* () {
		const filePath = configPath();
		try {
			yield* Effect.tryPromise(() => access(filePath));
		} catch {
			yield* Console.log("No config file found. Run `soda3 config init` to create one.");
			return;
		}
		const editor = process.env.EDITOR || "vi";
		yield* Effect.sync(() => execSync(`${editor} ${filePath}`, { stdio: "inherit" }));
	}),
).pipe(Command.withDescription("Open the config file in your editor"));

const addProfileNameArg = Args.text({ name: "name" }).pipe(Args.withDescription("Profile name"));

const addProfileDomainOption = Options.text("domain").pipe(
	Options.withDescription("Socrata portal domain (e.g. data.cityofnewyork.us)"),
);

const addProfileTokenOption = Options.text("token").pipe(
	Options.withDescription("App token for SODA3 mode"),
	Options.optional,
);

const addProfileCommand = Command.make(
	"add-profile",
	{ name: addProfileNameArg, domain: addProfileDomainOption, token: addProfileTokenOption },
	({ name, domain, token }) =>
		Effect.gen(function* () {
			const tokenValue = Option.getOrUndefined(token);
			yield* Effect.tryPromise(() => addProfileToConfig(name, domain, tokenValue));
			yield* Console.log(`Profile "${name}" added.`);
		}),
).pipe(Command.withDescription("Add a named profile to the config"));

// ---------------------------------------------------------------------------
// Parent command
// ---------------------------------------------------------------------------

export const configCommand = Command.make("config").pipe(
	Command.withDescription("Manage soda3 configuration"),
	Command.withSubcommands([initCommand, showCommand, editCommand, addProfileCommand]),
);
