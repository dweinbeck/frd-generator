import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/require-auth";
import { getProjectForUser } from "@/lib/db/projects";
import { updateVersionRating } from "@/lib/db/versions";
import { RatingSchema } from "@/lib/validation/generation";

export async function POST(
	req: Request,
	{ params }: { params: Promise<{ projectId: string; versionId: string }> },
) {
	const auth = await requireAuth(req);
	if (auth instanceof NextResponse) return auth;

	try {
		const { projectId, versionId } = await params;

		// AUTH-03: Verify project ownership before allowing rating
		const project = await getProjectForUser(projectId, auth.userId);
		if (!project) {
			return NextResponse.json({ error: "Project not found" }, { status: 404 });
		}

		const body = await req.json();
		const input = RatingSchema.parse(body);

		await updateVersionRating(projectId, versionId, input.rating);

		return NextResponse.json({ success: true });
	} catch (error) {
		if (error instanceof Error && error.name === "ZodError") {
			return NextResponse.json(
				{ error: "Invalid rating", details: (error as { issues?: unknown }).issues },
				{ status: 400 },
			);
		}

		return NextResponse.json({ error: "Failed to save rating" }, { status: 500 });
	}
}
