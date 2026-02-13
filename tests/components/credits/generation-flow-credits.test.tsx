import { cleanup, render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock useAuthedFetch hook
const mockFetch = vi.fn();
vi.mock("@/hooks/use-authed-fetch", () => ({
	useAuthedFetch: () => mockFetch,
}));

import { GenerationFlow } from "@/components/generation/generation-flow";

afterEach(() => {
	cleanup();
});

beforeEach(() => {
	vi.clearAllMocks();
});

function renderFlow(mode: "fast" | "standard" = "fast") {
	return render(
		<GenerationFlow
			projectId="proj-1"
			projectName="Test Project"
			mode={mode}
		/>,
	);
}

function mockCreditBalance(balance: number) {
	mockFetch.mockImplementation(async (url: string) => {
		if (url === "/api/credits") {
			return new Response(JSON.stringify({ balance }), {
				status: 200,
				headers: { "Content-Type": "application/json" },
			});
		}
		return new Response(JSON.stringify({}), { status: 200 });
	});
}

describe("GenerationFlow — Credit display and gating", () => {
	it("displays credit balance and cost notice when balance is loaded", async () => {
		mockCreditBalance(200);
		renderFlow();

		await waitFor(() => {
			expect(screen.getByText(/50 credits/)).toBeDefined();
			expect(screen.getByText(/200 credits/)).toBeDefined();
		});
	});

	it("shows amber warning when balance is less than 50 (insufficient)", async () => {
		mockCreditBalance(30);
		renderFlow();

		await waitFor(() => {
			const notice = screen.getByText(/50 credits/).closest("div");
			expect(notice).not.toBeNull();
			// Amber styling indicates insufficient credits
			expect(notice?.className).toContain("bg-amber-50");
			expect(notice?.className).toContain("text-amber-700");
		});

		// Should show purchase message
		await waitFor(() => {
			expect(screen.getByText(/Purchase more credits to generate/)).toBeDefined();
		});
	});

	it("shows blue info when balance is 50 or more (sufficient)", async () => {
		mockCreditBalance(100);
		renderFlow();

		await waitFor(() => {
			const notice = screen.getByText(/50 credits/).closest("div");
			expect(notice).not.toBeNull();
			expect(notice?.className).toContain("bg-blue-50");
			expect(notice?.className).toContain("text-blue-700");
		});
	});

	it("does not submit when balance is insufficient (no /api/generate or /api/analyze-gaps call)", async () => {
		mockCreditBalance(10);
		renderFlow("fast");

		// Wait for balance to load
		await waitFor(() => {
			expect(screen.getByText(/10 credits/)).toBeDefined();
		});

		// Type in the brain dump input
		const textarea = screen.getByRole("textbox");
		fireEvent.change(textarea, { target: { value: "A".repeat(60) } });

		// Try to submit
		const submitButton = screen.getByRole("button", { name: /Generate FRD/i });
		await act(async () => {
			fireEvent.click(submitButton);
		});

		// Verify no /api/generate or /api/analyze-gaps call was made
		// (only /api/credits should have been called for balance fetch)
		const apiCalls = mockFetch.mock.calls.filter(
			(call) => call[0] === "/api/generate" || call[0] === "/api/analyze-gaps",
		);
		expect(apiCalls).toHaveLength(0);
	});

	it("handles 402 response by showing insufficient credits error with balance info", async () => {
		// Set up: initial balance passes client check (60 >= 50), but server returns 402
		// This tests the race condition fallback where balance changed between check and request
		mockFetch.mockImplementation(async (url: string, options?: RequestInit) => {
			if (url === "/api/credits") {
				return new Response(JSON.stringify({ balance: 60 }), {
					status: 200,
					headers: { "Content-Type": "application/json" },
				});
			}
			if (url === "/api/analyze-gaps" && options?.method === "POST") {
				return new Response(JSON.stringify({ gaps: [] }), {
					status: 200,
					headers: { "Content-Type": "application/json" },
				});
			}
			if (url === "/api/generate" && options?.method === "POST") {
				return new Response(
					JSON.stringify({ error: "Insufficient credits", balance: 20, required: 50 }),
					{ status: 402, headers: { "Content-Type": "application/json" } },
				);
			}
			return new Response(JSON.stringify({}), { status: 200 });
		});

		renderFlow("fast");

		// Wait for balance to load
		await waitFor(() => {
			expect(screen.getByText(/60 credits/)).toBeDefined();
		});

		// Type in brain dump and submit
		const textarea = screen.getByRole("textbox");
		fireEvent.change(textarea, { target: { value: "A".repeat(60) } });

		const submitButton = screen.getByRole("button", { name: /Generate FRD/i });
		await act(async () => {
			fireEvent.click(submitButton);
		});

		// Should show 402 error with balance info from server
		await waitFor(() => {
			expect(
				screen.getByText(/Insufficient credits. You have 20 credits but need 50/),
			).toBeDefined();
		});
	});
});
