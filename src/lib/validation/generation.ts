import { z } from "zod/v4";

const FollowUpAnswerSchema = z.object({
	section: z.string(),
	question: z.string(),
	answer: z.string().min(1, "Answer is required"),
});

const GuidedAnswerSchema = z.object({
	section: z.string(),
	question: z.string(),
	answer: z.string().min(1, "Answer is required"),
});

export const GenerationRequestSchema = z
	.object({
		projectId: z.string().min(1, "Project ID is required"),
		projectName: z.string().min(1, "Project name is required").max(100),
		brainDump: z.string().max(15000, "Input exceeds maximum length of 15,000 characters"),
		mode: z.enum(["fast", "standard"]),
		followUpAnswers: z.array(FollowUpAnswerSchema).optional(),
		guidedAnswers: z.array(GuidedAnswerSchema).optional(),
		modelId: z.enum(["gemini-2.5-flash", "gemini-3-pro-preview"]).optional(),
		parentVersionId: z.string().optional(),
		iterationFeedback: z.string().max(10000).optional(),
	})
	.refine(
		(data) => {
			if (data.mode === "fast") {
				return data.brainDump.length >= 50;
			}
			return true;
		},
		{
			message: "Please provide at least 50 characters to generate a meaningful FRD",
			path: ["brainDump"],
		},
	);

export type GenerationRequest = z.infer<typeof GenerationRequestSchema>;

export const RatingSchema = z.object({
	rating: z.number().min(0.5).max(5).step(0.5),
});

export const GapDetectionRequestSchema = z.object({
	projectName: z.string().min(1, "Project name is required").max(100),
	brainDump: z
		.string()
		.min(50, "Please provide at least 50 characters for gap analysis")
		.max(15000, "Input exceeds maximum length of 15,000 characters"),
	modelId: z.enum(["gemini-2.5-flash", "gemini-3-pro-preview"]).optional(),
});

export type GapDetectionRequest = z.infer<typeof GapDetectionRequestSchema>;
