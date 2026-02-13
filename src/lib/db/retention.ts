import "server-only";
import { getDb } from "./admin";

const RETENTION_DAYS = 90;

/** Firestore batch limit is 500 operations; use 499 to leave room for the project doc */
const BATCH_LIMIT = 499;

/**
 * Delete all project data older than 90 days (DATA-01, DATA-02).
 * Cascades to subcollections: versions (including prompts, ratings).
 * Uses chunked batch deletes to respect Firestore's 500-document batch limit.
 * Designed to be called from a scheduled Cloud Function or cron job.
 */
export async function deleteExpiredData(): Promise<{ deletedProjects: number }> {
	const db = getDb();
	const cutoffDate = new Date();
	cutoffDate.setDate(cutoffDate.getDate() - RETENTION_DAYS);

	const expiredProjects = await db.collection("projects").where("createdAt", "<", cutoffDate).get();

	let deletedProjects = 0;

	for (const projectDoc of expiredProjects.docs) {
		const projectId = projectDoc.id;

		// Delete all versions (subcollection) — DATA-02: no orphaned data
		// Delete versions in chunks to respect Firestore 500-doc batch limit
		const versions = await db.collection("projects").doc(projectId).collection("versions").get();

		if (versions.size === 0) {
			// No versions — just delete the project doc
			const batch = db.batch();
			batch.delete(projectDoc.ref);
			await batch.commit();
		} else {
			for (let i = 0; i < versions.docs.length; i += BATCH_LIMIT) {
				const chunk = versions.docs.slice(i, i + BATCH_LIMIT);
				const batch = db.batch();
				for (const doc of chunk) {
					batch.delete(doc.ref);
				}
				// Include project doc in last batch
				if (i + BATCH_LIMIT >= versions.docs.length) {
					batch.delete(projectDoc.ref);
				}
				await batch.commit();
			}
		}

		deletedProjects++;
	}

	// Clean up credit transactions older than retention period
	const expiredTransactions = await db
		.collection("credit_transactions")
		.where("createdAt", "<", cutoffDate)
		.get();

	if (expiredTransactions.size > 0) {
		for (let i = 0; i < expiredTransactions.docs.length; i += BATCH_LIMIT) {
			const chunk = expiredTransactions.docs.slice(i, i + BATCH_LIMIT);
			const txBatch = db.batch();
			for (const doc of chunk) {
				txBatch.delete(doc.ref);
			}
			await txBatch.commit();
		}
	}

	return { deletedProjects };
}
