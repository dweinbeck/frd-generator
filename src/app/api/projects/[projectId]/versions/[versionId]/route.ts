import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/require-auth";
import { getProjectForUser } from "@/lib/db/projects";
import { getVersion } from "@/lib/db/versions";

export async function GET(
	req: Request,
	{ params }: { params: Promise<{ projectId: string; versionId: string }> },
) {
	const auth = await requireAuth(req);
	if (auth instanceof NextResponse) return auth;

	try {
		const { projectId, versionId } = await params;

		// AUTH-03: Verify project ownership before returning version
		const project = await getProjectForUser(projectId, auth.userId);
		if (!project) {
			return NextResponse.json({ error: "Project not found" }, { status: 404 });
		}

		const version = await getVersion(projectId, versionId);

		if (!version) {
			return NextResponse.json({ error: "Version not found" }, { status: 404 });
		}

		// AUTH-05: composedPrompt is only returned to the owning user
		// (already verified via getProjectForUser above)
		return NextResponse.json({ version });
	} catch {
		return NextResponse.json({ error: "Failed to fetch version" }, { status: 500 });
	}
}
