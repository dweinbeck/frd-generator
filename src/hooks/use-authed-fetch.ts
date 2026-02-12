"use client";

import { useCallback } from "react";
import { useAuth } from "@/lib/firebase/auth-context";

/**
 * Hook that wraps fetch with Firebase Auth ID token in Authorization header.
 * All API calls should use this instead of raw fetch.
 */
export function useAuthedFetch() {
	const { getIdToken } = useAuth();

	const authedFetch = useCallback(
		async (url: string, options?: RequestInit): Promise<Response> => {
			const token = await getIdToken();
			// TODO: Phase 4 — restore auth requirement, remove anonymous fallback
			if (!token) {
				return fetch(url, options);
			}

			const headers = new Headers(options?.headers);
			headers.set("Authorization", `Bearer ${token}`);

			return fetch(url, { ...options, headers });
		},
		[getIdToken],
	);

	return authedFetch;
}
