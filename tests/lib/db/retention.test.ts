import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock server-only
vi.mock("server-only", () => ({}));

// Build Firestore mock with batch tracking
const mockBatchDelete = vi.fn();
const mockBatchCommit = vi.fn().mockResolvedValue(undefined);
const mockBatch = vi.fn(() => ({
	delete: mockBatchDelete,
	commit: mockBatchCommit,
}));

interface MockDoc {
	id: string;
	ref: { path: string };
	data: () => Record<string, unknown>;
}

let mockProjectDocs: MockDoc[] = [];
let mockVersionDocs: MockDoc[] = [];
let mockTransactionDocs: MockDoc[] = [];

function createMockDoc(collection: string, id: string, data: Record<string, unknown> = {}): MockDoc {
	return {
		id,
		ref: { path: `${collection}/${id}` },
		data: () => data,
	};
}

vi.mock("@/lib/db/admin", () => ({
	getDb: () => ({
		collection: (name: string) => {
			if (name === "projects") {
				return {
					where: () => ({
						get: vi.fn().mockResolvedValue({
							docs: mockProjectDocs,
							size: mockProjectDocs.length,
						}),
					}),
					doc: (id: string) => ({
						collection: (subName: string) => {
							if (subName === "versions") {
								return {
									get: vi.fn().mockResolvedValue({
										docs: mockVersionDocs,
										size: mockVersionDocs.length,
									}),
								};
							}
							return { get: vi.fn().mockResolvedValue({ docs: [], size: 0 }) };
						},
					}),
				};
			}
			if (name === "credit_transactions") {
				return {
					where: () => ({
						get: vi.fn().mockResolvedValue({
							docs: mockTransactionDocs,
							size: mockTransactionDocs.length,
						}),
					}),
				};
			}
			return {
				where: () => ({
					get: vi.fn().mockResolvedValue({ docs: [], size: 0 }),
				}),
			};
		},
		batch: mockBatch,
	}),
}));

import { deleteExpiredData } from "@/lib/db/retention";

beforeEach(() => {
	vi.clearAllMocks();
	mockProjectDocs = [];
	mockVersionDocs = [];
	mockTransactionDocs = [];
});

describe("deleteExpiredData", () => {
	it("deletes project and all versions for expired project", async () => {
		const projectDoc = createMockDoc("projects", "proj-expired", {
			createdAt: new Date("2020-01-01"),
		});
		mockProjectDocs = [projectDoc];

		const v1 = createMockDoc("projects/proj-expired/versions", "v1");
		const v2 = createMockDoc("projects/proj-expired/versions", "v2");
		mockVersionDocs = [v1, v2];

		const result = await deleteExpiredData();

		expect(result.deletedProjects).toBe(1);
		// Should delete 2 versions + 1 project doc
		expect(mockBatchDelete).toHaveBeenCalledTimes(3);
		expect(mockBatchDelete).toHaveBeenCalledWith(v1.ref);
		expect(mockBatchDelete).toHaveBeenCalledWith(v2.ref);
		expect(mockBatchDelete).toHaveBeenCalledWith(projectDoc.ref);
		expect(mockBatchCommit).toHaveBeenCalledTimes(1);
	});

	it("does not delete projects newer than 90 days", async () => {
		// No expired projects
		mockProjectDocs = [];

		const result = await deleteExpiredData();

		expect(result.deletedProjects).toBe(0);
		expect(mockBatchDelete).not.toHaveBeenCalled();
	});

	it("handles project with zero versions (just deletes project doc)", async () => {
		const projectDoc = createMockDoc("projects", "proj-no-versions", {
			createdAt: new Date("2020-01-01"),
		});
		mockProjectDocs = [projectDoc];
		mockVersionDocs = [];

		const result = await deleteExpiredData();

		expect(result.deletedProjects).toBe(1);
		expect(mockBatchDelete).toHaveBeenCalledTimes(1);
		expect(mockBatchDelete).toHaveBeenCalledWith(projectDoc.ref);
		expect(mockBatchCommit).toHaveBeenCalledTimes(1);
	});

	it("chunks deletions when version count exceeds 499 — multiple batch.commit() calls", async () => {
		const projectDoc = createMockDoc("projects", "proj-large", {
			createdAt: new Date("2020-01-01"),
		});
		mockProjectDocs = [projectDoc];

		// Create 600 mock version docs
		const versions: MockDoc[] = [];
		for (let i = 0; i < 600; i++) {
			versions.push(createMockDoc(`projects/proj-large/versions`, `v${i}`));
		}
		mockVersionDocs = versions;

		const result = await deleteExpiredData();

		expect(result.deletedProjects).toBe(1);
		// 600 versions + 1 project doc = 601 deletes
		// Batch 1: 499 versions (docs 0-498)
		// Batch 2: 101 remaining versions (docs 499-599) + 1 project doc = 102
		// Total: 2 batch.commit() calls
		expect(mockBatchCommit).toHaveBeenCalledTimes(2);
		// Total deletes: 600 versions + 1 project doc = 601
		expect(mockBatchDelete).toHaveBeenCalledTimes(601);
	});

	it("deletes expired credit_transactions", async () => {
		mockProjectDocs = [];

		const tx1 = createMockDoc("credit_transactions", "tx1");
		const tx2 = createMockDoc("credit_transactions", "tx2");
		mockTransactionDocs = [tx1, tx2];

		await deleteExpiredData();

		expect(mockBatchDelete).toHaveBeenCalledWith(tx1.ref);
		expect(mockBatchDelete).toHaveBeenCalledWith(tx2.ref);
	});

	it("chunks credit_transaction deletions when count exceeds 499", async () => {
		mockProjectDocs = [];

		// Create 600 expired transaction docs
		const txDocs: MockDoc[] = [];
		for (let i = 0; i < 600; i++) {
			txDocs.push(createMockDoc("credit_transactions", `tx${i}`));
		}
		mockTransactionDocs = txDocs;

		await deleteExpiredData();

		// 600 transactions / 499 batch limit = 2 batch commits
		expect(mockBatchCommit).toHaveBeenCalledTimes(2);
		expect(mockBatchDelete).toHaveBeenCalledTimes(600);
	});
});
