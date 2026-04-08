/**
 * Fixture population script.
 *
 * Downloads API responses from live Socrata portals using the TestServer
 * record mode, saving them as fixture files for integration test replay.
 *
 * Requires SOCRATA_APP_TOKEN environment variable.
 *
 * Usage:
 *   SOCRATA_APP_TOKEN=<token> npx tsx lib/scripts/download-fixtures.ts
 */

import { resolve } from "node:path";
import { TestServer } from "@soda3js/server";

const FIXTURES_DIR = resolve(import.meta.dirname, "../../__fixtures__/datasets");

interface DatasetSpec {
	name: string;
	portal: string;
	datasetId: string;
}

const DATASETS: DatasetSpec[] = [
	{ name: "sf-films", portal: "data.sfgov.org", datasetId: "yitu-d5am" },
	{ name: "nyc-311", portal: "data.cityofnewyork.us", datasetId: "erm2-nwe9" },
	{ name: "nyc-restaurants", portal: "data.cityofnewyork.us", datasetId: "43nn-pn8j" },
	{ name: "chicago-crimes", portal: "data.cityofchicago.org", datasetId: "ijzp-q8t2" },
];

/** Datasets too large for full CSV export (>1M rows). Skip CSV for these. */
const SKIP_CSV = new Set(["nyc-311", "chicago-crimes"]);

const appToken: string = process.env.SOCRATA_APP_TOKEN ?? "";
if (appToken === "") {
	console.error("SOCRATA_APP_TOKEN environment variable is required.");
	process.exit(1);
}

async function recordDataset(spec: DatasetSpec): Promise<void> {
	const fixtureDir = resolve(FIXTURES_DIR, spec.name, "responses");
	console.log(`Recording ${spec.name} (${spec.portal}/${spec.datasetId})...`);

	const server = await TestServer.create({
		fixtures: resolve(FIXTURES_DIR, spec.name),
		mode: "record",
		record: {
			portal: spec.portal,
			fixtures: fixtureDir,
			overwrite: false,
		},
	});

	try {
		// 1. Metadata: GET /api/views/{id}.json
		const metaRes = await fetch(`${server.url}/api/views/${spec.datasetId}.json`, {
			headers: { "x-app-token": appToken },
		});
		console.log(`  metadata: ${metaRes.status}`);

		// 2. SODA2 query: GET /resource/{id}.json?$limit=100
		const soda2Res = await fetch(`${server.url}/resource/${spec.datasetId}.json?%24limit=100`, {
			headers: { "x-app-token": appToken },
		});
		console.log(`  soda2 query: ${soda2Res.status}`);

		// 3. SODA3 query: POST /api/v3/views/{id}/query.json
		const soda3Res = await fetch(`${server.url}/api/v3/views/${spec.datasetId}/query.json`, {
			method: "POST",
			headers: {
				"content-type": "application/json",
				"x-app-token": appToken,
			},
			body: JSON.stringify({
				query: "SELECT * LIMIT 100",
			}),
		});
		console.log(`  soda3 query: ${soda3Res.status}`);

		// 4. CSV export: GET /api/views/{id}/rows.csv?accessType=DOWNLOAD
		if (SKIP_CSV.has(spec.name)) {
			console.log("  csv export: skipped (dataset too large)");
		} else {
			const csvRes = await fetch(`${server.url}/api/views/${spec.datasetId}/rows.csv?accessType=DOWNLOAD`, {
				headers: { "x-app-token": appToken },
			});
			console.log(`  csv export: ${csvRes.status}`);
		}
	} finally {
		await server.close();
	}

	console.log(`  Done: ${spec.name}`);
}

async function main(): Promise<void> {
	console.log("Downloading fixtures to:", FIXTURES_DIR);
	console.log();

	for (const spec of DATASETS) {
		await recordDataset(spec);
		console.log();
	}

	console.log("All fixtures downloaded.");
}

main().catch((err) => {
	console.error("Fatal error:", err);
	process.exit(1);
});
