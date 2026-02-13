"use client";

import { useState } from "react";
import { useAuthedFetch } from "@/hooks/use-authed-fetch";

const ITERATION_COST = 25;

interface IterationInputProps {
	projectId: string;
	projectName: string;
	parentVersionId: string;
	modelId: string;
	creditBalance: number | null;
	onComplete: (markdown: string, versionId: string) => void;
	onCancel: () => void;
}

export function IterationInput({
	projectId,
	projectName,
	parentVersionId,
	modelId,
	creditBalance,
	onComplete,
	onCancel,
}: IterationInputProps) {
	const [feedback, setFeedback] = useState("");
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [error, setError] = useState("");
	const authedFetch = useAuthedFetch();

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		if (!feedback.trim()) return;
		if (creditBalance !== null && creditBalance < ITERATION_COST) {
			setError(
				"Insufficient credits. You need 25 credits for an iteration. Purchase more credits to continue.",
			);
			return;
		}

		setIsSubmitting(true);
		setError("");

		try {
			const res = await authedFetch("/api/generate", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					projectId,
					projectName,
					brainDump: "",
					mode: "fast",
					parentVersionId,
					iterationFeedback: feedback,
					modelId,
				}),
			});

			if (!res.ok) {
				if (res.status === 402) {
					const data = await res.json();
					setError(
						`Insufficient credits. You have ${data.balance} credits but need ${data.required}. Purchase more credits to continue.`,
					);
					setIsSubmitting(false);
					return;
				}
				if (res.status === 403) {
					const data = await res.json();
					setError(data.error || "You must accept the terms of use first.");
					setIsSubmitting(false);
					return;
				}
				const data = await res.json();
				throw new Error(data.error || "Iteration failed");
			}

			const data = await res.json();
			onComplete(data.markdown, data.versionId);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Iteration failed");
		} finally {
			setIsSubmitting(false);
		}
	}

	return (
		<form
			onSubmit={handleSubmit}
			className="flex flex-col gap-4 rounded-lg border border-gray-200 bg-white p-4"
		>
			<div>
				<label
					htmlFor="iteration-feedback"
					className="block text-sm font-medium text-gray-700 mb-1"
				>
					What would you like to change?
				</label>
				<textarea
					id="iteration-feedback"
					value={feedback}
					onChange={(e) => setFeedback(e.target.value)}
					rows={4}
					placeholder="e.g., Add more requirements about notifications, remove the admin persona, change REQ-03 priority to must-have..."
					className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
				/>
			</div>

			{/* CRED-03: Show iteration cost */}
			{creditBalance !== null && (
				<div
					className={`rounded-lg px-3 py-2 text-sm ${
						creditBalance < ITERATION_COST
							? "bg-amber-50 text-amber-700 border border-amber-200"
							: "bg-blue-50 text-blue-700"
					}`}
				>
					This iteration costs <span className="font-semibold">25 credits</span>. Your balance:{" "}
					<span className="font-semibold">{creditBalance} credits</span>.
					{creditBalance < ITERATION_COST && (
						<span className="block mt-1 font-medium">Purchase more credits to iterate.</span>
					)}
				</div>
			)}

			{error && (
				<div role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
					{error}
				</div>
			)}

			<div className="flex gap-2">
				<button
					type="button"
					onClick={onCancel}
					className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
				>
					Cancel
				</button>
				<button
					type="submit"
					disabled={
						isSubmitting ||
						!feedback.trim() ||
						(creditBalance !== null && creditBalance < ITERATION_COST)
					}
					className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-dark disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
				>
					{isSubmitting ? "Iterating..." : "Iterate FRD"}
				</button>
			</div>
		</form>
	);
}
