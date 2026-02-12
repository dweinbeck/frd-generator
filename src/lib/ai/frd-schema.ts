import "server-only";
import { z } from "zod/v4";

export const FRDSchema = z.object({
	projectName: z.string().describe("The name of the project"),
	coreValue: z
		.string()
		.describe("One-line core value proposition summarizing the project's main benefit"),
	overview: z
		.string()
		.describe(
			"A 2-3 paragraph project overview explaining what the project does, why it exists, and who it serves",
		),
	personas: z
		.array(
			z.object({
				name: z.string().describe("Persona name (e.g., 'End User', 'Admin', 'Developer')"),
				description: z.string().describe("Who this persona is and their context"),
				goals: z.array(z.string()).describe("What this persona wants to achieve"),
			}),
		)
		.describe("Target user personas (2-4 personas based on the described use case)"),
	requirements: z
		.array(
			z.object({
				id: z.string().describe("Sequential requirement ID (e.g., 'REQ-01', 'REQ-02')"),
				category: z
					.string()
					.describe("Logical category grouping (e.g., 'User Management', 'Data', 'Notifications')"),
				description: z
					.string()
					.describe("Clear, actionable description of what the system must do"),
				priority: z
					.enum(["must-have", "should-have", "nice-to-have"])
					.describe("Priority based on user emphasis and logical dependencies"),
				acceptanceCriteria: z
					.array(z.string())
					.describe("Specific, testable criteria to verify this requirement is met"),
			}),
		)
		.describe("Functional requirements organized by category with sequential IDs"),
	constraints: z
		.array(
			z.object({
				category: z
					.string()
					.describe("Constraint type (e.g., 'Technical', 'Business', 'Regulatory', 'Performance')"),
				description: z.string().describe("The specific constraint"),
			}),
		)
		.describe("Technical and business constraints inferred from the project description"),
	outOfScope: z
		.array(z.string())
		.describe("Features or capabilities explicitly excluded from the project scope"),
	assumptions: z
		.array(z.string())
		.describe("Assumptions that need validation before or during implementation"),
	openQuestions: z
		.array(z.string())
		.describe("Questions about ambiguities in the input that need answers before implementation"),
});

export type FRD = z.infer<typeof FRDSchema>;
