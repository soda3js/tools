import { Data } from "effect";

export class SodaTimeoutError extends Data.TaggedError("SodaTimeoutError")<{
	readonly timeout: number;
}> {
	get message() {
		return `Request timed out after ${this.timeout}ms.`;
	}
}
