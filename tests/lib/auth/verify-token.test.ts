import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock server-only
vi.mock("server-only", () => ({}));

// Mock firebase-admin/auth
const mockVerifyIdToken = vi.fn();
vi.mock("firebase-admin/auth", () => ({
	getAuth: () => ({
		verifyIdToken: mockVerifyIdToken,
	}),
}));

// Mock db/admin (getDb is called to ensure admin app is initialized)
vi.mock("@/lib/db/admin", () => ({
	getDb: vi.fn(),
}));

import { verifyAuth } from "@/lib/auth/verify-token";

function createRequest(authHeader?: string) {
	const headers = new Headers();
	if (authHeader) {
		headers.set("Authorization", authHeader);
	}
	return new Request("http://localhost/api/test", { headers });
}

beforeEach(() => {
	vi.clearAllMocks();
});

describe("verifyAuth", () => {
	it("returns null when no Authorization header is present", async () => {
		const result = await verifyAuth(createRequest());

		expect(result).toBeNull();
		expect(mockVerifyIdToken).not.toHaveBeenCalled();
	});

	it("returns null when Authorization header has empty Bearer token", async () => {
		const result = await verifyAuth(createRequest("Bearer "));

		expect(result).toBeNull();
		expect(mockVerifyIdToken).not.toHaveBeenCalled();
	});

	it("returns null when Authorization header uses wrong scheme", async () => {
		const result = await verifyAuth(createRequest("Basic dXNlcjpwYXNz"));

		expect(result).toBeNull();
		expect(mockVerifyIdToken).not.toHaveBeenCalled();
	});

	it("returns userId for valid Bearer token", async () => {
		mockVerifyIdToken.mockResolvedValue({ uid: "firebase-uid-123" });

		const result = await verifyAuth(createRequest("Bearer valid-token-abc"));

		expect(result).toEqual({ userId: "firebase-uid-123" });
		expect(mockVerifyIdToken).toHaveBeenCalledWith("valid-token-abc");
	});

	it("returns null when verifyIdToken throws (invalid token)", async () => {
		mockVerifyIdToken.mockRejectedValue(new Error("Firebase ID token has been revoked"));

		const result = await verifyAuth(createRequest("Bearer revoked-token"));

		expect(result).toBeNull();
	});

	it("extracts token correctly from Bearer prefix", async () => {
		mockVerifyIdToken.mockResolvedValue({ uid: "uid-456" });

		await verifyAuth(createRequest("Bearer eyJhbGciOiJSUzI1NiJ9.test"));

		expect(mockVerifyIdToken).toHaveBeenCalledWith("eyJhbGciOiJSUzI1NiJ9.test");
	});
});
