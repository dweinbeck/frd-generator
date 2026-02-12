import { describe, expect, it } from "vitest";
import {
	GenerationRequestSchema,
	GapDetectionRequestSchema,
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
