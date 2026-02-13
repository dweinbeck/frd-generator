import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock server-only (imported by auth, db, and other server modules)
vi.mock("server-only", () => ({}));

// Mock auth
vi.mock("@/lib/auth/require-auth", () => ({
	requireAuth: vi.fn(),
}));

// Mock credits
vi.mock("@/lib/db/credits", () => ({
	chargeCredits: vi.fn(),
	addCredits: vi.fn(),
}));

// Mock consent
vi.mock("@/lib/db/consent", () => ({
	hasUserConsented: vi.fn(),
}));

// Mock projects
vi.mock("@/lib/db/projects", () => ({
	getProjectForUser: vi.fn(),
	updateProject: vi.fn(),
}));

// Mock versions
vi.mock("@/lib/db/versions", () => ({
	saveVersion: vi.fn(),
	getVersion: vi.fn(),
}));

// Mock AI modules
vi.mock("@/lib/ai/generation-engine", () => ({
	generateFRD: vi.fn(),
}));

vi.mock("@/lib/ai/prompt-composer", () => ({
	composeGenerationPrompt: vi.fn(),
}));

vi.mock("@/lib/ai/frd-renderer", () => ({
	renderFRDToMarkdown: vi.fn(),
}));

// Mock analytics
vi.mock("@/lib/analytics", () => ({
	trackEvent: vi.fn(),
}));

// Mock logger
vi.mock("@/lib/logger", () => ({
	createLogger: () => ({
		correlationId: "test-corr-id",
		info: vi.fn(),
		warn: vi.fn(),
		error: vi.fn(),
	}),
}));

// Mock rate limit
vi.mock("@/lib/rate-limit", () => ({
	checkRateLimit: vi.fn().mockReturnValue({ allowed: true }),
}));

// Mock stripe config (CREDIT_COSTS)
vi.mock("@/lib/stripe/config", () => ({
	CREDIT_COSTS: {
		initial: 50,
		iteration: 25,
	},
}));

import { POST } from "@/app/api/generate/route";
import { requireAuth } from "@/lib/auth/require-auth";
import { hasUserConsented } from "@/lib/db/consent";
import { addCredits, chargeCredits } from "@/lib/db/credits";
import { getProjectForUser } from "@/lib/db/projects";
import { saveVersion } from "@/lib/db/versions";
import { generateFRD } from "@/lib/ai/generation-engine";
import { composeGenerationPrompt } from "@/lib/ai/prompt-composer";
import { renderFRDToMarkdown } from "@/lib/ai/frd-renderer";
import { trackEvent } from "@/lib/analytics";
import { CREDIT_COSTS } from "@/lib/stripe/config";

const mockRequireAuth = vi.mocked(requireAuth);
const mockChargeCredits = vi.mocked(chargeCredits);
const mockAddCredits = vi.mocked(addCredits);
const mockHasUserConsented = vi.mocked(hasUserConsented);
const mockGetProjectForUser = vi.mocked(getProjectForUser);
const mockSaveVersion = vi.mocked(saveVersion);
const mockGenerateFRD = vi.mocked(generateFRD);
const mockComposePrompt = vi.mocked(composeGenerationPrompt);
const mockRenderFRD = vi.mocked(renderFRDToMarkdown);
const mockTrackEvent = vi.mocked(trackEvent);

function createRequest(body: Record<string, unknown>) {
	return new Request("http://localhost/api/generate", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(body),
	});
}

const validBody = {
	projectId: "proj-1",
	projectName: "Test Project",
	brainDump: "A".repeat(60),
	mode: "fast" as const,
};

const iterationBody = {
	...validBody,
	parentVersionId: "version-1",
	iterationFeedback: "Please add more details to the architecture section",
};

beforeEach(() => {
	vi.clearAllMocks();

	// Default mocks for happy path
	mockRequireAuth.mockResolvedValue({ userId: "test-user" });
	mockHasUserConsented.mockResolvedValue(true);
	mockChargeCredits.mockResolvedValue({ success: true, balance: 50 });
	mockGetProjectForUser.mockResolvedValue({
		id: "proj-1",
		userId: "test-user",
		name: "Test Project",
		latestVersionId: null,
		versionCount: 0,
		createdAt: null,
	});
	mockComposePrompt.mockReturnValue({ prompt: "composed-prompt" } as ReturnType<typeof composeGenerationPrompt>);
	mockGenerateFRD.mockResolvedValue({
		frd: { sections: [] } as unknown as Awaited<ReturnType<typeof generateFRD>>["frd"],
		usage: { totalTokens: 1000, promptTokens: 400, completionTokens: 600 },
		generationTimeMs: 2000,
	});
	mockRenderFRD.mockReturnValue("# Generated FRD");
	mockSaveVersion.mockResolvedValue({
		id: "version-1",
		content: "# Generated FRD",
		structuredData: {},
		mode: "fast",
		model: "gemini-2.5-flash",
		versionNumber: 1,
		tokensUsed: 1000,
		metadata: { promptTokens: 400, completionTokens: 600, generationTimeMs: 2000 },
		createdAt: null,
	});
});

describe("POST /api/generate — Credit flow", () => {
	it("returns 402 when chargeCredits returns { success: false } with balance and required in body (CRED-04)", async () => {
		mockChargeCredits.mockResolvedValue({ success: false, balance: 20 });

		const response = await POST(createRequest(validBody));
		const data = await response.json();

		expect(response.status).toBe(402);
		expect(data.error).toBe("Insufficient credits");
		expect(data.balance).toBe(20);
		expect(data.required).toBe(50);
	});

	it("returns 403 when hasUserConsented returns false (DATA-03)", async () => {
		mockHasUserConsented.mockResolvedValue(false);

		const response = await POST(createRequest(validBody));
		const data = await response.json();

		expect(response.status).toBe(403);
		expect(data.error).toBe("You must accept the terms of use before generating FRDs.");
	});

	it("charges 50 credits for initial generation (CRED-01)", async () => {
		await POST(createRequest(validBody));

		expect(mockChargeCredits).toHaveBeenCalledWith(
			"test-user",
			50,
			expect.objectContaining({
				projectId: "proj-1",
				model: "gemini-2.5-flash",
				reason: "initial_generation",
			}),
		);
	});

	it("charges 25 credits for iteration with reason 'iteration' (CRED-02)", async () => {
		await POST(createRequest(iterationBody));

		expect(mockChargeCredits).toHaveBeenCalledWith(
			"test-user",
			25,
			expect.objectContaining({
				projectId: "proj-1",
				model: "gemini-2.5-flash",
				reason: "iteration",
			}),
		);
	});

	it("calls addCredits for refund when generation throws", async () => {
		mockGenerateFRD.mockRejectedValue(new Error("AI generation failed"));

		const response = await POST(createRequest(validBody));

		expect(response.status).toBe(500);
		expect(mockAddCredits).toHaveBeenCalledWith(
			"test-user",
			50,
			{ reason: "generation_failed_refund" },
			"refund",
		);
	});

	it("tracks credits_charged event after successful generation (CRED-06 / OBS-02)", async () => {
		await POST(createRequest(validBody));

		const creditChargedCall = mockTrackEvent.mock.calls.find(
			(call) => (call[1] as { event: string }).event === "credits_charged",
		);
		expect(creditChargedCall).toBeDefined();
		expect(creditChargedCall?.[1]).toMatchObject({
			event: "credits_charged",
			amount: 50,
			projectId: "proj-1",
		});
	});

	it("tracks frd_generation_failed event when generation throws", async () => {
		mockGenerateFRD.mockRejectedValue(new Error("AI generation failed"));

		await POST(createRequest(validBody));

		const failedCall = mockTrackEvent.mock.calls.find(
			(call) => (call[1] as { event: string }).event === "frd_generation_failed",
		);
		expect(failedCall).toBeDefined();
		expect(failedCall?.[1]).toMatchObject({
			event: "frd_generation_failed",
			errorType: "Error",
		});
	});

	it("credit cost values match spec: initial=50, iteration=25", () => {
		expect(CREDIT_COSTS.initial).toBe(50);
		expect(CREDIT_COSTS.iteration).toBe(25);
	});
});
