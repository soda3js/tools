import { describe, expect, it } from "vitest";
import { SoQL } from "../../src/index.js";

describe("type casting functions", () => {
	it("toNumber compiles to to_number()", () => {
		const q = SoQL.query()
			.where(SoQL.gt(SoQL.toNumber("population_text"), 100000))
			.toParams();
		expect(q).toContain("$where=to_number(population_text) > 100000");
	});

	it("toText compiles to to_text()", () => {
		const q = SoQL.query().select(SoQL.toText("numeric_id")).toParams();
		expect(q).toContain("$select=to_text(numeric_id)");
	});
});

describe("geospatial functions", () => {
	it("withinCircle compiles correctly", () => {
		const q = SoQL.query()
			.where(SoQL.withinCircle("location", 40.7128, -74.006, 5000))
			.toParams();
		expect(q).toContain("$where=within_circle(location, 40.7128, -74.006, 5000)");
	});

	it("withinBox compiles correctly", () => {
		const q = SoQL.query()
			.where(SoQL.withinBox("location", 40.8, -74.1, 40.7, -73.9))
			.toParams();
		expect(q).toContain("$where=within_box(location, 40.8, -74.1, 40.7, -73.9)");
	});

	it("distanceInMeters compiles correctly", () => {
		const q = SoQL.query()
			.select(SoQL.distanceInMeters("location", SoQL.raw("'POINT (-73.9857 40.7484)'")))
			.toParams();
		expect(q).toContain("$select=distance_in_meters(location, 'POINT (-73.9857 40.7484)')");
	});

	it("withinCircle works with alias", () => {
		const q = SoQL.query()
			.where(SoQL.withinCircle("location", 40.7128, -74.006, 1000))
			.limit(10)
			.toParams();
		expect(q).toContain("within_circle(location, 40.7128, -74.006, 1000)");
		expect(q).toContain("$limit=10");
	});

	it("distanceInMeters works in ORDER BY", () => {
		const dist = SoQL.distanceInMeters("location", SoQL.raw("'POINT (-73.9857 40.7484)'"));
		const q = SoQL.query().select("name", SoQL.alias(dist, "distance")).orderBy(dist, "ASC").toParams();
		expect(q).toContain("$order=distance_in_meters(");
	});
});
