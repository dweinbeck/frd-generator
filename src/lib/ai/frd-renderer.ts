import "server-only";
import type { FRD } from "./frd-schema";

export function renderFRDToMarkdown(frd: FRD): string {
	const sections: string[] = [];

	sections.push(`# ${frd.projectName}\n`);
	sections.push(`> ${frd.coreValue}\n`);
	sections.push(`## Overview\n\n${frd.overview}\n`);

	// Personas
	sections.push("## Target Users\n");
	for (const persona of frd.personas) {
		sections.push(`### ${persona.name}\n`);
		sections.push(`${persona.description}\n`);
		sections.push("**Goals:**");
		for (const goal of persona.goals) {
			sections.push(`- ${goal}`);
		}
		sections.push("");
	}

	// Requirements grouped by category
	sections.push("## Functional Requirements\n");
	const categories = [...new Set(frd.requirements.map((r) => r.category))];
	for (const category of categories) {
		sections.push(`### ${category}\n`);
		const categoryReqs = frd.requirements.filter((r) => r.category === category);
		for (const req of categoryReqs) {
			sections.push(`#### ${req.id}: ${req.description}\n`);
			sections.push(`**Priority:** ${req.priority}\n`);
			sections.push("**Acceptance Criteria:**");
			for (const ac of req.acceptanceCriteria) {
				sections.push(`- [ ] ${ac}`);
			}
			sections.push("");
		}
	}

	// Constraints
	sections.push("## Constraints\n");
	for (const constraint of frd.constraints) {
		sections.push(`- **${constraint.category}:** ${constraint.description}`);
	}
	sections.push("");

	// Out of Scope
	sections.push("## Out of Scope\n");
	for (const item of frd.outOfScope) {
		sections.push(`- ${item}`);
	}
	sections.push("");

	// Assumptions
	if (frd.assumptions.length > 0) {
		sections.push("## Assumptions\n");
		for (const assumption of frd.assumptions) {
			sections.push(`- ${assumption}`);
		}
		sections.push("");
	}

	// Open Questions
	if (frd.openQuestions.length > 0) {
		sections.push("## Open Questions\n");
		for (let i = 0; i < frd.openQuestions.length; i++) {
			sections.push(`${i + 1}. ${frd.openQuestions[i]}`);
		}
		sections.push("");
	}

	return sections.join("\n");
}
