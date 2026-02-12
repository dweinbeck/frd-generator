import "server-only";
import { getAuth } from "firebase-admin/auth";
import { getDb } from "@/lib/db/admin";

interface AuthResult {
	userId: string;
}

/**
 * Verify Firebase ID token from the Authorization header.
 * Returns the authenticated user's UID or null if invalid.
 *
 * AUTH-02: Server-side identity validation on every API request.
 */
export async function verifyAuth(req: Request): Promise<AuthResult | null> {
	const authHeader = req.headers.get("Authorization");
	if (!authHeader?.startsWith("Bearer ")) {
		return null;
	}

	const idToken = authHeader.slice(7);
	if (!idToken) {
		return null;
	}

	try {
		// Ensure admin app is initialized by touching the DB
		getDb();
		const decodedToken = await getAuth().verifyIdToken(idToken);
		return { userId: decodedToken.uid };
	} catch {
		return null;
	}
}
