import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/require-auth";
import { hasUserConsented, recordConsent } from "@/lib/db/consent";

export async function GET(req: Request) {
	const auth = await requireAuth(req);
	if (auth instanceof NextResponse) return auth;

	try {
		const consented = await hasUserConsented(auth.userId);
		return NextResponse.json({ consented });
	} catch {
		return NextResponse.json({ error: "Failed to check consent" }, { status: 500 });
	}
}

export async function POST(req: Request) {
	const auth = await requireAuth(req);
	if (auth instanceof NextResponse) return auth;

	try {
		await recordConsent(auth.userId);
		return NextResponse.json({ success: true });
	} catch {
		return NextResponse.json({ error: "Failed to record consent" }, { status: 500 });
	}
}
