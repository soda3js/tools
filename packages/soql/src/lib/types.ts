/**
 * All SoQL data type names as returned by the SODA API metadata endpoint.
 */
export type SoQLDataType =
	| "text"
	| "number"
	| "checkbox"
	| "point"
	| "multipoint"
	| "line"
	| "multiline"
	| "polygon"
	| "multipolygon"
	| "location"
	| "floating_timestamp"
	| "fixed_timestamp"
	| "money"
	| "url"
	| "phone"
	| "email"
	| "html"
	| "calendar_date"
	| "photo"
	| "document"
	| "blob";

/**
 * Maps SoQL data types to their JavaScript runtime representations.
 * Used for type-level documentation; no runtime code.
 */
export interface SoQLTypeMap {
	text: string;
	number: number;
	checkbox: boolean;
	point: { type: "Point"; coordinates: [lng: number, lat: number] };
	multipoint: {
		type: "MultiPoint";
		coordinates: Array<[lng: number, lat: number]>;
	};
	line: {
		type: "LineString";
		coordinates: Array<[lng: number, lat: number]>;
	};
	multiline: {
		type: "MultiLineString";
		coordinates: Array<Array<[lng: number, lat: number]>>;
	};
	polygon: {
		type: "Polygon";
		coordinates: Array<Array<[lng: number, lat: number]>>;
	};
	multipolygon: {
		type: "MultiPolygon";
		coordinates: Array<Array<Array<[lng: number, lat: number]>>>;
	};
	location: {
		latitude: string;
		longitude: string;
		human_address?: string;
	};
	floating_timestamp: string;
	fixed_timestamp: string;
	money: number;
	url: { url: string; description?: string };
	phone: { phone_number: string; phone_type?: string };
	email: string;
	html: string;
	calendar_date: string;
	photo: string;
	document: { file_id: string; filename: string };
	blob: string;
}

/** Sort direction for ORDER BY clauses. */
export type SortDirection = "ASC" | "DESC";

/** Value types the compiler can serialize into SoQL literals. */
export type SoQLValue = string | number | boolean | null;
