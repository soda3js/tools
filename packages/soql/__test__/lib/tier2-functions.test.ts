import { describe, expect, it } from "vitest";
import { SoQL } from "../../src/index.js";

describe("date extract functions", () => {
	it("dateExtractY compiles to date_extract_y()", () => {
		const q = SoQL.query().select(SoQL.dateExtractY("created_date")).toParams();
		expect(q).toContain("$select=date_extract_y(created_date)");
	});

	it("dateExtractM compiles to date_extract_m()", () => {
		const q = SoQL.query().select(SoQL.dateExtractM("created_date")).toParams();
		expect(q).toContain("$select=date_extract_m(created_date)");
	});

	it("dateExtractD compiles to date_extract_d()", () => {
		const q = SoQL.query().select(SoQL.dateExtractD("created_date")).toParams();
		expect(q).toContain("$select=date_extract_d(created_date)");
	});

	it("dateExtractHH compiles to date_extract_hh()", () => {
		const q = SoQL.query().select(SoQL.dateExtractHH("created_date")).toParams();
		expect(q).toContain("$select=date_extract_hh(created_date)");
	});

	it("dateExtractMM compiles to date_extract_mm()", () => {
		const q = SoQL.query().select(SoQL.dateExtractMM("created_date")).toParams();
		expect(q).toContain("$select=date_extract_mm(created_date)");
	});

	it("dateExtractSS compiles to date_extract_ss()", () => {
		const q = SoQL.query().select(SoQL.dateExtractSS("created_date")).toParams();
		expect(q).toContain("$select=date_extract_ss(created_date)");
	});

	it("dateExtractDow compiles to date_extract_dow()", () => {
		const q = SoQL.query().select(SoQL.dateExtractDow("created_date")).toParams();
		expect(q).toContain("$select=date_extract_dow(created_date)");
	});

	it("dateExtractWoy compiles to date_extract_woy()", () => {
		const q = SoQL.query().select(SoQL.dateExtractWoy("created_date")).toParams();
		expect(q).toContain("$select=date_extract_woy(created_date)");
	});

	it("date extract works in WHERE clause", () => {
		const q = SoQL.query()
			.where(SoQL.eq(SoQL.dateExtractY("created_date"), 2025))
			.toParams();
		expect(q).toContain("$where=date_extract_y(created_date) = 2025");
	});

	it("date extract works with alias", () => {
		const q = SoQL.query()
			.select(SoQL.alias(SoQL.dateExtractY("created_date"), "year"))
			.toParams();
		expect(q).toContain("$select=date_extract_y(created_date) AS year");
	});
});

describe("date truncate functions", () => {
	it("dateTruncY compiles to date_trunc_y()", () => {
		const q = SoQL.query().select(SoQL.dateTruncY("created_date")).toParams();
		expect(q).toContain("$select=date_trunc_y(created_date)");
	});

	it("dateTruncYM compiles to date_trunc_ym()", () => {
		const q = SoQL.query().select(SoQL.dateTruncYM("created_date")).toParams();
		expect(q).toContain("$select=date_trunc_ym(created_date)");
	});

	it("dateTruncYMD compiles to date_trunc_ymd()", () => {
		const q = SoQL.query().select(SoQL.dateTruncYMD("created_date")).toParams();
		expect(q).toContain("$select=date_trunc_ymd(created_date)");
	});

	it("date truncate works in GROUP BY", () => {
		const q = SoQL.query()
			.select(SoQL.dateTruncYM("created_date"), SoQL.count("*"))
			.groupBy(SoQL.dateTruncYM("created_date"))
			.toParams();
		expect(q).toContain("$group=date_trunc_ym(created_date)");
	});
});

describe("additional string functions", () => {
	it("contains compiles to contains()", () => {
		const q = SoQL.query().where(SoQL.contains("description", "noise")).toParams();
		expect(q).toContain("$where=contains(description, 'noise')");
	});

	it("length compiles to length()", () => {
		const q = SoQL.query().select(SoQL.length("name")).toParams();
		expect(q).toContain("$select=length(name)");
	});
});

describe("additional aggregate functions", () => {
	it("median compiles to median()", () => {
		const q = SoQL.query().select(SoQL.median("salary")).toParams();
		expect(q).toContain("$select=median(salary)");
	});
});

describe("count DISTINCT", () => {
	it("count with distinct option compiles to count(DISTINCT col)", () => {
		const q = SoQL.query()
			.select(SoQL.count("borough", { distinct: true }))
			.toParams();
		expect(q).toContain("$select=count(DISTINCT borough)");
	});

	it("count without distinct is unchanged", () => {
		const q = SoQL.query().select(SoQL.count("borough")).toParams();
		expect(q).toContain("$select=count(borough)");
	});
});

describe("whereRaw convenience", () => {
	it("whereRaw delegates to where(raw())", () => {
		const q = SoQL.query().whereRaw("population > 100000 AND state = 'NY'").toParams();
		expect(q).toContain("$where=population > 100000 AND state = 'NY'");
	});

	it("whereRaw AND-folds with prior where", () => {
		const q = SoQL.query().where(SoQL.eq("city", "Brooklyn")).whereRaw("population > 100000").toParams();
		expect(q).toContain("$where=(city = 'Brooklyn') AND population > 100000");
	});
});
