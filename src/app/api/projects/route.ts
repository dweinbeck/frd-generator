import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/require-auth";
import { createProject } from "@/lib/db/projects";
import { CreateProjectSchema } from "@/lib/validation/project";

export async function POST(req: Request) {
	const auth = await requireAuth(req);
	if (auth instanceof NextResponse) return auth;

	try {
		const body = await req.json();
		const input = CreateProjectSchema.parse(body);
		const result = await createProject({ name: input.name, mode: input.mode, userId: auth.userId });
		return NextResponse.json({ projectId: result.id }, { status: 201 });
	} catch (error) {
		if (error instanceof Error && error.name === "ZodError") {
			return NextResponse.json(
				{ error: "Invalid input", details: (error as { issues?: unknown }).issues },
				{ status: 400 },
			);
		}
		return NextResponse.json({ error: "Failed to create project" }, { status: 500 });
	}
}
