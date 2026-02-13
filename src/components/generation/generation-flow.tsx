"use client";

import { useEffect, useState } from "react";
import { useAuthedFetch } from "@/hooks/use-authed-fetch";
import type { FollowUpAnswer, GenerationMode, GuidedAnswer } from "@/types";
import { BrainDumpInput } from "./brain-dump-input";
import { FrdDisplay } from "./frd-display";
import { GapFollowUps } from "./gap-follow-ups";
import { GenerationProgress } from "./generation-progress";
import { ModelSelector } from "./model-selector";
import { StandardModeFlow } from "./standard-mode-flow";

type FlowState = "input" | "analyzing-gaps" | "follow-ups" | "generating" | "complete" | "error";

interface GenerationFlowProps {
	projectId: string;
	projectName: string;
	mode: GenerationMode;
}

interface Gap {
	section: string;
	description: string;
	followUpPrompt: string;
	importance: "high" | "medium" | "low";
}

const GENERATION_COST = 50;

export function GenerationFlow({ projectId, projectName, mode }: GenerationFlowProps) {
	const [state, setState] = useState<FlowState>("input");
	const [markdown, setMarkdown] = useState("");
	const [error, setError] = useState("");
	const [brainDump, setBrainDump] = useState("");
	const [gaps, setGaps] = useState<Gap[]>([]);
	const [modelId, setModelId] = useState("gemini-2.5-flash");
	const [creditBalance, setCreditBalance] = useState<number | null>(null);
	const authedFetch = useAuthedFetch();

	// CRED-03: Fetch credit balance to display before generation
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

	async function handleBrainDumpSubmit(text: string) {
		if (creditBalance !== null && creditBalance < GENERATION_COST) {
			setError(
				"Insufficient credits. You need 50 credits to generate an FRD. Purchase more credits to continue.",
			);
			return;
		}
		setBrainDump(text);
		setState("analyzing-gaps");
		setError("");

		try {
			const res = await authedFetch("/api/analyze-gaps", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ projectName, brainDump: text, modelId }),
			});

			if (!res.ok) {
				const data = await res.json();
				throw new Error(data.error || "Gap analysis failed");
			}

			const data = await res.json();
			if (data.gaps && data.gaps.length > 0) {
				setGaps(data.gaps);
				setState("follow-ups");
			} else {
				await generateWithInput(text, []);
			}
		} catch (err) {
			setError(err instanceof Error ? err.message : "Gap analysis failed");
			setState("error");
		}
	}

	async function generateWithInput(dump: string, followUpAnswers: FollowUpAnswer[]) {
		setState("generating");
		setError("");

		try {
			const res = await authedFetch("/api/generate", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					projectId,
					projectName,
					brainDump: dump,
					mode: "fast",
					followUpAnswers: followUpAnswers.length > 0 ? followUpAnswers : undefined,
					modelId,
				}),
			});

			if (!res.ok) {
				if (res.status === 402) {
					const data = await res.json();
					setError(
						`Insufficient credits. You have ${data.balance} credits but need ${data.required}. Purchase more credits to continue.`,
					);
					setCreditBalance(data.balance);
					setState("error");
					return;
				}
				if (res.status === 403) {
					const data = await res.json();
					setError(data.error || "You must accept the terms of use before generating.");
					setState("error");
					return;
				}
				const data = await res.json();
				throw new Error(data.error || "Generation failed");
			}

			const data = await res.json();
			setMarkdown(data.markdown);
			setState("complete");
		} catch (err) {
			setError(err instanceof Error ? err.message : "Generation failed. Please try again.");
			setState("error");
		}
	}

	async function handleStandardSubmit(guidedAnswers: GuidedAnswer[]) {
		if (creditBalance !== null && creditBalance < GENERATION_COST) {
			setError(
				"Insufficient credits. You need 50 credits to generate an FRD. Purchase more credits to continue.",
			);
			return;
		}
		setState("generating");
		setError("");

		try {
			const res = await authedFetch("/api/generate", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					projectId,
					projectName,
					brainDump: "",
					mode: "standard",
					guidedAnswers,
					modelId,
				}),
			});

			if (!res.ok) {
				if (res.status === 402) {
					const data = await res.json();
					setError(
						`Insufficient credits. You have ${data.balance} credits but need ${data.required}. Purchase more credits to continue.`,
					);
					setCreditBalance(data.balance);
					setState("error");
					return;
				}
				if (res.status === 403) {
					const data = await res.json();
					setError(data.error || "You must accept the terms of use before generating.");
					setState("error");
					return;
				}
				const data = await res.json();
				throw new Error(data.error || "Generation failed");
			}

			const data = await res.json();
			setMarkdown(data.markdown);
			setState("complete");
		} catch (err) {
			setError(err instanceof Error ? err.message : "Generation failed. Please try again.");
			setState("error");
		}
	}

	if (state === "analyzing-gaps") {
		return <GenerationProgress />;
	}

	if (state === "follow-ups") {
		return (
			<div className="flex flex-col gap-6">
				<div>
					<p className="block text-sm font-medium text-gray-700 mb-2">Model</p>
					<ModelSelector value={modelId} onChange={setModelId} />
				</div>
				<GapFollowUps
					gaps={gaps}
					onSubmit={(answers) => generateWithInput(brainDump, answers)}
					onSkipAll={() => generateWithInput(brainDump, [])}
					isSubmitting={state === "follow-ups" && false}
				/>
			</div>
		);
	}

	if (state === "generating") {
		return <GenerationProgress />;
	}

	if (state === "complete") {
		return (
			<div className="flex flex-col gap-6">
				<FrdDisplay markdown={markdown} projectName={projectName} />
				<button
					type="button"
					onClick={() => {
						setState("input");
						setMarkdown("");
						setBrainDump("");
						setGaps([]);
					}}
					className="self-start rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
				>
					Generate Another
				</button>
			</div>
		);
	}

	// CRED-03: Credit cost notice with warning when insufficient
	const isInsufficientCredits = creditBalance !== null && creditBalance < GENERATION_COST;
	const creditNotice =
		creditBalance !== null ? (
			<div
				className={`rounded-lg px-3 py-2 text-sm ${
					isInsufficientCredits
						? "bg-amber-50 text-amber-700 border border-amber-200"
						: "bg-blue-50 text-blue-700"
				}`}
			>
				This generation costs <span className="font-semibold">50 credits</span>. Your balance:{" "}
				<span className="font-semibold">{creditBalance} credits</span>.
				{isInsufficientCredits && (
					<span className="block mt-1 font-medium">Purchase more credits to generate.</span>
				)}
			</div>
		) : null;

	// input or error state
	if (mode === "standard") {
		return (
			<div className="flex flex-col gap-6">
				<div>
					<p className="block text-sm font-medium text-gray-700 mb-2">Model</p>
					<ModelSelector value={modelId} onChange={setModelId} />
				</div>
				{creditNotice}
				{error && (
					<div role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
						{error}
					</div>
				)}
				<StandardModeFlow onSubmit={handleStandardSubmit} isSubmitting={false} />
			</div>
		);
	}

	return (
		<div className="flex flex-col gap-6">
			<div>
				<p className="block text-sm font-medium text-gray-700 mb-2">Model</p>
				<ModelSelector value={modelId} onChange={setModelId} />
			</div>
			{creditNotice}
			<BrainDumpInput
				onSubmit={handleBrainDumpSubmit}
				error={state === "error" ? error : undefined}
				isSubmitting={false}
			/>
		</div>
	);
}
