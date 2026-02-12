"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ModeSelector } from "@/components/generation/mode-selector";
// TODO: Phase 4 — restore authedFetch and useAuth
// import { useAuthedFetch } from "@/hooks/use-authed-fetch";
// import { useAuth } from "@/lib/firebase/auth-context";
import type { GenerationMode } from "@/types";

export default function Home() {
	const router = useRouter();
	// TODO: Phase 4 — restore useAuth and authedFetch
	const authLoading = false;
	const [name, setName] = useState("");
	const [mode, setMode] = useState<GenerationMode>("fast");
	const [error, setError] = useState("");
	const [isCreating, setIsCreating] = useState(false);

	if (authLoading) {
		return (
			<div className="flex min-h-screen items-center justify-center">
				<div className="animate-pulse text-gray-400">Loading...</div>
			</div>
		);
	}

	// TODO: Phase 4 — re-enable auth guard
	// if (!user) {
	// 	router.push("/sign-in");
	// 	return null;
	// }

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		setError("");

		if (!name.trim()) {
			setError("Please enter a project name");
			return;
		}

		setIsCreating(true);

		try {
			const res = await fetch("/api/projects", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ name: name.trim(), mode }),
			});

			if (!res.ok) {
				const data = await res.json();
				throw new Error(data.error || "Failed to create project");
			}

			const data = await res.json();
			router.push(`/projects/${data.projectId}`);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to create project");
			setIsCreating(false);
		}
	}

	return (
		<div className="flex min-h-screen items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
			<div className="w-full max-w-2xl">
				<div className="text-center mb-10">
					<h1 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
						FRD Generator
					</h1>
					<p className="mt-3 text-base text-gray-600 sm:text-lg">
						Generate Claude Code-ready Functional Requirements Documents from your ideas
					</p>
				</div>

				<form
					onSubmit={handleSubmit}
					className="flex flex-col gap-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8"
				>
					<div>
						<label htmlFor="project-name" className="block text-sm font-medium text-gray-700 mb-1">
							Project Name
						</label>
						<input
							id="project-name"
							type="text"
							value={name}
							onChange={(e) => setName(e.target.value)}
							placeholder="e.g., Task Manager App"
							maxLength={100}
							className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 placeholder:text-gray-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
						/>
					</div>

					<fieldset>
						<legend className="block text-sm font-medium text-gray-700 mb-2">
							Generation Mode
						</legend>
						<ModeSelector value={mode} onChange={setMode} />
					</fieldset>

					{error && (
						<div role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
							{error}
						</div>
					)}

					<button
						type="submit"
						disabled={isCreating}
						className="rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
					>
						{isCreating ? "Creating..." : "Create Project"}
					</button>
				</form>
			</div>
		</div>
	);
}
