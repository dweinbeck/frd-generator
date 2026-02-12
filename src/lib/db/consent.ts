import "server-only";
import { FieldValue } from "firebase-admin/firestore";
import { getDb } from "./admin";

/**
 * Track user consent for AI-generated content and data retention (DATA-03).
 */

export async function hasUserConsented(userId: string): Promise<boolean> {
	const db = getDb();
	const doc = await db.collection("user_consent").doc(userId).get();
	return doc.exists && doc.data()?.accepted === true;
}

export async function recordConsent(userId: string): Promise<void> {
	const db = getDb();
	await db.collection("user_consent").doc(userId).set({
		accepted: true,
		acceptedAt: FieldValue.serverTimestamp(),
		version: "1.0",
	});
}
