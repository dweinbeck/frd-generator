import "server-only";
import { generateText, Output } from "ai";
import { type GapAnalysis, GapSchema } from "./gap-detection-schema";
import { getModel } from "./models";
import { GAP_DETECTION_PROMPT } from "./templates/gap-detection";

export async function analyzeGaps(input: {
	projectName: string;
	brainDump: string;
	modelId?: string;
}): Promise<GapAnalysis> {
	const prompt = `Analyze the following project description for gaps and missing information.

Project Name: ${input.projectName}

Project Description (Brain Dump):
${input.brainDump}`;

	const result = await generateText({
		model: getModel(input.modelId ?? "gemini-2.5-flash"),
		output: Output.object({ schema: GapSchema }),
		system: GAP_DETECTION_PROMPT,
		prompt,
		maxOutputTokens: 4096,
		temperature: 0.2,
	});

	if (!result.output) {
		return { gaps: [] };
	}

	return result.output;
}
