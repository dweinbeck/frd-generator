import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GapFollowUps } from "@/components/generation/gap-follow-ups";

afterEach(() => {
	cleanup();
});

const mockGaps = [
	{
		section: "Personas",
		description: "No target users described",
		followUpPrompt: "Who are the primary users of this system?",
		importance: "high" as const,
	},
	{
		section: "Requirements",
		description: "Missing authentication details",
		followUpPrompt: "What authentication method should be used?",
		importance: "medium" as const,
	},
	{
		section: "Constraints",
		description: "No performance requirements mentioned",
		followUpPrompt: "Are there any performance or scalability requirements?",
		importance: "low" as const,
	},
];

function renderGapFollowUps(overrides: {
	onSubmit?: () => void;
	onSkipAll?: () => void;
	isSubmitting?: boolean;
} = {}) {
	const onSubmit = overrides.onSubmit ?? vi.fn();
	const onSkipAll = overrides.onSkipAll ?? vi.fn();
	render(
		<GapFollowUps
			gaps={mockGaps}
			onSubmit={onSubmit}
			onSkipAll={onSkipAll}
			isSubmitting={overrides.isSubmitting ?? false}
		/>,
	);
	return { onSubmit, onSkipAll };
}

describe("GapFollowUps", () => {
	it("renders all gaps with section names and descriptions", () => {
		renderGapFollowUps();
		expect(screen.getByText("Personas")).toBeDefined();
		expect(screen.getByText("Requirements")).toBeDefined();
		expect(screen.getByText("Constraints")).toBeDefined();
		expect(screen.getByText("No target users described")).toBeDefined();
		expect(screen.getByText("Missing authentication details")).toBeDefined();
		expect(screen.getByText("No performance requirements mentioned")).toBeDefined();
	});

	it("renders follow-up prompts as textarea labels", () => {
		renderGapFollowUps();
		expect(screen.getByText("Who are the primary users of this system?")).toBeDefined();
		expect(screen.getByText("What authentication method should be used?")).toBeDefined();
		expect(screen.getByText("Are there any performance or scalability requirements?")).toBeDefined();
	});

	it("renders importance badges with correct styling", () => {
		renderGapFollowUps();
		expect(screen.getByText("high")).toBeDefined();
		expect(screen.getByText("medium")).toBeDefined();
		expect(screen.getByText("low")).toBeDefined();
	});

	it("calls onSkipAll when Skip & Generate Now is clicked", () => {
		const onSkipAll = vi.fn();
		renderGapFollowUps({ onSkipAll });
		fireEvent.click(screen.getByText("Skip & Generate Now"));
		expect(onSkipAll).toHaveBeenCalledOnce();
	});

	it("collects only non-empty answers on submit", () => {
		const onSubmit = vi.fn();
		renderGapFollowUps({ onSubmit });
		// Type answer in first gap's textarea only
		const textareas = screen.getAllByRole("textbox");
		fireEvent.change(textareas[0], { target: { value: "Product managers" } });
		// Submit by clicking the submit button
		fireEvent.click(screen.getByText(/Generate FRD/));
		expect(onSubmit).toHaveBeenCalledOnce();
		const submittedAnswers = onSubmit.mock.calls[0][0];
		expect(submittedAnswers).toHaveLength(1);
		expect(submittedAnswers[0]).toEqual({
			section: "Personas",
			question: "Who are the primary users of this system?",
			answer: "Product managers",
		});
	});

	it("submits all answered gaps", () => {
		const onSubmit = vi.fn();
		renderGapFollowUps({ onSubmit });
		const textareas = screen.getAllByRole("textbox");
		fireEvent.change(textareas[0], { target: { value: "Product managers" } });
		fireEvent.change(textareas[1], { target: { value: "OAuth 2.0" } });
		// Leave third empty, click submit button
		fireEvent.click(screen.getByText(/Generate FRD/));
		expect(onSubmit).toHaveBeenCalledOnce();
		const submittedAnswers = onSubmit.mock.calls[0][0];
		expect(submittedAnswers).toHaveLength(2);
	});

	it("submits empty array when no answers provided", () => {
		const onSubmit = vi.fn();
		renderGapFollowUps({ onSubmit });
		// Click submit button without typing anything
		fireEvent.click(screen.getByText("Generate FRD"));
		expect(onSubmit).toHaveBeenCalledOnce();
		expect(onSubmit.mock.calls[0][0]).toEqual([]);
	});

	it("shows answered badge when gap has non-empty answer", () => {
		renderGapFollowUps();
		// Initially no "answered" badge
		expect(screen.queryByText("answered")).toBeNull();
		// Type an answer in first gap
		const textareas = screen.getAllByRole("textbox");
		fireEvent.change(textareas[0], { target: { value: "Product managers" } });
		// Now "answered" badge should appear
		expect(screen.getByText("answered")).toBeDefined();
	});

	it("disables buttons when isSubmitting is true", () => {
		renderGapFollowUps({ isSubmitting: true });
		const skipButton = screen.getByText("Skip & Generate Now");
		const submitButton = screen.getByText("Generating...");
		expect(skipButton.closest("button")?.disabled).toBe(true);
		expect(submitButton.closest("button")?.disabled).toBe(true);
	});
});
