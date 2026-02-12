import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/require-auth";
import { getProjectForUser } from "@/lib/db/projects";
import { getLatestVersion } from "@/lib/db/versions";

export async function GET(req: Request, { params }: { params: Promise<{ projectId: string }> }) {
	const auth = await requireAuth(req);
	if (auth instanceof NextResponse) return auth;

	try {
		const { projectId } = await params;
		const project = await getProjectForUser(projectId, auth.userId);

		if (!project) {
			return NextResponse.json({ error: "Project not found" }, { status: 404 });
		}

		const latestVersion = await getLatestVersion(projectId);

		return NextResponse.json({ project, latestVersion });
	} catch {
		return NextResponse.json({ error: "Failed to fetch project" }, { status: 500 });
	}
}
