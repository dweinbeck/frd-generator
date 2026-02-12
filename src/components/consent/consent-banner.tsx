"use client";

import { useEffect, useState } from "react";
import { useAuthedFetch } from "@/hooks/use-authed-fetch";
import { useAuth } from "@/lib/firebase/auth-context";

export function ConsentBanner() {
	const { user } = useAuth();
	const authedFetch = useAuthedFetch();
	const [showBanner, setShowBanner] = useState(false);
	const [isSubmitting, setIsSubmitting] = useState(false);

	useEffect(() => {
		if (!user) return;

		async function checkConsent() {
			try {
				const res = await authedFetch("/api/consent");
				if (res.ok) {
					const data = await res.json();
					if (!data.consented) {
						setShowBanner(true);
					}
				}
			} catch {
				// Non-critical — fail silently
			}
		}
		checkConsent();
	}, [user, authedFetch]);

	async function handleAccept() {
		setIsSubmitting(true);
		try {
			const res = await authedFetch("/api/consent", { method: "POST" });
			if (res.ok) {
				setShowBanner(false);
			}
		} finally {
			setIsSubmitting(false);
		}
	}

	if (!showBanner) return null;

	return (
		<div className="fixed bottom-0 left-0 right-0 z-40 border-t border-gray-200 bg-white p-4 shadow-lg">
			<div className="mx-auto flex max-w-4xl flex-col items-center gap-4 sm:flex-row sm:justify-between">
				<div className="text-sm text-gray-700">
					<p className="font-medium">Terms of Use</p>
					<p className="mt-1 text-gray-500">
						FRDs are AI-generated and may contain inaccuracies. Always review before use. Your data
						is retained for 90 days and then automatically deleted.
					</p>
				</div>
				<button
					type="button"
					onClick={handleAccept}
					disabled={isSubmitting}
					className="shrink-0 rounded-lg bg-primary px-6 py-2 text-sm font-medium text-white hover:bg-primary-dark disabled:opacity-50"
				>
					{isSubmitting ? "Accepting..." : "I Accept"}
				</button>
			</div>
		</div>
	);
}
