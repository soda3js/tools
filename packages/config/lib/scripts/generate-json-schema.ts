import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { isDeepStrictEqual } from "node:util";
import { JSONSchema } from "effect";
import { CacheEntryMetaSchema, DatasetFreshnessSchema } from "../../src/schemas/cache.js";
import { ConfigSchema } from "../../src/schemas/config.js";

const SCHEMAS_DIR = resolve(import.meta.dirname, "../../../../website/public/schemas");

mkdirSync(SCHEMAS_DIR, { recursive: true });

function generate(name: string, jsonSchema: object): void {
	const outputPath = join(SCHEMAS_DIR, name);

	if (existsSync(outputPath)) {
		const existing = JSON.parse(readFileSync(outputPath, "utf-8"));
		if (isDeepStrictEqual(existing, jsonSchema)) {
			console.log(`${name}: unchanged`);
			return;
		}
	}

	const content = `${JSON.stringify(jsonSchema, null, "\t")}\n`;
	writeFileSync(outputPath, content, "utf-8");
	console.log(`Generated ${name}`);
}

generate("config.json", JSONSchema.make(ConfigSchema));
generate("cache-entry.json", JSONSchema.make(CacheEntryMetaSchema));
generate("freshness.json", JSONSchema.make(DatasetFreshnessSchema));
