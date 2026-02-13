import { NextResponse } from "next/server";
import { renderFRDToMarkdown } from "@/lib/ai/frd-renderer";
import { generateFRD } from "@/lib/ai/generation-engine";
import { composeGenerationPrompt } from "@/lib/ai/prompt-composer";
import { trackEvent } from "@/lib/analytics";
import { requireAuth } from "@/lib/auth/require-auth";
import { hasUserConsented } from "@/lib/db/consent";
import { addCredits, chargeCredits } from "@/lib/db/credits";
import { getProjectForUser, updateProject } from "@/lib/db/projects";
import { getVersion, saveVersion } from "@/lib/db/versions";
import { createLogger } from "@/lib/logger";
import { checkRateLimit } from "@/lib/rate-limit";
import { CREDIT_COSTS } from "@/lib/stripe/config";
import { GenerationRequestSchema } from "@/lib/validation/generation";

export async function POST(req: Request) {
	const auth = await requireAuth(req);
	if (auth instanceof NextResponse) return auth;

	const logger = createLogger();

	// OBS-03: Rate limiting
	const rateCheck = checkRateLimit(auth.userId, "generate");
	if (!rateCheck.allowed) {
		return NextResponse.json(
			{ error: "Too many requests. Please try again later." },
			{
				status: 429,
				headers: { "Retry-After": String(Math.ceil((rateCheck.retryAfterMs ?? 60000) / 1000)) },
			},
		);
	}

	// DATA-03: Require consent before generation
	const consented = await hasUserConsented(auth.userId);
	if (!consented) {
		return NextResponse.json(
			{ error: "You must accept the terms of use before generating FRDs." },
			{ status: 403 },
		);
	}

	// Declared outside try for access in catch block (refund on failure)
	let creditCost = 0;
	let creditCharged = false;

	try {
		const body = await req.json();
		const input = GenerationRequestSchema.parse(body);

		// AUTH-03: Verify project ownership
		const project = await getProjectForUser(input.projectId, auth.userId);
		if (!project) {
			return NextResponse.json({ error: "Project not found" }, { status: 404 });
		}

		const modelId = input.modelId ?? "gemini-2.5-flash";
		const isIteration = !!input.parentVersionId;

		// CRED-01: Charge credits before generation
		creditCost = isIteration ? CREDIT_COSTS.iteration : CREDIT_COSTS.initial;
		const chargeResult = await chargeCredits(auth.userId, creditCost, {
			projectId: input.projectId,
			model: modelId,
			reason: isIteration ? "iteration" : "initial_generation",
		});
		if (!chargeResult.success) {
			return NextResponse.json(
				{ error: "Insufficient credits", balance: chargeResult.balance, required: creditCost },
				{ status: 402 },
			);
		}
		creditCharged = true;

		// OBS-02: Track generation start
		trackEvent(
			auth.userId,
			{
				event: "frd_generation_started",
				projectId: input.projectId,
				model: modelId,
				mode: input.mode,
				isIteration,
			},
			logger.correlationId,
		);

		// Handle iteration: get parent version content
		let parentVersionContent: string | undefined;
		if (input.parentVersionId) {
			const parentVersion = await getVersion(input.projectId, input.parentVersionId);
			if (parentVersion) {
				parentVersionContent = parentVersion.content;
			}

			trackEvent(
				auth.userId,
				{
					event: "iteration_started",
					projectId: input.projectId,
					parentVersionId: input.parentVersionId,
				},
				logger.correlationId,
			);
		}

		const generationInput = {
			projectId: input.projectId,
			projectName: input.projectName,
			brainDump: input.brainDump,
			mode: input.mode,
			followUpAnswers: input.followUpAnswers,
			guidedAnswers: input.guidedAnswers,
			modelId,
			iterationFeedback: input.iterationFeedback,
			parentVersionContent,
		};

		// Record the composed prompt (AUTH-04)
		const { prompt: composedPrompt } = composeGenerationPrompt(generationInput);

		const { frd, usage, generationTimeMs } = await generateFRD(generationInput);

		const markdown = renderFRDToMarkdown(frd);

		const versionNumber = project.versionCount + 1;

		const version = await saveVersion(input.projectId, {
			content: markdown,
			structuredData: frd,
			mode: input.mode,
			model: modelId,
			versionNumber,
			tokensUsed: usage.totalTokens,
			parentVersionId: input.parentVersionId,
			composedPrompt,
			metadata: {
				promptTokens: usage.promptTokens,
				completionTokens: usage.completionTokens,
				generationTimeMs,
			},
		});

		await updateProject(input.projectId, {
			latestVersionId: version.id,
			versionCount: versionNumber,
		});

		// OBS-02: Track generation success
		trackEvent(
			auth.userId,
			{
				event: "frd_generation_succeeded",
				projectId: input.projectId,
				versionId: version.id,
				model: modelId,
				durationMs: generationTimeMs,
				tokensUsed: usage.totalTokens,
			},
			logger.correlationId,
		);

		// CRED-06: Track credit charge
		trackEvent(
			auth.userId,
			{
				event: "credits_charged",
				amount: creditCost,
				projectId: input.projectId,
				versionId: version.id,
				model: modelId,
			},
			logger.correlationId,
		);

		if (isIteration) {
			trackEvent(
				auth.userId,
				{
					event: "iteration_completed",
					projectId: input.projectId,
					versionId: version.id,
				},
				logger.correlationId,
			);
		}

		return NextResponse.json({
			versionId: version.id,
			markdown,
			structuredData: frd,
		});
	} catch (error) {
		if (error instanceof Error && error.name === "ZodError") {
			return NextResponse.json(
				{ error: "Invalid input", details: (error as { issues?: unknown }).issues },
				{ status: 400 },
			);
		}

		// Refund credits if they were charged but generation failed
		if (creditCharged) {
			try {
				await addCredits(
					auth.userId,
					creditCost,
					{
						reason: "generation_failed_refund",
					},
					"refund",
				);
				trackEvent(
					auth.userId,
					{
						event: "credits_purchased",
						amount: creditCost,
						packageLabel: "refund:generation_failed",
					},
					logger.correlationId,
				);
			} catch (refundError) {
				logger.error("Credit refund failed", {
					userId: auth.userId,
					action: "credit_refund_failed",
					metadata: { error: refundError instanceof Error ? refundError.message : "Unknown" },
				});
			}
		}

		// OBS-02: Track generation failure
		trackEvent(
			auth.userId,
			{
				event: "frd_generation_failed",
				projectId: "unknown",
				model: "unknown",
				errorType: error instanceof Error ? error.name : "Unknown",
			},
			logger.correlationId,
		);

		// AUTH-06: Never log brain dump, prompt, or FRD content
		logger.error("Generation failed", {
			userId: auth.userId,
			action: "frd_generation_failed",
			metadata: { error: error instanceof Error ? error.message : "Unknown error" },
		});

		return NextResponse.json(
			{ error: "FRD generation failed. Please try again." },
			{ status: 500 },
		);
	}
}
