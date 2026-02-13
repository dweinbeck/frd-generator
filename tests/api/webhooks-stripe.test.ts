import { beforeEach, describe, expect, it, vi } from "vitest";

// Use vi.hoisted to create mocks that can be referenced in factory functions
const { mockConstructEvent, mockAddCredits, mockGetFn, mockCollectionFn } = vi.hoisted(() => ({
	mockConstructEvent: vi.fn(),
	mockAddCredits: vi.fn(),
	mockGetFn: vi.fn(),
	mockCollectionFn: vi.fn(),
}));

// Mock server-only
vi.mock("server-only", () => ({}));

// Mock Stripe config
vi.mock("@/lib/stripe/config", () => ({
	getStripe: () => ({
		webhooks: {
			constructEvent: mockConstructEvent,
		},
	}),
}));

// Mock credits
vi.mock("@/lib/db/credits", () => ({
	addCredits: mockAddCredits,
}));

// Mock getDb for idempotency query
vi.mock("@/lib/db/admin", () => ({
	getDb: () => ({
		collection: mockCollectionFn,
	}),
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

import { POST } from "@/app/api/webhooks/stripe/route";

function createRequest(body: string, signature?: string) {
	const headers = new Headers();
	headers.set("Content-Type", "application/json");
	if (signature) {
		headers.set("stripe-signature", signature);
	}
	return new Request("http://localhost/api/webhooks/stripe", {
		method: "POST",
		headers,
		body,
	});
}

const validSession = {
	id: "cs_test_session_123",
	metadata: {
		userId: "user-1",
		credits: "500",
		packageLabel: "500 credits",
	},
};

function setupIdempotencyCheck(isDuplicate: boolean) {
	mockCollectionFn.mockReturnValue({
		where: vi.fn().mockReturnValue({
			limit: vi.fn().mockReturnValue({
				get: vi.fn().mockResolvedValue({ empty: !isDuplicate }),
			}),
		}),
	});
}

beforeEach(() => {
	vi.clearAllMocks();
	process.env.STRIPE_WEBHOOK_SECRET = "whsec_test";
	mockAddCredits.mockResolvedValue(500);
	// Default: no duplicate
	setupIdempotencyCheck(false);
});

describe("POST /api/webhooks/stripe", () => {
	it("returns 400 when stripe-signature header is missing", async () => {
		const response = await POST(createRequest("{}"));
		const data = await response.json();

		expect(response.status).toBe(400);
		expect(data.error).toBe("Missing signature");
	});

	it("returns 400 when constructEvent throws (invalid signature)", async () => {
		mockConstructEvent.mockImplementation(() => {
			throw new Error("Invalid signature");
		});

		const response = await POST(createRequest("{}", "sig_invalid"));
		const data = await response.json();

		expect(response.status).toBe(400);
		expect(data.error).toBe("Webhook processing failed");
	});

	it("adds credits on valid checkout.session.completed event", async () => {
		mockConstructEvent.mockReturnValue({
			type: "checkout.session.completed",
			data: { object: validSession },
		});

		const response = await POST(createRequest("{}", "sig_valid"));
		const data = await response.json();

		expect(response.status).toBe(200);
		expect(data.received).toBe(true);
		expect(mockAddCredits).toHaveBeenCalledWith("user-1", 500, {
			stripeSessionId: "cs_test_session_123",
			reason: "purchase",
		});
	});

	it("skips credit addition when session ID already exists in credit_transactions (idempotency)", async () => {
		mockConstructEvent.mockReturnValue({
			type: "checkout.session.completed",
			data: { object: validSession },
		});
		setupIdempotencyCheck(true);

		const response = await POST(createRequest("{}", "sig_valid"));
		const data = await response.json();

		expect(response.status).toBe(200);
		expect(data.received).toBe(true);
		expect(mockAddCredits).not.toHaveBeenCalled();
	});

	it("returns { received: true } on success", async () => {
		mockConstructEvent.mockReturnValue({
			type: "checkout.session.completed",
			data: { object: validSession },
		});

		const response = await POST(createRequest("{}", "sig_valid"));
		const data = await response.json();

		expect(data).toEqual({ received: true });
	});

	it("returns { received: true } even on duplicate (not an error)", async () => {
		mockConstructEvent.mockReturnValue({
			type: "checkout.session.completed",
			data: { object: validSession },
		});
		setupIdempotencyCheck(true);

		const response = await POST(createRequest("{}", "sig_valid"));

		expect(response.status).toBe(200);
		const data = await response.json();
		expect(data).toEqual({ received: true });
	});
});
