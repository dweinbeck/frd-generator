import "server-only";
import { createLogger } from "./logger";

/**
 * Server-side analytics event tracking (OBS-02).
 * Events are logged as structured JSON for consumption by log analytics.
 * AUTH-06: Never include prompt content in analytics payloads.
 */

type AnalyticsEvent =
	| { event: "project_created"; projectId: string; mode: string }
	| { event: "mode_selected"; mode: string }
	| {
			event: "frd_generation_started";
			projectId: string;
			model: string;
			mode: string;
			isIteration: boolean;
	  }
	| {
			event: "frd_generation_succeeded";
			projectId: string;
			versionId: string;
			model: string;
			durationMs: number;
			tokensUsed: number;
	  }
	| { event: "frd_generation_failed"; projectId: string; model: string; errorType: string }
	| {
			event: "credits_charged";
			amount: number;
			projectId: string;
			versionId: string;
			model: string;
	  }
	| { event: "credits_purchased"; amount: number; packageLabel: string }
	| { event: "iteration_started"; projectId: string; parentVersionId: string }
	| { event: "iteration_completed"; projectId: string; versionId: string }
	| { event: "markdown_copied"; projectId: string }
	| { event: "markdown_downloaded"; projectId: string }
	| { event: "rating_submitted"; projectId: string; versionId: string; rating: number };

export function trackEvent(userId: string, data: AnalyticsEvent, correlationId?: string) {
	const logger = createLogger(correlationId);
	logger.info(`analytics:${data.event}`, {
		userId,
		action: data.event,
		metadata: data as unknown as Record<string, unknown>,
	});
}
