import type { Server } from "node:http";
import { startHttpServer } from "./lib/http-server.js";
import type { ServerInfo, ServerOptions } from "./lib/types.js";

export class TestServer {
	readonly url: string;
	readonly port: number;
	private _server: Server;
	private _requestCountGetter: () => number;

	private constructor(server: Server, info: ServerInfo, requestCountGetter: () => number) {
		this._server = server;
		this.url = info.url;
		this.port = info.port;
		this._requestCountGetter = requestCountGetter;
	}

	get requestCount(): number {
		return this._requestCountGetter();
	}

	async close(): Promise<void> {
		return new Promise((resolve, reject) => {
			this._server.close((err) => {
				if (err) reject(err);
				else resolve();
			});
		});
	}

	static async create(options: ServerOptions): Promise<TestServer> {
		const httpOptions = {
			fixtures: options.fixtures,
			mode: options.mode ?? "replay",
			port: options.port ?? 0,
			...(options.auth !== undefined ? { auth: options.auth } : {}),
			...(options.faults !== undefined ? { faults: options.faults } : {}),
			...(options.chaos !== undefined ? { chaos: options.chaos } : {}),
			...(options.record !== undefined ? { record: options.record } : {}),
		};
		const result = await startHttpServer(httpOptions);

		return new TestServer(result.server, result.info, () => result.requestCount);
	}
}
