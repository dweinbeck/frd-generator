import "server-only";
import type { GenerationInput } from "@/types";
import { SYSTEM_PROMPT } from "./templates/system";

export function composeGenerationPrompt(input: GenerationInput): {
	system: string;
	prompt: string;
} {
	const sections: string[] = [];

	if (input.iterationFeedback && input.parentVersionContent) {
		sections.push(
			"Revise the following Functional Requirements Document based on the user's feedback. Maintain all existing content unless the feedback specifically asks to change it. Add, modify, or remove requirements as directed.",
		);
		sections.push(`\nProject Name: ${input.projectName}`);
		sections.push("\n--- Current FRD (to be revised) ---");
		sections.push(input.parentVersionContent);
		sections.push("\n--- User Feedback ---");
		sections.push(input.iterationFeedback);
	} else {
		sections.push("Generate a Functional Requirements Document for the following project.");
		sections.push(`\nProject Name: ${input.projectName}`);

		if (input.mode === "fast") {
			sections.push(`\nProject Description (Brain Dump):\n${input.brainDump}`);

			if (input.followUpAnswers && input.followUpAnswers.length > 0) {
				sections.push("\n--- Additional Details (Follow-up Answers) ---");
				for (const answer of input.followUpAnswers) {
					sections.push(`\n[${answer.section}] ${answer.question}`);
					sections.push(`Answer: ${answer.answer}`);
				}
			}
		} else if (input.mode === "standard") {
			sections.push("\n--- Guided Input ---");
			if (input.guidedAnswers && input.guidedAnswers.length > 0) {
				for (const answer of input.guidedAnswers) {
					sections.push(`\n[${answer.section}] ${answer.question}`);
					sections.push(`Answer: ${answer.answer}`);
				}
			}
		}
	}

	return {
		system: SYSTEM_PROMPT,
		prompt: sections.join("\n"),
	};
}
