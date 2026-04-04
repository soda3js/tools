import type { SodaErrorResponseShape } from "./errors.js";
import type { ColumnShape, DatasetMetadataShape, OwnerShape } from "./metadata.js";

function isObject(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Type guard for ColumnShape. Validates required fields and their types.
 */
export function isColumnShape(value: unknown): value is ColumnShape {
	if (!isObject(value)) return false;
	return (
		typeof value.id === "number" &&
		typeof value.fieldName === "string" &&
		typeof value.dataTypeName === "string" &&
		typeof value.renderTypeName === "string" &&
		typeof value.position === "number"
	);
}

/**
 * Type guard for OwnerShape. Validates required fields and their types.
 */
export function isOwnerShape(value: unknown): value is OwnerShape {
	if (!isObject(value)) return false;
	return typeof value.id === "string" && typeof value.displayName === "string";
}

/**
 * Type guard for DatasetMetadataShape. Validates required fields, their types,
 * and nested columns/owner structures.
 */
export function isDatasetMetadataShape(value: unknown): value is DatasetMetadataShape {
	if (!isObject(value)) return false;
	if (typeof value.id !== "string") return false;
	if (typeof value.name !== "string") return false;
	if (typeof value.rowsUpdatedAt !== "number") return false;
	if (typeof value.viewLastModified !== "number") return false;
	if (!Array.isArray(value.columns) || !value.columns.every(isColumnShape)) return false;
	if (!isOwnerShape(value.owner)) return false;
	return true;
}

/**
 * Type guard for SodaErrorResponseShape. Validates required fields including
 * the literal `error: true` discriminant.
 */
export function isSodaErrorResponseShape(value: unknown): value is SodaErrorResponseShape {
	if (!isObject(value)) return false;
	return typeof value.code === "string" && value.error === true && typeof value.message === "string";
}
