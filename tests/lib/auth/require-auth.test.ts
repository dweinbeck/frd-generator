import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock server-only (imported by auth modules)
vi.mock("server-only", () => ({}));

// Mock verify-token (requireAuth delegates to verifyAuth)
vi.mock("@/lib/auth/verify-token", () => ({
	verifyAuth: vi.fn(),
}));

import { requireAuth } from "@/lib/auth/require-auth";
import { verifyAuth } from "@/lib/auth/verify-token";

const mockVerifyAuth = vi.mocked(verifyAuth);

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

describe("requireAuth", () => {
	it("returns 401 when no Authorization header is present", async () => {
		mockVerifyAuth.mockResolvedValue(null);

		const result = await requireAuth(createRequest());

		// Should be a NextResponse (Response instance) with 401
		expect(result).toBeInstanceOf(Response);
		const response = result as Response;
		expect(response.status).toBe(401);
		const body = await response.json();
		expect(body).toEqual({ error: "Unauthorized" });
	});

	it("returns 401 when token is invalid", async () => {
		mockVerifyAuth.mockResolvedValue(null);

		const result = await requireAuth(createRequest("Bearer invalid-token"));

		expect(result).toBeInstanceOf(Response);
		const response = result as Response;
		expect(response.status).toBe(401);
		const body = await response.json();
		expect(body).toEqual({ error: "Unauthorized" });
	});

	it("returns userId for valid tokens", async () => {
		mockVerifyAuth.mockResolvedValue({ userId: "user-123" });

		const result = await requireAuth(createRequest("Bearer valid-token"));

		// Should NOT be a Response -- should be the auth result object
		expect(result).not.toBeInstanceOf(Response);
		expect(result).toEqual({ userId: "user-123" });
	});

	it("passes the request through to verifyAuth", async () => {
		mockVerifyAuth.mockResolvedValue({ userId: "user-456" });
		const req = createRequest("Bearer some-token");

		await requireAuth(req);

		expect(mockVerifyAuth).toHaveBeenCalledWith(req);
	});
});
