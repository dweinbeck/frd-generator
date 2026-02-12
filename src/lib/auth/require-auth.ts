import "server-only";
import { NextResponse } from "next/server";
import { verifyAuth } from "./verify-token";

/**
 * Helper that verifies auth and returns a 401 response if not authenticated.
 * Use in API routes: const auth = await requireAuth(req); if (auth instanceof NextResponse) return auth;
 */
export async function requireAuth(req: Request) {
	const auth = await verifyAuth(req);
	if (!auth) {
		return NextResponse.json({ error: "Authentication required" }, { status: 401 });
	}
	return auth;
}
