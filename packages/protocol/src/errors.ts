/**
 * Shape of all SODA API error responses.
 */
export interface SodaErrorResponseShape {
	code: string;
	error: true;
	message: string;
	data?: unknown;
}
