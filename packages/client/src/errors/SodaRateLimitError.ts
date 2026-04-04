import { Data } from "effect";

export class SodaRateLimitError extends Data.TaggedError("SodaRateLimitError")<{
	readonly retryAfter: number;
}> {
	get message() {
		return `Rate limited. Retry after ${this.retryAfter}ms.`;
	}
}
