import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ModelSelector } from "@/components/generation/model-selector";

afterEach(() => {
	cleanup();
});

describe("ModelSelector", () => {
	it("renders both model options", () => {
		render(<ModelSelector value="gemini-2.5-flash" onChange={vi.fn()} />);
		expect(screen.getByText("Gemini 2.5 Flash")).toBeDefined();
		expect(screen.getByText("Gemini 3 Pro")).toBeDefined();
	});

	it("highlights selected model", () => {
		render(<ModelSelector value="gemini-2.5-flash" onChange={vi.fn()} />);
		const buttons = screen.getAllByRole("button");
		// First button (Flash) should have selected styling
		expect(buttons[0].className).toContain("border-primary");
		// Second button (Pro) should NOT have selected styling
		expect(buttons[1].className).not.toContain("border-primary");
	});

	it("calls onChange with correct model ID on click", () => {
		const onChange = vi.fn();
		render(<ModelSelector value="gemini-2.5-flash" onChange={onChange} />);
		// Click the Pro model button
		fireEvent.click(screen.getByText("Gemini 3 Pro"));
		expect(onChange).toHaveBeenCalledWith("gemini-3-pro-preview");
	});

	it("uses gemini-3-pro-preview as the Pro model ID", () => {
		const onChange = vi.fn();
		render(<ModelSelector value="gemini-2.5-flash" onChange={onChange} />);
		// Click Pro button
		fireEvent.click(screen.getByText("Gemini 3 Pro"));
		// Must be gemini-3-pro-preview, not gemini-3-pro
		expect(onChange).toHaveBeenCalledWith("gemini-3-pro-preview");
		expect(onChange).not.toHaveBeenCalledWith("gemini-3-pro");
	});
});
