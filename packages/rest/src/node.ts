export * from "@soda3js/client";
export { type QueryOptions, Soda3ClientBase, type Soda3ClientConfig } from "./soda3-client.js";

import { NodeHttpClient } from "@effect/platform-node";
import type { SodaClientConfig } from "@soda3js/client";
import { SodaClientLive } from "@soda3js/client";
import { Layer } from "effect";
import type { Soda3ClientConfig as ClientConfig } from "./soda3-client.js";
import { Soda3ClientBase } from "./soda3-client.js";

export const NodeSodaClientLive = (config?: SodaClientConfig) =>
	SodaClientLive(config).pipe(Layer.provide(NodeHttpClient.layerUndici));

export class Soda3Client extends Soda3ClientBase {
	constructor(config: ClientConfig) {
		super(config, NodeHttpClient.layerUndici);
	}
}
