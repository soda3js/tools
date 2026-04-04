import { Soda3Client } from "@soda3js/rest/node";

const client = new Soda3Client({
	domain: "data.cityofnewyork.us",
	appToken: process.env.SOCRATA_APP_TOKEN,
});

// Simple query - NYC 311 complaints, 5 rows
console.log("--- query() ---");
const rows = await client.query("erm2-nwe9", {
	select: ["unique_key", "complaint_type", "borough", "created_date"],
	where: "borough='BROOKLYN'",
	limit: 5,
	orderBy: "created_date:DESC",
});
console.log(`Got ${rows.length} rows:`);
for (const row of rows) {
	console.log(`  ${row.unique_key} | ${row.complaint_type} | ${row.created_date}`);
}

// Metadata
console.log("\n--- metadata() ---");
const meta = await client.metadata("erm2-nwe9");
console.log(`Dataset: ${meta.name}`);
console.log(`Columns: ${meta.columns.length}`);
console.log(`Owner: ${meta.owner.displayName}`);
console.log(`Last updated: ${new Date(meta.rowsUpdatedAt * 1000).toISOString()}`);

// queryAll - lazy streaming, grab first 3 rows
console.log("\n--- queryAll() (first 3) ---");
let count = 0;
for await (const row of client.queryAll("erm2-nwe9", {
	select: ["unique_key", "complaint_type"],
	where: "borough='MANHATTAN'",
	orderBy: "created_date:DESC",
})) {
	console.log(`  ${row.unique_key} | ${row.complaint_type}`);
	if (++count >= 3) break;
}

console.log("\nAll done!");
