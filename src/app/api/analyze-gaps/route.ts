import { NextResponse } from "next/server";
import { analyzeGaps } from "@/lib/ai/gap-detection-engine";
import { requireAuth } from "@/lib/auth/require-auth";
import { createLogger } from "@/lib/logger";
import { checkRateLimit } from "@/lib/rate-limit";
import { GapDetectionRequestSchema } from "@/lib/validation/generation";

export async function POST(req: Request) {
	const auth = await requireAuth(req);
	if (auth instanceof NextResponse) return auth;

	const logger = createLogger();

	// OBS-03: Rate limiting
	const rateCheck = checkRateLimit(auth.userId, "analyze-gaps");
	if (!rateCheck.allowed) {
		return NextResponse.json(
			{ error: "Too many requests. Please try again later." },
			{
				status: 429,
				headers: { "Retry-After": String(Math.ceil((rateCheck.retryAfterMs ?? 60000) / 1000)) },
			},
		);
	}

	try {
		const body = await req.json();
		const input = GapDetectionRequestSchema.parse(body);

		const result = await analyzeGaps({
			projectName: input.projectName,
			brainDump: input.brainDump,
			modelId: input.modelId,
		});

		return NextResponse.json(result);
	} catch (error) {
		if (error instanceof Error && error.name === "ZodError") {
			return NextResponse.json(
				{ error: "Invalid input", details: (error as { issues?: unknown }).issues },
				{ status: 400 },
			);
		}

		// AUTH-06: Never log brain dump content
		logger.error("Gap analysis failed", {
			userId: auth.userId,
			action: "gap_analysis_failed",
			metadata: { error: error instanceof Error ? error.message : "Unknown error" },
		});

		return NextResponse.json({ error: "Gap analysis failed. Please try again." }, { status: 500 });
	}
}
