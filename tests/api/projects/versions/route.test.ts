import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock server-only (imported by auth and db modules)
vi.mock("server-only", () => ({}));

// Mock auth
vi.mock("@/lib/auth/require-auth", () => ({
	requireAuth: vi.fn(),
}));

// Mock db/projects
vi.mock("@/lib/db/projects", () => ({
	getProjectForUser: vi.fn(),
}));

// Mock db/versions
vi.mock("@/lib/db/versions", () => ({
	getAllVersions: vi.fn(),
}));

import { GET } from "@/app/api/projects/[projectId]/versions/route";
import { requireAuth } from "@/lib/auth/require-auth";
import { getProjectForUser } from "@/lib/db/projects";
import { getAllVersions } from "@/lib/db/versions";

const mockRequireAuth = vi.mocked(requireAuth);
const mockGetProjectForUser = vi.mocked(getProjectForUser);
const mockGetAllVersions = vi.mocked(getAllVersions);

function createRequest(url = "http://localhost/api/projects/test-project/versions") {
	return new Request(url);
}

function createParams(projectId = "test-project") {
	return { params: Promise.resolve({ projectId }) };
}

const mockProject = {
	id: "test-project",
	userId: "test-user",
	name: "Test Project",
	latestVersionId: "v1",
	versionCount: 1,
	createdAt: null,
};

beforeEach(() => {
	vi.clearAllMocks();
	mockRequireAuth.mockResolvedValue({ userId: "test-user" });
	mockGetProjectForUser.mockResolvedValue(mockProject);
});

describe("GET /api/projects/[projectId]/versions", () => {
	describe("timestamp serialization", () => {
		it("converts Firestore Timestamp objects to ISO strings", async () => {
			const testDate = new Date("2026-01-15T10:30:00.000Z");
			mockGetAllVersions.mockResolvedValue([
				{
					id: "v1",
					content: "# FRD Content",
					structuredData: {},
					mode: "fast",
					model: "gemini-2.5-flash",
					versionNumber: 1,
					tokensUsed: 500,
					metadata: {
						promptTokens: 200,
						completionTokens: 300,
						generationTimeMs: 1500,
					},
					createdAt: {
						toDate: () => testDate,
						seconds: Math.floor(testDate.getTime() / 1000),
						nanoseconds: 0,
					} as unknown as import("firebase-admin/firestore").Timestamp,
				},
			]);

			const response = await GET(createRequest(), createParams());
			const data = await response.json();

			expect(data.versions).toHaveLength(1);
			expect(data.versions[0].createdAt).toBe("2026-01-15T10:30:00.000Z");
			// Verify it's a valid ISO 8601 string
			expect(new Date(data.versions[0].createdAt).toISOString()).toBe(
				data.versions[0].createdAt,
			);
		});

		it("returns null for null createdAt", async () => {
			mockGetAllVersions.mockResolvedValue([
				{
					id: "v1",
					content: "# FRD Content",
					structuredData: {},
					mode: "fast",
					model: "gemini-2.5-flash",
					versionNumber: 1,
					tokensUsed: 500,
					metadata: {
						promptTokens: 200,
						completionTokens: 300,
						generationTimeMs: 1500,
					},
					createdAt: null,
				},
			]);

			const response = await GET(createRequest(), createParams());
			const data = await response.json();

			expect(data.versions[0].createdAt).toBeNull();
		});
	});

	describe("composedPrompt stripping", () => {
		it("strips composedPrompt from version list response", async () => {
			mockGetAllVersions.mockResolvedValue([
				{
					id: "v1",
					content: "# FRD Content",
					structuredData: {},
					mode: "fast",
					model: "gemini-2.5-flash",
					versionNumber: 1,
					tokensUsed: 500,
					composedPrompt: "This is a secret composed prompt that should not be exposed",
					metadata: {
						promptTokens: 200,
						completionTokens: 300,
						generationTimeMs: 1500,
					},
					createdAt: null,
				},
			]);

			const response = await GET(createRequest(), createParams());
			const data = await response.json();

			expect(data.versions).toHaveLength(1);
			expect(data.versions[0]).not.toHaveProperty("composedPrompt");
			// Other fields should still be present
			expect(data.versions[0].id).toBe("v1");
			expect(data.versions[0].content).toBe("# FRD Content");
		});
	});

	describe("project not found", () => {
		it("returns 404 for non-existent project", async () => {
			mockGetProjectForUser.mockResolvedValue(null);

			const response = await GET(createRequest(), createParams());

			expect(response.status).toBe(404);
			const data = await response.json();
			expect(data.error).toBe("Project not found");
		});
	});

	describe("response structure", () => {
		it("returns versions array with expected fields", async () => {
			const testDate = new Date("2026-02-01T12:00:00.000Z");
			mockGetAllVersions.mockResolvedValue([
				{
					id: "v2",
					content: "# Version 2 Content",
					structuredData: { sections: [] },
					mode: "fast",
					model: "gemini-2.5-flash",
					versionNumber: 2,
					tokensUsed: 800,
					parentVersionId: "v1",
					composedPrompt: "secret prompt",
					rating: 4.5,
					metadata: {
						promptTokens: 300,
						completionTokens: 500,
						generationTimeMs: 2000,
					},
					createdAt: {
						toDate: () => testDate,
						seconds: Math.floor(testDate.getTime() / 1000),
						nanoseconds: 0,
					} as unknown as import("firebase-admin/firestore").Timestamp,
				},
			]);

			const response = await GET(createRequest(), createParams());
			const data = await response.json();

			expect(response.status).toBe(200);
			const version = data.versions[0];
			expect(version.id).toBe("v2");
			expect(version.content).toBe("# Version 2 Content");
			expect(version.versionNumber).toBe(2);
			expect(version.rating).toBe(4.5);
			expect(version.parentVersionId).toBe("v1");
			expect(version.createdAt).toBe("2026-02-01T12:00:00.000Z");
			expect(version).not.toHaveProperty("composedPrompt");
		});
	});
});
