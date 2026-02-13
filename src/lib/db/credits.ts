import "server-only";
import { FieldValue } from "firebase-admin/firestore";
import { getDb } from "./admin";

interface CreditTransaction {
	userId: string;
	amount: number;
	type: "purchase" | "charge" | "refund";
	metadata: {
		projectId?: string;
		versionId?: string;
		model?: string;
		stripeSessionId?: string;
		reason?: string;
	};
}

type CreditTransactionType = CreditTransaction["type"];

export async function getCredits(userId: string): Promise<number> {
	const db = getDb();
	const doc = await db.collection("credits").doc(userId).get();

	if (!doc.exists) {
		return 0;
	}

	return doc.data()?.balance ?? 0;
}

export async function addCredits(
	userId: string,
	amount: number,
	metadata: CreditTransaction["metadata"],
	type: CreditTransactionType = "purchase",
): Promise<number> {
	const db = getDb();
	const creditRef = db.collection("credits").doc(userId);

	return db.runTransaction(async (tx) => {
		const doc = await tx.get(creditRef);
		const currentBalance = doc.exists ? (doc.data()?.balance ?? 0) : 0;
		const newBalance = currentBalance + amount;

		tx.set(
			creditRef,
			{ balance: newBalance, updatedAt: FieldValue.serverTimestamp() },
			{ merge: true },
		);

		// Record transaction (CRED-06)
		const txRef = db.collection("credit_transactions").doc();
		tx.set(txRef, {
			userId,
			amount,
			type,
			balanceAfter: newBalance,
			metadata,
			createdAt: FieldValue.serverTimestamp(),
		});

		return newBalance;
	});
}

export async function chargeCredits(
	userId: string,
	amount: number,
	metadata: CreditTransaction["metadata"],
): Promise<{ success: boolean; balance: number }> {
	const db = getDb();
	const creditRef = db.collection("credits").doc(userId);

	return db.runTransaction(async (tx) => {
		const doc = await tx.get(creditRef);
		const currentBalance = doc.exists ? (doc.data()?.balance ?? 0) : 0;

		if (currentBalance < amount) {
			return { success: false, balance: currentBalance };
		}

		const newBalance = currentBalance - amount;

		tx.update(creditRef, { balance: newBalance, updatedAt: FieldValue.serverTimestamp() });

		// Record transaction (CRED-06)
		const txRef = db.collection("credit_transactions").doc();
		tx.set(txRef, {
			userId,
			amount: -amount,
			type: "charge",
			balanceAfter: newBalance,
			metadata,
			createdAt: FieldValue.serverTimestamp(),
		});

		return { success: true, balance: newBalance };
	});
}
