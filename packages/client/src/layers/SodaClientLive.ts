import type { HttpClient } from "@effect/platform";
import { Layer } from "effect";
import { SodaClientConfig } from "../schemas/SodaClientConfig.js";
import { SodaClient } from "../services/SodaClient.js";

export const SodaClientLive = (
	config: SodaClientConfig = new SodaClientConfig({}),
): Layer.Layer<SodaClient, never, HttpClient.HttpClient> => Layer.effect(SodaClient, SodaClient.makeSodaClient(config));
