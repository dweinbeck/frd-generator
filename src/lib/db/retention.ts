import "server-only";
import { getDb } from "./admin";

const RETENTION_DAYS = 90;

/**
 * Delete all project data older than 90 days (DATA-01, DATA-02).
 * Cascades to subcollections: versions (including prompts, ratings).
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
		const versions = await db.collection("projects").doc(projectId).collection("versions").get();

		const batch = db.batch();

		for (const versionDoc of versions.docs) {
			batch.delete(versionDoc.ref);
		}

		// Delete the project document itself
		batch.delete(projectDoc.ref);

		await batch.commit();
		deletedProjects++;
	}

	// Clean up credit transactions older than retention period
	const expiredTransactions = await db
		.collection("credit_transactions")
		.where("createdAt", "<", cutoffDate)
		.get();

	if (expiredTransactions.size > 0) {
		const txBatch = db.batch();
		for (const doc of expiredTransactions.docs) {
			txBatch.delete(doc.ref);
		}
		await txBatch.commit();
	}

	return { deletedProjects };
}
