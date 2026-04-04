// Metric definitions only — not yet instrumented in endpoints.
// These will be wired into endpoint functions when retry and timeout
// logic is implemented. Consumers can reference these constants to
// build dashboards ahead of instrumentation.
import { Metric, MetricBoundaries } from "effect";

export const requestsTotal = Metric.counter("soda3js.client.requests.total", {
	description: "Total number of SODA API requests made",
});

export const requestDuration = Metric.histogram(
	"soda3js.client.request.duration",
	MetricBoundaries.fromIterable([10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000]),
	"Duration of SODA API requests in milliseconds",
);

export const errorsTotal = Metric.counter("soda3js.client.errors.total", {
	description: "Total number of SODA API errors",
});

export const retriesTotal = Metric.counter("soda3js.client.retries.total", {
	description: "Total number of SODA API request retries",
});
