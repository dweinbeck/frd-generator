import "server-only";
import { z } from "zod/v4";

export const GapSchema = z.object({
	gaps: z
		.array(
			z.object({
				section: z
					.string()
					.describe(
						"The FRD section this gap relates to (e.g., 'Personas', 'Requirements', 'Constraints')",
					),
				description: z.string().describe("What information is missing or unclear"),
				followUpPrompt: z
					.string()
					.describe(
						"A targeted question to ask the user to fill this gap. Should be specific and actionable.",
					),
				importance: z
					.enum(["high", "medium", "low"])
					.describe("How critical this gap is for generating a quality FRD"),
			}),
		)
		.describe("Identified gaps in the user's brain dump"),
});

export type GapAnalysis = z.infer<typeof GapSchema>;
export type Gap = GapAnalysis["gaps"][number];
