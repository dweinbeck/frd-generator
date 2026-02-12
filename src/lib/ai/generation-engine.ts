import "server-only";
import { generateText, Output } from "ai";
import type { GenerationInput } from "@/types";
import { type FRD, FRDSchema } from "./frd-schema";
import { getModel } from "./models";
import { composeGenerationPrompt } from "./prompt-composer";

export async function generateFRD(input: GenerationInput): Promise<{
	frd: FRD;
	usage: { promptTokens: number; completionTokens: number; totalTokens: number };
	generationTimeMs: number;
}> {
	const { system, prompt } = composeGenerationPrompt(input);
	const startTime = Date.now();

	const result = await generateText({
		model: getModel(input.modelId ?? "gemini-2.5-flash"),
		output: Output.object({ schema: FRDSchema }),
		system,
		prompt,
		maxOutputTokens: 8192,
		temperature: 0.1,
	});

	if (!result.output) {
		throw new Error("No structured output generated");
	}

	const generationTimeMs = Date.now() - startTime;

	return {
		frd: result.output,
		usage: {
			promptTokens: result.usage.inputTokens ?? 0,
			completionTokens: result.usage.outputTokens ?? 0,
			totalTokens: result.usage.totalTokens ?? 0,
		},
		generationTimeMs,
	};
}
