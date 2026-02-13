"use client";

import { Eye, GitCompare, MessageSquare } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { FrdDisplay } from "@/components/generation/frd-display";
import { GenerationProgress } from "@/components/generation/generation-progress";
import { useAuthedFetch } from "@/hooks/use-authed-fetch";
import type { GenerationMode } from "@/types";
import { IterationInput } from "./iteration-input";
import { RatingWidget } from "./rating-widget";
import { VersionCompare } from "./version-compare";
import { VersionList } from "./version-list";

type ViewMode = "view" | "iterate" | "compare" | "prompt";

interface VersionSummary {
	id: string;
	versionNumber: number;
}

interface ProjectViewProps {
	projectId: string;
	projectName: string;
	initialMarkdown: string;
	initialVersionId: string;
	initialRating?: number;
	mode: GenerationMode;
}

export function ProjectView({
	projectId,
	projectName,
	initialMarkdown,
	initialVersionId,
	initialRating,
	mode: _mode,
}: ProjectViewProps) {
	const [activeVersionId, setActiveVersionId] = useState(initialVersionId);
	const [markdown, setMarkdown] = useState(initialMarkdown);
	const [rating, setRating] = useState(initialRating);
	const [viewMode, setViewMode] = useState<ViewMode>("view");
	const [compareMarkdown, setCompareMarkdown] = useState("");
	const [compareLabel, setCompareLabel] = useState("");
	const [compareTargetId, setCompareTargetId] = useState("");
	const [promptText, setPromptText] = useState("");
	const [loading, setLoading] = useState(false);
	const [versionListKey, setVersionListKey] = useState(0);
	const [versions, setVersions] = useState<VersionSummary[]>([]);
	const [creditBalance, setCreditBalance] = useState<number | null>(null);
	const authedFetch = useAuthedFetch();

	// Fetch versions list for the compare picker
	// biome-ignore lint/correctness/useExhaustiveDependencies: versionListKey triggers re-fetch after iteration
	useEffect(() => {
		async function fetchVersions() {
			const res = await authedFetch(`/api/projects/${projectId}/versions`);
			if (res.ok) {
				const data = await res.json();
				setVersions(
					data.versions.map((v: { id: string; versionNumber: number }) => ({
						id: v.id,
						versionNumber: v.versionNumber,
					})),
				);
			}
		}
		fetchVersions();
	}, [projectId, authedFetch, versionListKey]);

	// CRED-03: Fetch credit balance for iteration cost display
	useEffect(() => {
		async function fetchBalance() {
			try {
				const res = await authedFetch("/api/credits");
				if (res.ok) {
					const data = await res.json();
					setCreditBalance(data.balance);
				}
			} catch {
				// Non-critical
			}
		}
		fetchBalance();
	}, [authedFetch]);

	async function handleVersionSelect(versionId: string) {
		setLoading(true);
		try {
			const res = await authedFetch(`/api/projects/${projectId}/versions/${versionId}`);
			if (res.ok) {
				const data = await res.json();
				setActiveVersionId(versionId);
				setMarkdown(data.version.content);
				setRating(data.version.rating);
				setViewMode("view");
			}
		} finally {
			setLoading(false);
		}
	}

	const handleCompare = useCallback(
		async (versionId: string) => {
			const res = await authedFetch(`/api/projects/${projectId}/versions/${versionId}`);
			if (res.ok) {
				const data = await res.json();
				setCompareMarkdown(data.version.content);
				setCompareLabel(`v${data.version.versionNumber}`);
				setCompareTargetId(versionId);
			}
		},
		[authedFetch, projectId],
	);

	async function handleViewPrompt() {
		const res = await authedFetch(`/api/projects/${projectId}/versions/${activeVersionId}`);
		if (res.ok) {
			const data = await res.json();
			setPromptText(data.version.composedPrompt || "Prompt not recorded for this version.");
			setViewMode("prompt");
		}
	}

	function handleIterationComplete(newMarkdown: string, newVersionId: string) {
		setActiveVersionId(newVersionId);
		setMarkdown(newMarkdown);
		setRating(undefined);
		setViewMode("view");
		setVersionListKey((prev) => prev + 1);
		// Refresh credit balance after iteration
		authedFetch("/api/credits")
			.then((res) => {
				if (res.ok) res.json().then((data) => setCreditBalance(data.balance));
			})
			.catch(() => {});
	}

	// Get versions available for comparison (all except active)
	const compareVersions = versions.filter((v) => v.id !== activeVersionId);

	// When entering compare mode, auto-load the first available compare target
	function handleEnterCompare() {
		setViewMode("compare");
		const defaultTarget =
			compareVersions.find((v) => v.id === initialVersionId) || compareVersions[0];
		if (defaultTarget) {
			handleCompare(defaultTarget.id);
		}
	}

	if (loading) {
		return <GenerationProgress />;
	}

	return (
		<div className="flex flex-col gap-6 lg:flex-row">
			{/* Sidebar: version history */}
			<aside className="w-full lg:w-64 flex-shrink-0">
				<VersionList
					key={versionListKey}
					projectId={projectId}
					activeVersionId={activeVersionId}
					onSelect={handleVersionSelect}
				/>
			</aside>

			{/* Main content */}
			<div className="flex-1 min-w-0">
				{/* Action bar */}
				<div className="flex flex-wrap gap-2 mb-4">
					<button
						type="button"
						onClick={() => setViewMode("view")}
						className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
							viewMode === "view"
								? "bg-primary text-white"
								: "bg-gray-100 text-gray-700 hover:bg-gray-200"
						}`}
					>
						<Eye className="h-4 w-4" />
						View
					</button>
					<button
						type="button"
						onClick={() => setViewMode("iterate")}
						className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
							viewMode === "iterate"
								? "bg-primary text-white"
								: "bg-gray-100 text-gray-700 hover:bg-gray-200"
						}`}
					>
						<MessageSquare className="h-4 w-4" />
						Iterate
					</button>
					<button
						type="button"
						onClick={handleViewPrompt}
						className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
							viewMode === "prompt"
								? "bg-primary text-white"
								: "bg-gray-100 text-gray-700 hover:bg-gray-200"
						}`}
					>
						<Eye className="h-4 w-4" />
						Prompt
					</button>
					<button
						type="button"
						onClick={handleEnterCompare}
						disabled={compareVersions.length === 0}
						className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
							viewMode === "compare"
								? "bg-primary text-white"
								: "bg-gray-100 text-gray-700 hover:bg-gray-200"
						} ${compareVersions.length === 0 ? "opacity-50 cursor-not-allowed" : ""}`}
					>
						<GitCompare className="h-4 w-4" />
						Compare
					</button>
				</div>

				{/* Content area */}
				{viewMode === "view" && (
					<div className="flex flex-col gap-6">
						<FrdDisplay markdown={markdown} projectName={projectName} />
						<RatingWidget
							projectId={projectId}
							versionId={activeVersionId}
							initialRating={rating}
						/>
					</div>
				)}

				{viewMode === "iterate" && (
					<IterationInput
						projectId={projectId}
						projectName={projectName}
						parentVersionId={activeVersionId}
						modelId="gemini-2.5-flash"
						creditBalance={creditBalance}
						onComplete={handleIterationComplete}
						onCancel={() => setViewMode("view")}
					/>
				)}

				{viewMode === "prompt" && (
					<div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
						<h3 className="text-sm font-semibold text-gray-700 mb-2">
							Composed Prompt for this Version
						</h3>
						<pre className="whitespace-pre-wrap text-sm text-gray-600 font-mono bg-white p-4 rounded border overflow-auto max-h-96">
							{promptText}
						</pre>
						<button
							type="button"
							onClick={() => setViewMode("view")}
							className="mt-3 text-sm text-primary hover:underline"
						>
							Back to FRD
						</button>
					</div>
				)}

				{viewMode === "compare" && (
					<div className="flex flex-col gap-4">
						{/* Version picker for compare target */}
						<div className="flex items-center gap-3">
							<label htmlFor="compare-target" className="text-sm font-medium text-gray-700">
								Compare against:
							</label>
							<select
								id="compare-target"
								value={compareTargetId}
								onChange={(e) => handleCompare(e.target.value)}
								className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
							>
								{compareVersions.map((v) => (
									<option key={v.id} value={v.id}>
										v{v.versionNumber}
									</option>
								))}
							</select>
						</div>
						<VersionCompare
							leftMarkdown={compareMarkdown}
							rightMarkdown={markdown}
							leftLabel={compareLabel}
							rightLabel="Current"
						/>
						<button
							type="button"
							onClick={() => setViewMode("view")}
							className="self-start text-sm text-primary hover:underline"
						>
							Back to FRD
						</button>
					</div>
				)}
			</div>
		</div>
	);
}
