import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/require-auth";
import { getCredits } from "@/lib/db/credits";

export async function GET(req: Request) {
	const auth = await requireAuth(req);
	if (auth instanceof NextResponse) return auth;

	try {
		const balance = await getCredits(auth.userId);
		return NextResponse.json({ balance });
	} catch {
		return NextResponse.json({ error: "Failed to fetch credits" }, { status: 500 });
	}
}
