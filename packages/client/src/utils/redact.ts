const REDACTED = "[REDACTED]";
const SENSITIVE_HEADERS = ["x-app-token", "authorization"];

/**
 * Replaces the value of $$app_token in a URL query string with [REDACTED].
 */
export function redactUrl(url: string): string {
	return url.replace(/([?&]\$\$app_token=)[^&]*/g, `$1${REDACTED}`);
}

/**
 * Returns a copy of the headers with sensitive values replaced by [REDACTED].
 * Does not mutate the input object.
 */
export function redactHeaders(headers: Record<string, string>): Record<string, string> {
	const result = { ...headers };
	for (const key of Object.keys(result)) {
		if (SENSITIVE_HEADERS.includes(key.toLowerCase())) {
			result[key] = REDACTED;
		}
	}
	return result;
}
