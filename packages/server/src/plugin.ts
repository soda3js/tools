import type { Server } from "node:http";
import type { Plugin } from "vitest/config";
import { startHttpServer } from "./lib/http-server.js";
import type { ServerOptions } from "./lib/types.js";

export function ServerPlugin(options: ServerOptions): Plugin {
	let server: Server | null = null;

	return {
		name: "soda3js:test-server",

		async configureVitest({ vitest }) {
			const httpOptions = {
				fixtures: options.fixtures,
				mode: options.mode ?? "replay",
				port: options.port ?? 0,
				...(options.auth !== undefined ? { auth: options.auth } : {}),
				...(options.faults !== undefined ? { faults: options.faults } : {}),
				...(options.chaos !== undefined ? { chaos: options.chaos } : {}),
				...(options.record !== undefined ? { record: options.record } : {}),
			};
			const { server: httpServer, info } = await startHttpServer(httpOptions);

			server = httpServer;

			process.env.SODA3_TEST_SERVER = info.url;

			vitest.config.provide = {
				...(vitest.config.provide ?? {}),
				soda3TestServer: info.url,
			};

			return async () => {
				const s = server;
				if (s) {
					await new Promise<void>((resolve) => {
						s.close(() => resolve());
					});
					server = null;
				}
			};
		},

		async closeBundle() {
			const s = server;
			if (s) {
				await new Promise<void>((resolve) => {
					s.close(() => resolve());
				});
				server = null;
			}
		},
	};
}
