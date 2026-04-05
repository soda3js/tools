import type { IncomingHttpHeaders } from "node:http";

// --- Fixture Envelope ---

export interface FixtureEnvelope {
	dataset_id: string;
	portal: string;
	recorded_at: string;
	latency_ms: number;
	auth: {
		required: boolean;
		token_used: boolean;
	};
	pagination?: {
		page: number;
		total_in_sequence: number;
	};
	request: {
		method: string;
		path: string;
		headers: Record<string, string>;
		body: unknown;
	};
	response: {
		status: number;
		content_type: string;
		headers: Record<string, string>;
		body_file: string;
	};
}

// --- Request Matching ---

export interface FixtureIndex {
	/** Map from lookup key to envelope + body file path */
	entries: Map<string, IndexedFixture>;
	/** Map from path-only key to envelope (fallback match) */
	pathEntries: Map<string, IndexedFixture>;
}

export interface IndexedFixture {
	envelope: FixtureEnvelope;
	envelopePath: string;
	bodyPath: string;
}

// --- Fault Injection ---

export interface FaultRule {
	match: string;
	status?: number;
	type?: "timeout" | "reset";
	delay_ms?: number;
	after?: number;
	without_auth?: boolean;
}

// --- Chaos Monkey ---

export interface ChaosFault {
	status?: number;
	type?: "timeout" | "reset";
	delay_ms?: number;
	weight: number;
}

export interface ChaosConfig {
	enabled: boolean;
	probability: number;
	seed?: number;
	faults: ChaosFault[];
	latency?: {
		min_ms: number;
		max_ms: number;
	};
}

// --- Server Configuration ---

export type ServerMode = "replay" | "record" | "chaos";

export interface RecordConfig {
	portal: string;
	fixtures: string;
	overwrite?: boolean;
}

export interface AuthConfig {
	required: boolean;
	token: string;
}

export interface ServerOptions {
	fixtures: string;
	mode?: ServerMode;
	port?: number;
	auth?: AuthConfig;
	faults?: FaultRule[];
	chaos?: ChaosConfig;
	record?: RecordConfig;
}

// --- Server Instance ---

export interface ServerInfo {
	url: string;
	port: number;
}

// --- Incoming Request (parsed) ---

export interface ParsedRequest {
	method: string;
	path: string;
	query: Record<string, string>;
	headers: IncomingHttpHeaders;
	body: unknown;
}
