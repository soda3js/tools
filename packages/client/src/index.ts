// SoQL re-export
export { SoQL } from "@soda3js/soql";

// Errors
export { SodaAuthError } from "./errors/SodaAuthError.js";
export { SodaNotFoundError } from "./errors/SodaNotFoundError.js";
export { SodaQueryError } from "./errors/SodaQueryError.js";
export { SodaRateLimitError } from "./errors/SodaRateLimitError.js";
export { SodaServerError } from "./errors/SodaServerError.js";
export { SodaTimeoutError } from "./errors/SodaTimeoutError.js";

import type { SodaAuthError } from "./errors/SodaAuthError.js";
import type { SodaNotFoundError } from "./errors/SodaNotFoundError.js";
import type { SodaQueryError } from "./errors/SodaQueryError.js";
import type { SodaRateLimitError } from "./errors/SodaRateLimitError.js";
import type { SodaServerError } from "./errors/SodaServerError.js";
import type { SodaTimeoutError } from "./errors/SodaTimeoutError.js";

export type SodaError =
	| SodaAuthError
	| SodaQueryError
	| SodaNotFoundError
	| SodaServerError
	| SodaRateLimitError
	| SodaTimeoutError;

// Layer
export { SodaClientLive } from "./layers/SodaClientLive.js";
// Schemas
export { Column } from "./schemas/Column.js";
export { DatasetMetadata } from "./schemas/DatasetMetadata.js";
export { Owner } from "./schemas/Owner.js";
export { SodaClientConfig } from "./schemas/SodaClientConfig.js";
export { SodaErrorResponse } from "./schemas/SodaErrorResponse.js";
// Service
export { SodaClient } from "./services/SodaClient.js";
// Metrics
export { errorsTotal, requestDuration, requestsTotal, retriesTotal } from "./utils/metrics.js";
export type { ApiModeConfig } from "./utils/mode.js";
// Redaction
export { redactHeaders, redactUrl } from "./utils/redact.js";
