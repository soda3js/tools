export interface DiscoveryResourceShape {
	readonly id: string;
	readonly name: string;
	readonly description: string;
	readonly type: string;
	readonly updatedAt: string;
	readonly columnsFieldName: readonly string[];
	readonly columnsDataType: readonly string[];
}

export interface DiscoveryClassificationShape {
	readonly categories: readonly string[];
	readonly tags: readonly string[];
	readonly domain_category: string;
	readonly domain_tags: readonly string[];
}

export interface DiscoveryResultShape {
	readonly resource: DiscoveryResourceShape;
	readonly classification: DiscoveryClassificationShape;
	readonly metadata: { readonly domain: string };
	readonly permalink: string;
}

export interface CatalogResponseShape {
	readonly results: readonly DiscoveryResultShape[];
	readonly resultSetSize: number;
	readonly timings: {
		readonly serviceMillis: number;
		readonly searchMillis: readonly number[];
	};
}

function isObject(val: unknown): val is Record<string, unknown> {
	return typeof val === "object" && val !== null && !Array.isArray(val);
}

export function isDiscoveryResultShape(val: unknown): val is DiscoveryResultShape {
	if (!isObject(val)) return false;
	const resource = (val as Record<string, unknown>).resource;
	if (!isObject(resource)) return false;
	return (
		typeof resource.id === "string" &&
		typeof resource.name === "string" &&
		typeof resource.type === "string" &&
		Array.isArray(resource.columnsFieldName)
	);
}

export function isCatalogResponseShape(val: unknown): val is CatalogResponseShape {
	if (!isObject(val)) return false;
	return (
		Array.isArray((val as Record<string, unknown>).results) &&
		typeof (val as Record<string, unknown>).resultSetSize === "number"
	);
}
