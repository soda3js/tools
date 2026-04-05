import { createWriteStream } from "node:fs";
import { Args, Command, Options } from "@effect/cli";
import { NodeHttpClient } from "@effect/platform-node";
import { SodaClient, SodaClientConfig, SodaClientLive } from "@soda3js/client";
import { Console, Effect, Layer, Stream } from "effect";
import { readConfig } from "../../lib/config-store.js";
import { resolveDomain } from "../../lib/domain.js";

const datasetIdArg = Args.text({ name: "dataset-id" }).pipe(Args.withDescription("Socrata dataset identifier"));

const domainOption = Options.text("domain").pipe(
	Options.withDescription("Socrata domain (e.g. data.cityofchicago.org)"),
	Options.optional,
);

const profileOption = Options.text("profile").pipe(
	Options.withDescription("Named profile from config"),
	Options.optional,
);

const formatOption = Options.choice("format", ["csv", "json"]).pipe(
	Options.withDescription("Export format sent to the API"),
	Options.withDefault("csv" as const),
);

const outputOption = Options.file("output").pipe(
	Options.withDescription("Write output to file instead of stdout"),
	Options.optional,
);

export const exportCommand = Command.make(
	"export",
	{ datasetId: datasetIdArg, domain: domainOption, profile: profileOption, format: formatOption, output: outputOption },
	({ datasetId, domain, profile, format, output }) =>
		Effect.gen(function* () {
			const config = yield* Effect.promise(() => readConfig());
			const opts: { profile?: string; domain?: string } = {};
			if (profile._tag === "Some") opts.profile = profile.value;
			if (domain._tag === "Some") opts.domain = domain.value;
			const resolved = resolveDomain(config, opts);

			const clientConfig = new SodaClientConfig({
				...(resolved.appToken !== undefined ? { domains: { [resolved.domain]: { appToken: resolved.appToken } } } : {}),
			});

			const clientLayer = Layer.provide(SodaClientLive(clientConfig), NodeHttpClient.layerUndici);

			const exportEffect = Effect.gen(function* () {
				const soda = yield* SodaClient;
				const stream = yield* soda.export_(resolved.domain, datasetId, format as "csv" | "json");

				if (output._tag === "Some") {
					const ws = createWriteStream(output.value);
					yield* Stream.runForEach(stream, (chunk) =>
						Effect.async<void>((resume) => {
							const ok = ws.write(chunk);
							if (ok) resume(Effect.void);
							else ws.once("drain", () => resume(Effect.void));
						}),
					);
					yield* Effect.async<void>((resume) => {
						ws.end(() => resume(Effect.void));
					});
					yield* Console.log(`Exported to ${output.value}`);
				} else {
					yield* Stream.runForEach(stream, (chunk) => Effect.sync(() => process.stdout.write(chunk)));
				}
			});

			yield* Effect.provide(exportEffect, clientLayer);
		}),
).pipe(Command.withDescription("Export a full dataset as CSV or JSON"));
