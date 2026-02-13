import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock server-only (imported by credits module)
vi.mock("server-only", () => ({}));

// Mock firebase-admin/firestore for FieldValue
vi.mock("firebase-admin/firestore", () => ({
	FieldValue: {
		serverTimestamp: () => "SERVER_TIMESTAMP",
	},
}));

// Build a more realistic Firestore mock with distinct refs per collection
const mockRunTransaction = vi.fn();
const docRefs: Record<string, unknown> = {};
const docResults: Record<string, unknown> = {};

function resetFirestoreMocks() {
	mockRunTransaction.mockReset();
	for (const key of Object.keys(docRefs)) delete docRefs[key];
	for (const key of Object.keys(docResults)) delete docResults[key];
}

let txDocCounter = 0;

vi.mock("@/lib/db/admin", () => ({
	getDb: () => ({
		collection: (name: string) => ({
			doc: (id?: string) => {
				const docId = id ?? `auto-${++txDocCounter}`;
				const key = `${name}/${docId}`;
				if (!docRefs[key]) {
					docRefs[key] = { _key: key, _collection: name, _docId: docId };
				}
				return docRefs[key];
			},
		}),
		runTransaction: mockRunTransaction,
	}),
}));

import { addCredits, chargeCredits, getCredits } from "@/lib/db/credits";

beforeEach(() => {
	vi.clearAllMocks();
	resetFirestoreMocks();
	txDocCounter = 0;
});

describe("getCredits", () => {
	it("returns 0 for non-existent user", async () => {
		// For getCredits, the function does db.collection("credits").doc(userId).get()
		// We need the doc ref to have a .get() method
		const creditDocRef = {
			_key: "credits/user-nonexistent",
			get: vi.fn().mockResolvedValue({ exists: false }),
		};
		docRefs["credits/user-nonexistent"] = creditDocRef;

		// Override getDb for this test to return the proper chain
		const { getCredits: getCreditsLocal } = await import("@/lib/db/credits");
		const balance = await getCreditsLocal("user-nonexistent");

		expect(balance).toBe(0);
	});

	it("returns balance for existing user", async () => {
		const creditDocRef = {
			_key: "credits/user-existing",
			get: vi.fn().mockResolvedValue({
				exists: true,
				data: () => ({ balance: 150 }),
			}),
		};
		docRefs["credits/user-existing"] = creditDocRef;

		const balance = await getCredits("user-existing");
		expect(balance).toBe(150);
	});
});

describe("chargeCredits", () => {
	it("rejects when balance is insufficient, returns { success: false, balance } (CRED-04)", async () => {
		const mockTx = {
			get: vi.fn().mockResolvedValue({
				exists: true,
				data: () => ({ balance: 30 }),
			}),
			set: vi.fn(),
			update: vi.fn(),
		};
		mockRunTransaction.mockImplementation(async (cb: (tx: typeof mockTx) => Promise<unknown>) => cb(mockTx));

		const result = await chargeCredits("test-user", 50, {
			projectId: "proj-1",
			model: "gemini-2.5-flash",
			reason: "initial_generation",
		});

		expect(result).toEqual({ success: false, balance: 30 });
		expect(mockTx.update).not.toHaveBeenCalled();
		expect(mockTx.set).not.toHaveBeenCalled();
	});

	it("deducts correct amount, returns { success: true, balance: newBalance } (CRED-01)", async () => {
		const mockTx = {
			get: vi.fn().mockResolvedValue({
				exists: true,
				data: () => ({ balance: 100 }),
			}),
			set: vi.fn(),
			update: vi.fn(),
		};
		mockRunTransaction.mockImplementation(async (cb: (tx: typeof mockTx) => Promise<unknown>) => cb(mockTx));

		const result = await chargeCredits("test-user", 50, {
			projectId: "proj-1",
			model: "gemini-2.5-flash",
			reason: "initial_generation",
		});

		expect(result).toEqual({ success: true, balance: 50 });
		// update is called with the creditRef and new balance
		expect(mockTx.update).toHaveBeenCalledTimes(1);
		const updateArgs = mockTx.update.mock.calls[0];
		expect(updateArgs[1]).toEqual({
			balance: 50,
			updatedAt: "SERVER_TIMESTAMP",
		});
	});

	it("records transaction with metadata including projectId, model, reason (CRED-06)", async () => {
		const mockTx = {
			get: vi.fn().mockResolvedValue({
				exists: true,
				data: () => ({ balance: 100 }),
			}),
			set: vi.fn(),
			update: vi.fn(),
		};
		mockRunTransaction.mockImplementation(async (cb: (tx: typeof mockTx) => Promise<unknown>) => cb(mockTx));

		const metadata = {
			projectId: "proj-1",
			model: "gemini-2.5-flash",
			reason: "initial_generation",
		};

		await chargeCredits("test-user", 50, metadata);

		// tx.set is called once for the transaction record
		expect(mockTx.set).toHaveBeenCalledTimes(1);
		const setArgs = mockTx.set.mock.calls[0];
		expect(setArgs[1]).toMatchObject({
			userId: "test-user",
			amount: -50,
			type: "charge",
			balanceAfter: 50,
			metadata,
			createdAt: "SERVER_TIMESTAMP",
		});
	});
});

describe("addCredits", () => {
	it("adds credits and records purchase transaction", async () => {
		const mockTx = {
			get: vi.fn().mockResolvedValue({
				exists: true,
				data: () => ({ balance: 100 }),
			}),
			set: vi.fn(),
			update: vi.fn(),
		};
		mockRunTransaction.mockImplementation(async (cb: (tx: typeof mockTx) => Promise<unknown>) => cb(mockTx));

		const result = await addCredits("test-user", 500, {
			stripeSessionId: "session-123",
			reason: "purchase",
		});

		expect(result).toBe(600);

		// First set call: credit balance update with merge:true
		expect(mockTx.set).toHaveBeenCalledTimes(2);
		const creditSetArgs = mockTx.set.mock.calls[0];
		expect(creditSetArgs[1]).toEqual({
			balance: 600,
			updatedAt: "SERVER_TIMESTAMP",
		});
		expect(creditSetArgs[2]).toEqual({ merge: true });

		// Second set call: transaction record with type "purchase"
		const txSetArgs = mockTx.set.mock.calls[1];
		expect(txSetArgs[1]).toMatchObject({
			userId: "test-user",
			amount: 500,
			type: "purchase",
			balanceAfter: 600,
			metadata: { stripeSessionId: "session-123", reason: "purchase" },
		});
	});

	it("creates credit doc for new user (merge: true)", async () => {
		const mockTx = {
			get: vi.fn().mockResolvedValue({
				exists: false,
				data: () => undefined,
			}),
			set: vi.fn(),
			update: vi.fn(),
		};
		mockRunTransaction.mockImplementation(async (cb: (tx: typeof mockTx) => Promise<unknown>) => cb(mockTx));

		const result = await addCredits("new-user", 100, {
			stripeSessionId: "session-456",
			reason: "purchase",
		});

		expect(result).toBe(100);
		// merge:true ensures doc creation for new users
		const creditSetArgs = mockTx.set.mock.calls[0];
		expect(creditSetArgs[1]).toEqual({
			balance: 100,
			updatedAt: "SERVER_TIMESTAMP",
		});
		expect(creditSetArgs[2]).toEqual({ merge: true });
	});

	it("records refund transaction with type=refund", async () => {
		const mockTx = {
			get: vi.fn().mockResolvedValue({
				exists: true,
				data: () => ({ balance: 50 }),
			}),
			set: vi.fn(),
			update: vi.fn(),
		};
		mockRunTransaction.mockImplementation(async (cb: (tx: typeof mockTx) => Promise<unknown>) => cb(mockTx));

		await addCredits(
			"test-user",
			50,
			{ reason: "generation_failed_refund" },
			"refund",
		);

		// Second set call is the transaction record
		const txSetArgs = mockTx.set.mock.calls[1];
		expect(txSetArgs[1]).toMatchObject({
			type: "refund",
			amount: 50,
		});
	});
});
