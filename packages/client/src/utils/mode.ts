export type ApiMode = "soda2" | "soda3";
export type ApiModeConfig = "auto" | "soda2" | "soda3";

export function resolveMode(options: { readonly mode?: ApiModeConfig; readonly appToken?: string }): ApiMode {
	const mode = options.mode ?? "auto";
	if (mode !== "auto") return mode;
	return options.appToken ? "soda3" : "soda2";
}
