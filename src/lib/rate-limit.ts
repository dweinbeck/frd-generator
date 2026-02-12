import "server-only";

/**
 * Simple in-memory sliding window rate limiter (OBS-03).
 * In production, replace with Redis-based rate limiting.
 */

interface RateLimitEntry {
	timestamps: number[];
}

const store = new Map<string, RateLimitEntry>();

const WINDOW_MS = 60_000; // 1 minute
const MAX_REQUESTS = 10; // per window per user

// Clean up stale entries every 5 minutes
setInterval(() => {
	const now = Date.now();
	for (const [key, entry] of store) {
		entry.timestamps = entry.timestamps.filter((t) => now - t < WINDOW_MS);
		if (entry.timestamps.length === 0) {
			store.delete(key);
		}
	}
}, 300_000);

export function checkRateLimit(
	userId: string,
	action: string,
): { allowed: boolean; retryAfterMs?: number } {
	const key = `${userId}:${action}`;
	const now = Date.now();

	let entry = store.get(key);
	if (!entry) {
		entry = { timestamps: [] };
		store.set(key, entry);
	}

	// Remove expired timestamps
	entry.timestamps = entry.timestamps.filter((t) => now - t < WINDOW_MS);

	if (entry.timestamps.length >= MAX_REQUESTS) {
		const oldestInWindow = entry.timestamps[0];
		const retryAfterMs = WINDOW_MS - (now - oldestInWindow);
		return { allowed: false, retryAfterMs };
	}

	entry.timestamps.push(now);
	return { allowed: true };
}
