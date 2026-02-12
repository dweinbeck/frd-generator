"use client";

import { useState } from "react";
import { useAuthedFetch } from "@/hooks/use-authed-fetch";

interface IterationInputProps {
	projectId: string;
	projectName: string;
	parentVersionId: string;
	modelId: string;
	onComplete: (markdown: string, versionId: string) => void;
	onCancel: () => void;
}

export function IterationInput({
	projectId,
	projectName,
	parentVersionId,
	modelId,
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
					disabled={isSubmitting || !feedback.trim()}
					className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-dark disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
				>
					{isSubmitting ? "Iterating..." : "Iterate FRD"}
				</button>
			</div>
		</form>
	);
}
