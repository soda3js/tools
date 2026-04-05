import { Args, Command, Options } from "@effect/cli";
import { NodeHttpClient } from "@effect/platform-node";
import type { DatasetMetadata } from "@soda3js/client";
import { SodaClient, SodaClientConfig, SodaClientLive } from "@soda3js/client";
import { Console, Effect, Layer } from "effect";
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

const formatOption = Options.choice("format", ["json", "table"]).pipe(
	Options.withDescription("Output format (json or table)"),
	Options.withDefault("table" as const),
);

/**
 * Formats a DatasetMetadata object as a human-readable table string.
 *
 * Renders a summary header (name, ID, description, category, last updated)
 * followed by a column table with field name, data type, and description.
 */
export function formatMetadataTable(metadata: DatasetMetadata): string {
	const lines: string[] = [];

	lines.push(`Name: ${metadata.name}`);
	lines.push(`ID: ${metadata.id}`);
	if (metadata.description !== undefined) {
		lines.push(`Description: ${metadata.description}`);
	}
	if (metadata.category !== undefined) {
		lines.push(`Category: ${metadata.category}`);
	}
	lines.push(`Last Updated: ${new Date(metadata.rowsUpdatedAt * 1000).toISOString()}`);

	if (metadata.columns.length > 0) {
		lines.push("");
		lines.push("Columns:");

		const rows = metadata.columns.map((col) => ({
			fieldName: col.fieldName,
			dataTypeName: col.dataTypeName,
			description: col.description ?? "",
		}));

		const headers = ["fieldName", "dataTypeName", "description"] as const;
		const widths = headers.map((h) => Math.max(h.length, ...rows.map((r) => r[h].length)));

		const headerLine = headers.map((h, i) => ` ${h.padEnd(widths[i])} `).join("\u2502");
		const separator = widths.map((w) => "\u2500".repeat(w + 2)).join("\u253C");
		const dataLines = rows.map((row) => headers.map((h, i) => ` ${row[h].padEnd(widths[i])} `).join("\u2502"));

		lines.push(headerLine);
		lines.push(separator);
		lines.push(...dataLines);
	}

	return lines.join("\n");
}

export const metaCommand = Command.make(
	"meta",
	{ datasetId: datasetIdArg, domain: domainOption, profile: profileOption, format: formatOption },
	({ datasetId, domain, profile, format }) =>
		Effect.gen(function* () {
			const config = yield* Effect.promise(() => readConfig());
			const resolved = resolveDomain(config, {
				...(profile._tag === "Some" ? { profile: profile.value } : {}),
				...(domain._tag === "Some" ? { domain: domain.value } : {}),
			});

			const clientConfig = new SodaClientConfig({
				...(resolved.appToken !== undefined ? { appToken: resolved.appToken } : {}),
			});

			const clientLayer = Layer.provide(SodaClientLive(clientConfig), NodeHttpClient.layerUndici);

			const metaEffect = Effect.gen(function* () {
				const soda = yield* SodaClient;
				const metadata = yield* soda.metadata(resolved.domain, datasetId);

				if (format === "json") {
					yield* Console.log(JSON.stringify(metadata, null, 2));
				} else {
					yield* Console.log(formatMetadataTable(metadata));
				}
			});

			yield* Effect.provide(metaEffect, clientLayer);
		}),
).pipe(Command.withDescription("Fetch and display dataset metadata"));
