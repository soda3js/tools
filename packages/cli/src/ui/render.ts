import { Effect } from "effect";

/**
 * Lazily render an Ink component to a string.
 *
 * Dynamically imports `ink` and `react` to avoid loading them at module scope,
 * which prevents React/Ink side effects from keeping the process alive in tests.
 *
 * The factory receives `React` and can dynamically import UI components.
 */
export function renderInk(
	factory: (React: typeof import("react")) => import("react").ReactElement | Promise<import("react").ReactElement>,
): Effect.Effect<string> {
	return Effect.promise(async () => {
		const [React, { renderToString }] = await Promise.all([import("react"), import("ink")]);
		const element = await factory(React);
		const columns = process.stdout.columns ?? 80;
		return renderToString(element, { columns });
	});
}

/**
 * Check whether stdout is connected to a TTY (interactive terminal).
 */
export function isTTY(): boolean {
	return process.stdout.isTTY ?? false;
}
