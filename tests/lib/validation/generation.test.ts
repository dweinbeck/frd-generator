import { describe, expect, it } from "vitest";
import {
	GenerationRequestSchema,
	GapDetectionRequestSchema,
	RatingSchema,
} from "@/lib/validation/generation";

const validFastRequest = {
	projectId: "test-project-id",
	projectName: "Test Project",
	brainDump: "A".repeat(50),
	mode: "fast" as const,
};

const validStandardRequest = {
	projectId: "test-project-id",
	projectName: "Test Project",
	brainDump: "",
	mode: "standard" as const,
};

describe("GenerationRequestSchema", () => {
	it("accepts fast mode with brainDump >= 50 chars", () => {
		const result = GenerationRequestSchema.safeParse(validFastRequest);
		expect(result.success).toBe(true);
	});

	it("rejects fast mode with brainDump < 50 chars", () => {
		const result = GenerationRequestSchema.safeParse({
			...validFastRequest,
			brainDump: "short text",
		});
		expect(result.success).toBe(false);
		if (!result.success) {
			const brainDumpIssue = result.error.issues.find(
				(issue) =>
					Array.isArray(issue.path) && issue.path.includes("brainDump"),
			);
			expect(brainDumpIssue).toBeDefined();
		}
	});

	it("accepts standard mode with empty brainDump", () => {
		const result = GenerationRequestSchema.safeParse(validStandardRequest);
		expect(result.success).toBe(true);
	});

	it("accepts standard mode with missing brainDump", () => {
		const result = GenerationRequestSchema.safeParse({
			...validStandardRequest,
			brainDump: "",
		});
		expect(result.success).toBe(true);
	});

	it("rejects brainDump over 15000 chars", () => {
		const result = GenerationRequestSchema.safeParse({
			...validFastRequest,
			brainDump: "A".repeat(15001),
		});
		expect(result.success).toBe(false);
	});

	it("accepts modelId gemini-2.5-flash", () => {
		const result = GenerationRequestSchema.safeParse({
			...validFastRequest,
			modelId: "gemini-2.5-flash",
		});
		expect(result.success).toBe(true);
	});

	it("accepts modelId gemini-3-pro-preview", () => {
		const result = GenerationRequestSchema.safeParse({
			...validFastRequest,
			modelId: "gemini-3-pro-preview",
		});
		expect(result.success).toBe(true);
	});

	it("rejects modelId gemini-3-pro (without -preview)", () => {
		const result = GenerationRequestSchema.safeParse({
			...validFastRequest,
			modelId: "gemini-3-pro",
		});
		expect(result.success).toBe(false);
	});

	it("defaults modelId to undefined when not provided", () => {
		const result = GenerationRequestSchema.safeParse(validFastRequest);
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.modelId).toBeUndefined();
		}
	});
});

describe("GenerationRequestSchema - iteration mode", () => {
	const validIterationRequest = {
		projectId: "abc",
		projectName: "Test",
		brainDump: "A".repeat(50),
		mode: "fast" as const,
		parentVersionId: "v1",
		iterationFeedback: "add more detail to the personas section",
		modelId: "gemini-2.5-flash" as const,
	};

	it("accepts valid iteration request with parentVersionId and iterationFeedback", () => {
		const result = GenerationRequestSchema.safeParse(validIterationRequest);
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.parentVersionId).toBe("v1");
			expect(result.data.iterationFeedback).toBe(
				"add more detail to the personas section",
			);
		}
	});

	it("accepts iteration request with empty iterationFeedback (no refine constraint)", () => {
		const result = GenerationRequestSchema.safeParse({
			...validIterationRequest,
			iterationFeedback: "",
		});
		expect(result.success).toBe(true);
	});

	it("accepts parentVersionId without iterationFeedback (no refine constraint)", () => {
		const result = GenerationRequestSchema.safeParse({
			...validIterationRequest,
			iterationFeedback: undefined,
		});
		expect(result.success).toBe(true);
	});

	it("rejects iterationFeedback over 10000 chars", () => {
		const result = GenerationRequestSchema.safeParse({
			...validIterationRequest,
			iterationFeedback: "A".repeat(10001),
		});
		expect(result.success).toBe(false);
	});

	it("accepts iterationFeedback without parentVersionId (schema allows it)", () => {
		const result = GenerationRequestSchema.safeParse({
			...validIterationRequest,
			parentVersionId: undefined,
		});
		expect(result.success).toBe(true);
	});
});

describe("RatingSchema", () => {
	it("accepts minimum rating of 0.5", () => {
		const result = RatingSchema.safeParse({ rating: 0.5 });
		expect(result.success).toBe(true);
	});

	it("accepts maximum rating of 5.0", () => {
		const result = RatingSchema.safeParse({ rating: 5.0 });
		expect(result.success).toBe(true);
	});

	it("accepts mid-range rating of 2.5", () => {
		const result = RatingSchema.safeParse({ rating: 2.5 });
		expect(result.success).toBe(true);
	});

	it("accepts whole number rating of 1.0", () => {
		const result = RatingSchema.safeParse({ rating: 1.0 });
		expect(result.success).toBe(true);
	});

	it("accepts half-step rating of 3.5", () => {
		const result = RatingSchema.safeParse({ rating: 3.5 });
		expect(result.success).toBe(true);
	});

	it("rejects 0 (below minimum)", () => {
		const result = RatingSchema.safeParse({ rating: 0 });
		expect(result.success).toBe(false);
	});

	it("rejects 5.5 (above maximum)", () => {
		const result = RatingSchema.safeParse({ rating: 5.5 });
		expect(result.success).toBe(false);
	});

	it("rejects -1 (negative)", () => {
		const result = RatingSchema.safeParse({ rating: -1 });
		expect(result.success).toBe(false);
	});

	it("rejects 0.3 (not a step of 0.5)", () => {
		const result = RatingSchema.safeParse({ rating: 0.3 });
		expect(result.success).toBe(false);
	});

	it("rejects 0.7 (not a step of 0.5)", () => {
		const result = RatingSchema.safeParse({ rating: 0.7 });
		expect(result.success).toBe(false);
	});

	it("rejects string value", () => {
		const result = RatingSchema.safeParse({ rating: "abc" });
		expect(result.success).toBe(false);
	});

	it("rejects null", () => {
		const result = RatingSchema.safeParse({ rating: null });
		expect(result.success).toBe(false);
	});

	it("rejects undefined (rating is required)", () => {
		const result = RatingSchema.safeParse({ rating: undefined });
		expect(result.success).toBe(false);
	});
});

describe("GapDetectionRequestSchema", () => {
	const validGapRequest = {
		projectName: "Test Project",
		brainDump: "A".repeat(50),
	};

	it("accepts valid gap detection request", () => {
		const result = GapDetectionRequestSchema.safeParse(validGapRequest);
		expect(result.success).toBe(true);
	});

	it("accepts modelId gemini-3-pro-preview", () => {
		const result = GapDetectionRequestSchema.safeParse({
			...validGapRequest,
			modelId: "gemini-3-pro-preview",
		});
		expect(result.success).toBe(true);
	});

	it("rejects modelId gemini-3-pro (without -preview)", () => {
		const result = GapDetectionRequestSchema.safeParse({
			...validGapRequest,
			modelId: "gemini-3-pro",
		});
		expect(result.success).toBe(false);
	});

	it("rejects brainDump under 50 chars", () => {
		const result = GapDetectionRequestSchema.safeParse({
			...validGapRequest,
			brainDump: "short text",
		});
		expect(result.success).toBe(false);
		if (!result.success) {
			const brainDumpIssue = result.error.issues.find(
				(issue) =>
					Array.isArray(issue.path) && issue.path.includes("brainDump"),
			);
			expect(brainDumpIssue).toBeDefined();
		}
	});

	it("requires projectName", () => {
		const result = GapDetectionRequestSchema.safeParse({
			...validGapRequest,
			projectName: "",
		});
		expect(result.success).toBe(false);
	});
});
