import { Effect } from "effect";

export interface ResponseContext {
	readonly domain: string;
	readonly datasetId?: string;
	readonly endpoint: "query" | "metadata" | "export" | "discover";
	readonly timing: { readonly requestMs: number };
}

export interface ResponseHook<T = unknown> {
	readonly onResponse: (result: T, context: ResponseContext) => Effect.Effect<void>;
}

export interface ResponseHooks {
	readonly query?: ResponseHook;
	readonly metadata?: ResponseHook;
	readonly export?: ResponseHook;
	readonly discover?: ResponseHook;
}

export function runHook<T>(
	hooks: ResponseHooks,
	endpoint: keyof ResponseHooks,
	result: T,
	context: ResponseContext,
): Effect.Effect<void> {
	const hook = hooks[endpoint];
	if (!hook) return Effect.void;
	return hook.onResponse(result, context).pipe(Effect.catchAllCause(() => Effect.void));
}
