import { describe, expect, it } from "vitest";
import { buildQuery } from "../../../src/cli/commands/query.js";

describe("buildQuery", () => {
	describe("raw query mode (-q)", () => {
		it("uses raw SoQL when q is provided", () => {
			const builder = buildQuery({ q: "count(*)" });
			expect(builder.toParams()).toBe("$select=count(*)");
		});

		it("ignores structured options when q is provided", () => {
			const builder = buildQuery({
				q: "name, age",
				select: "ignored",
				where: "ignored = true",
				limit: 99,
			});
			// Only the raw query should appear
			expect(builder.toParams()).toBe("$select=name, age");
		});
	});

	describe("structured options", () => {
		it("builds select from comma-separated columns", () => {
			const builder = buildQuery({ select: "name, age, email" });
			expect(builder.toParams()).toBe("$select=name,age,email");
		});

		it("builds where clause from expression", () => {
			const builder = buildQuery({ where: "age > 21" });
			expect(builder.toParams()).toBe("$where=age > 21");
		});

		it("builds limit clause", () => {
			const builder = buildQuery({ limit: 10 });
			expect(builder.toParams()).toBe("$limit=10");
		});

		it("builds offset clause", () => {
			const builder = buildQuery({ offset: 50 });
			expect(builder.toParams()).toBe("$offset=50");
		});

		it("builds order clause with ascending default", () => {
			const builder = buildQuery({ order: "created_date" });
			expect(builder.toParams()).toBe("$order=created_date ASC");
		});

		it("builds order clause with explicit DESC", () => {
			const builder = buildQuery({ order: "created_date:DESC" });
			expect(builder.toParams()).toBe("$order=created_date DESC");
		});

		it("builds order clause with explicit ASC", () => {
			const builder = buildQuery({ order: "name:ASC" });
			expect(builder.toParams()).toBe("$order=name ASC");
		});

		it("normalizes direction to uppercase", () => {
			const builder = buildQuery({ order: "name:desc" });
			expect(builder.toParams()).toBe("$order=name DESC");
		});

		it("combines multiple options", () => {
			const builder = buildQuery({
				select: "name, age",
				where: "age > 21",
				limit: 10,
				offset: 20,
				order: "name:ASC",
			});
			const params = builder.toParams();
			expect(params).toContain("$select=name,age");
			expect(params).toContain("$where=age > 21");
			expect(params).toContain("$limit=10");
			expect(params).toContain("$offset=20");
			expect(params).toContain("$order=name ASC");
		});

		it("returns empty builder when no options are provided", () => {
			const builder = buildQuery({});
			expect(builder.toParams()).toBe("");
		});
	});

	describe("SODA3 body output", () => {
		it("compiles structured options to SQL body format", () => {
			const builder = buildQuery({
				select: "name, age",
				where: "age > 21",
				limit: 10,
			});
			const body = builder.toBody();
			expect(body).toBe("SELECT name, age WHERE age > 21 LIMIT 10");
		});

		it("compiles raw query to SQL body format", () => {
			const builder = buildQuery({ q: "count(*)" });
			expect(builder.toBody()).toBe("SELECT count(*)");
		});
	});
});
