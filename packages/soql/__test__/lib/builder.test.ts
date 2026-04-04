import { describe, expect, it } from "vitest";
import { SoQL } from "../../src/lib/builder.js";

describe("SoQL.query()", () => {
	it("creates an empty builder", () => {
		const q = SoQL.query();
		expect(q.toParams()).toBe("");
		expect(q.toBody()).toBe("");
	});
});

describe("SoQLBuilder", () => {
	describe(".select()", () => {
		it("selects string column names", () => {
			const q = SoQL.query().select("name", "borough");
			expect(q.toParams()).toBe("$select=name,borough");
			expect(q.toBody()).toBe("SELECT name, borough");
		});

		it("selects expression nodes", () => {
			const q = SoQL.query().select("name", SoQL.alias(SoQL.count("*"), "total"));
			expect(q.toParams()).toBe("$select=name,count(*) AS total");
		});
	});

	describe(".selectDistinct()", () => {
		it("produces SELECT DISTINCT", () => {
			const q = SoQL.query().selectDistinct("borough");
			expect(q.toBody()).toBe("SELECT DISTINCT borough");
			expect(q.toParams()).toBe("$select=DISTINCT borough");
		});
	});

	describe(".where()", () => {
		it("adds a where clause", () => {
			const q = SoQL.query().where(SoQL.eq("borough", "BROOKLYN"));
			expect(q.toBody()).toBe("WHERE borough = 'BROOKLYN'");
		});

		it("AND-folds multiple where calls", () => {
			const q = SoQL.query().where(SoQL.eq("borough", "BROOKLYN")).where(SoQL.gt("population", 100000));
			expect(q.toBody()).toBe("WHERE (borough = 'BROOKLYN') AND (population > 100000)");
		});

		it("AND-folds three where calls", () => {
			const q = SoQL.query().where(SoQL.eq("a", 1)).where(SoQL.eq("b", 2)).where(SoQL.eq("c", 3));
			expect(q.toBody()).toBe("WHERE ((a = 1) AND (b = 2)) AND (c = 3)");
		});
	});

	describe(".orderBy()", () => {
		it("defaults to ASC", () => {
			const q = SoQL.query().orderBy("name");
			expect(q.toBody()).toBe("ORDER BY name ASC");
		});

		it("accepts DESC", () => {
			const q = SoQL.query().orderBy("population", "DESC");
			expect(q.toBody()).toBe("ORDER BY population DESC");
		});

		it("appends multiple order items", () => {
			const q = SoQL.query().orderBy("borough").orderBy("name", "DESC");
			expect(q.toBody()).toBe("ORDER BY borough ASC, name DESC");
		});
	});

	describe(".groupBy()", () => {
		it("groups by column names", () => {
			const q = SoQL.query().groupBy("borough", "category");
			expect(q.toBody()).toBe("GROUP BY borough, category");
		});
	});

	describe(".having()", () => {
		it("adds a having clause", () => {
			const q = SoQL.query().having(SoQL.gt(SoQL.count("*"), 10));
			expect(q.toBody()).toBe("HAVING count(*) > 10");
		});
	});

	describe(".limit()", () => {
		it("adds a limit clause", () => {
			expect(SoQL.query().limit(25).toParams()).toBe("$limit=25");
		});
	});

	describe(".offset()", () => {
		it("adds an offset clause", () => {
			expect(SoQL.query().offset(50).toParams()).toBe("$offset=50");
		});
	});

	describe(".q()", () => {
		it("adds a full-text search", () => {
			expect(SoQL.query().q("fire alarm").toParams()).toBe("$q=fire alarm");
		});

		it("is omitted from body output", () => {
			expect(SoQL.query().q("fire alarm").toBody()).toBe("");
		});
	});

	describe("immutability", () => {
		it("does not mutate the original builder", () => {
			const base = SoQL.query().select("name", "borough").limit(25);
			const brooklyn = base.where(SoQL.eq("borough", "BROOKLYN"));
			const queens = base.where(SoQL.eq("borough", "QUEENS"));

			expect(base.toBody()).toBe("SELECT name, borough LIMIT 25");
			expect(brooklyn.toBody()).toBe("SELECT name, borough WHERE borough = 'BROOKLYN' LIMIT 25");
			expect(queens.toBody()).toBe("SELECT name, borough WHERE borough = 'QUEENS' LIMIT 25");
		});

		it("orderBy does not modify previous builder", () => {
			const base = SoQL.query().select("name").orderBy("name");
			const withPop = base.orderBy("population", "DESC");

			expect(base.toBody()).toBe("SELECT name ORDER BY name ASC");
			expect(withPop.toBody()).toBe("SELECT name ORDER BY name ASC, population DESC");
		});
	});

	describe("full query examples from spec", () => {
		it("builds the primary spec example", () => {
			const q = SoQL.query()
				.select("name", "population", "location")
				.where(SoQL.gt("population", 100000))
				.orderBy("population", "DESC")
				.groupBy("borough")
				.having(SoQL.gt(SoQL.count("*"), 10))
				.limit(25)
				.offset(50);

			const params = q.toParams();
			expect(params).toContain("$select=name,population,location");
			expect(params).toContain("$where=population > 100000");
			expect(params).toContain("$order=population DESC");
			expect(params).toContain("$group=borough");
			expect(params).toContain("$having=count(*) > 10");
			expect(params).toContain("$limit=25");
			expect(params).toContain("$offset=50");

			const body = q.toBody();
			expect(body).toBe(
				"SELECT name, population, location WHERE population > 100000 GROUP BY borough HAVING count(*) > 10 ORDER BY population DESC LIMIT 25 OFFSET 50",
			);
		});

		it("builds the OR example from spec", () => {
			const q = SoQL.query()
				.select("name", "borough")
				.where(SoQL.or(SoQL.eq("borough", "BROOKLYN"), SoQL.eq("borough", "QUEENS")));

			expect(q.toBody()).toBe("SELECT name, borough WHERE (borough = 'BROOKLYN') OR (borough = 'QUEENS')");
		});

		it("builds the plain fetch example from spec", () => {
			const q = SoQL.query().select("complaint_type", "borough").where(SoQL.eq("borough", "BROOKLYN")).limit(10);

			const url = `https://data.cityofnewyork.us/resource/erm2-nwe9.json?${q.toParams()}`;
			expect(url).toContain("$select=complaint_type,borough");
			expect(url).toContain("$where=borough = 'BROOKLYN'");
			expect(url).toContain("$limit=10");
		});
	});
});

describe("SoQL static methods", () => {
	it("exposes eq", () => {
		expect(SoQL.eq("a", 1)._tag).toBe("BinaryOp");
	});

	it("exposes count", () => {
		expect(SoQL.count("*")._tag).toBe("FunctionCall");
	});

	it("exposes alias", () => {
		expect(SoQL.alias(SoQL.count("*"), "total")._tag).toBe("Alias");
	});

	it("exposes column", () => {
		expect(SoQL.column("name")._tag).toBe("Column");
	});

	it("exposes raw", () => {
		expect(SoQL.raw("1=1")._tag).toBe("Raw");
	});
});
