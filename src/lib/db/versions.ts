import "server-only";
import { FieldValue, type Timestamp } from "firebase-admin/firestore";
import { nanoid } from "nanoid";
import { getDb } from "./admin";

export interface VersionData {
	content: string;
	structuredData: object;
	mode: "fast" | "standard";
	model: string;
	versionNumber: number;
	tokensUsed: number;
	parentVersionId?: string;
	composedPrompt?: string;
	metadata: {
		promptTokens: number;
		completionTokens: number;
		generationTimeMs: number;
	};
}

export interface StoredVersion extends VersionData {
	id: string;
	rating?: number;
	createdAt: Timestamp | null;
}

export async function saveVersion(projectId: string, data: VersionData): Promise<{ id: string }> {
	const db = getDb();
	const versionId = nanoid();
	const versionRef = db.collection("projects").doc(projectId).collection("versions").doc(versionId);

	await versionRef.set({
		...data,
		createdAt: FieldValue.serverTimestamp(),
	});

	return { id: versionId };
}

export async function getVersion(
	projectId: string,
	versionId: string,
): Promise<StoredVersion | null> {
	const db = getDb();
	const doc = await db
		.collection("projects")
		.doc(projectId)
		.collection("versions")
		.doc(versionId)
		.get();

	if (!doc.exists) return null;
	return {
		id: doc.id,
		...(doc.data() as VersionData & { rating?: number; createdAt: Timestamp | null }),
	};
}

export async function getAllVersions(projectId: string): Promise<StoredVersion[]> {
	const db = getDb();
	const snapshot = await db
		.collection("projects")
		.doc(projectId)
		.collection("versions")
		.orderBy("createdAt", "desc")
		.get();

	return snapshot.docs.map((doc) => ({
		id: doc.id,
		...(doc.data() as VersionData & { rating?: number; createdAt: Timestamp | null }),
	}));
}

export async function getLatestVersion(projectId: string): Promise<StoredVersion | null> {
	const db = getDb();
	const versions = await db
		.collection("projects")
		.doc(projectId)
		.collection("versions")
		.orderBy("createdAt", "desc")
		.limit(1)
		.get();

	if (versions.empty) return null;

	const doc = versions.docs[0];
	return {
		id: doc.id,
		...(doc.data() as VersionData & { rating?: number; createdAt: Timestamp | null }),
	};
}

export async function updateVersionRating(
	projectId: string,
	versionId: string,
	rating: number,
): Promise<void> {
	const db = getDb();
	await db
		.collection("projects")
		.doc(projectId)
		.collection("versions")
		.doc(versionId)
		.update({ rating });
}
