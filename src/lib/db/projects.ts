import "server-only";
import { FieldValue } from "firebase-admin/firestore";
import { nanoid } from "nanoid";
import type { GenerationMode, Project } from "@/types";
import { getDb } from "./admin";

// TODO: Replace userId parameter with authenticated userId from Firebase Auth in Phase 4
export async function createProject(data: {
	name: string;
	mode: GenerationMode;
	userId: string;
}): Promise<{ id: string }> {
	const db = getDb();
	const id = nanoid();
	const projectRef = db.collection("projects").doc(id);

	await projectRef.set({
		name: data.name,
		userId: data.userId,
		mode: data.mode,
		latestVersionId: null,
		versionCount: 0,
		createdAt: FieldValue.serverTimestamp(),
		updatedAt: FieldValue.serverTimestamp(),
	});

	return { id };
}

export async function getProject(projectId: string): Promise<Project | null> {
	const db = getDb();
	const doc = await db.collection("projects").doc(projectId).get();

	if (!doc.exists) {
		return null;
	}

	const data = doc.data();
	if (!data) return null;

	return {
		id: doc.id,
		name: data.name,
		userId: data.userId,
		mode: data.mode,
		latestVersionId: data.latestVersionId,
		versionCount: data.versionCount,
		createdAt: data.createdAt?.toDate() ?? new Date(),
		updatedAt: data.updatedAt?.toDate() ?? new Date(),
	} as Project;
}

/**
 * Get a project only if the requesting user owns it.
 * AUTH-03: Data isolation — no cross-user data leakage.
 */
export async function getProjectForUser(
	projectId: string,
	userId: string,
): Promise<Project | null> {
	const project = await getProject(projectId);
	if (!project || project.userId !== userId) {
		return null;
	}
	return project;
}

export async function updateProject(
	projectId: string,
	data: Partial<Pick<Project, "latestVersionId" | "versionCount">>,
): Promise<void> {
	const db = getDb();
	await db
		.collection("projects")
		.doc(projectId)
		.update({
			...data,
			updatedAt: FieldValue.serverTimestamp(),
		});
}
