import { NextResponse } from "next/server";
import { deleteExpiredData } from "@/lib/db/retention";
import { createLogger } from "@/lib/logger";

/**
 * Cron endpoint to delete expired data (DATA-01, DATA-02).
 * Should be called by a scheduled Cloud Function or external cron service.
 * Protected by a shared secret in the Authorization header.
 */
export async function POST(req: Request) {
	const logger = createLogger();

	const authHeader = req.headers.get("Authorization");
	const cronSecret = process.env.CRON_SECRET;

	if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	try {
		const result = await deleteExpiredData();

		logger.info("Data retention cleanup completed", {
			action: "retention_cleanup",
			metadata: { deletedProjects: result.deletedProjects },
		});

		return NextResponse.json(result);
	} catch (error) {
		logger.error("Data retention cleanup failed", {
			action: "retention_cleanup",
			metadata: { error: error instanceof Error ? error.message : "Unknown error" },
		});
		return NextResponse.json({ error: "Cleanup failed" }, { status: 500 });
	}
}
