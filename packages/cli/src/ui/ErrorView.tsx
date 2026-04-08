import { Box, Text } from "ink";
import type React from "react";

export interface ErrorInfo {
	readonly _tag: string;
	readonly message?: string;
	readonly code?: string;
	readonly domain?: string;
	readonly datasetId?: string;
	readonly soql?: string;
	readonly retryAfter?: number;
	readonly timeout?: number;
	readonly requestId?: string;
}

function mapErrorToDisplay(error: ErrorInfo): { title: string; hint: string; details: string | undefined } {
	switch (error._tag) {
		case "SodaAuthError":
			return {
				title: "Authentication Failed",
				hint: "Check your app token or API credentials. Run 'soda3 config show' to verify.",
				details: error.message,
			};
		case "SodaNotFoundError":
			return {
				title: "Dataset Not Found",
				hint: `Dataset '${error.datasetId ?? "unknown"}' was not found on ${error.domain ?? "the server"}.`,
				details: error.message,
			};
		case "SodaQueryError":
			return {
				title: "Query Error",
				hint: error.soql !== undefined ? `Check your SoQL: ${error.soql}` : "Check your query syntax.",
				details: error.message,
			};
		case "SodaRateLimitError":
			return {
				title: "Rate Limited",
				hint:
					error.retryAfter !== undefined
						? `Retry after ${error.retryAfter}ms. Consider adding an app token for higher limits.`
						: "You have exceeded the API rate limit. Add an app token for higher limits.",
				details: undefined,
			};
		case "SodaServerError":
			return {
				title: "Server Error",
				hint: error.requestId !== undefined ? `Request ID: ${error.requestId}` : "The server encountered an error.",
				details: error.message,
			};
		case "SodaTimeoutError":
			return {
				title: "Request Timeout",
				hint:
					error.timeout !== undefined
						? `Request timed out after ${error.timeout}ms. Try a smaller query or increase the timeout.`
						: "The request timed out. Try a smaller query.",
				details: undefined,
			};
		case "SodaParseError":
			return {
				title: "Parse Error",
				hint: "The server response could not be parsed. This may indicate an API change.",
				details: error.message,
			};
		default:
			return {
				title: "Error",
				hint: "An unexpected error occurred.",
				details: error.message ?? String(error),
			};
	}
}

export function ErrorView({ error }: { readonly error: ErrorInfo }): React.ReactElement {
	const { title, hint, details } = mapErrorToDisplay(error);

	return (
		<Box flexDirection="column" paddingLeft={1}>
			<Box>
				<Text color="red" bold>
					{"\u2716"} {title}
				</Text>
				{error.code !== undefined && <Text dimColor> [{error.code}]</Text>}
			</Box>
			{details !== undefined && (
				<Box paddingLeft={2}>
					<Text>{details}</Text>
				</Box>
			)}
			<Box paddingLeft={2}>
				<Text color="yellow">{hint}</Text>
			</Box>
		</Box>
	);
}

/**
 * Format an error to a plain text string for non-TTY output.
 */
export function formatErrorPlain(error: ErrorInfo): string {
	const { title, hint, details } = mapErrorToDisplay(error);
	const lines = [`Error: ${title}`];
	if (error.code !== undefined) lines[0] += ` [${error.code}]`;
	if (details !== undefined) lines.push(`  ${details}`);
	lines.push(`  ${hint}`);
	return lines.join("\n");
}
