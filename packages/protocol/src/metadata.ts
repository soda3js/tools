/**
 * Shape of a column descriptor in the SODA API metadata response.
 */
export interface ColumnShape {
	id: number;
	fieldName: string;
	dataTypeName: string;
	description?: string;
	renderTypeName: string;
	position: number;
}

/**
 * Shape of the dataset owner in the SODA API metadata response.
 */
export interface OwnerShape {
	id: string;
	displayName: string;
}

/**
 * Shape of the dataset metadata response from GET /api/views/:id.json.
 */
export interface DatasetMetadataShape {
	id: string;
	name: string;
	description?: string;
	assetType?: string;
	category?: string;
	tags?: string[];
	columns: ColumnShape[];
	owner: OwnerShape;
	rowsUpdatedAt: number;
	viewLastModified: number;
}
