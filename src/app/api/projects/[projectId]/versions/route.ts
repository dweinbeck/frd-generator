import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/require-auth";
import { getProjectForUser } from "@/lib/db/projects";
import { getAllVersions } from "@/lib/db/versions";

export async function GET(req: Request, { params }: { params: Promise<{ projectId: string }> }) {
	const auth = await requireAuth(req);
	if (auth instanceof NextResponse) return auth;

	try {
		const { projectId } = await params;

		// AUTH-03: Verify project ownership before returning versions
		const project = await getProjectForUser(projectId, auth.userId);
		if (!project) {
			return NextResponse.json({ error: "Project not found" }, { status: 404 });
		}

		const versions = await getAllVersions(projectId);

		// Strip composedPrompt from list view (AUTH-05: only visible on individual version)
		// Convert Firestore Timestamps to ISO strings for frontend consumption
		const sanitized = versions.map(({ composedPrompt: _prompt, createdAt, ...rest }) => ({
			...rest,
			createdAt:
				createdAt && typeof createdAt === "object" && "toDate" in createdAt
					? (createdAt as { toDate(): Date }).toDate().toISOString()
					: null,
		}));

		return NextResponse.json({ versions: sanitized });
	} catch {
		return NextResponse.json({ error: "Failed to fetch versions" }, { status: 500 });
	}
}
