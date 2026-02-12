"use client";

import { clsx } from "clsx";
import { AlertCircle, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import type { FollowUpAnswer } from "@/types";

interface Gap {
	section: string;
	description: string;
	followUpPrompt: string;
	importance: "high" | "medium" | "low";
}

interface GapFollowUpsProps {
	gaps: Gap[];
	onSubmit: (answers: FollowUpAnswer[]) => void;
	onSkipAll: () => void;
	isSubmitting: boolean;
}

export function GapFollowUps({ gaps, onSubmit, onSkipAll, isSubmitting }: GapFollowUpsProps) {
	const [answers, setAnswers] = useState<Record<number, string>>({});
	const [collapsed, setCollapsed] = useState<Record<number, boolean>>({});

	function handleAnswerChange(index: number, value: string) {
		setAnswers((prev) => ({ ...prev, [index]: value }));
	}

	function toggleCollapse(index: number) {
		setCollapsed((prev) => ({ ...prev, [index]: !prev[index] }));
	}

	function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		const followUpAnswers: FollowUpAnswer[] = [];
		for (let i = 0; i < gaps.length; i++) {
			const answer = answers[i]?.trim();
			if (answer) {
				followUpAnswers.push({
					section: gaps[i].section,
					question: gaps[i].followUpPrompt,
					answer,
				});
			}
		}
		onSubmit(followUpAnswers);
	}

	const answeredCount = Object.values(answers).filter((a) => a?.trim()).length;

	return (
		<form onSubmit={handleSubmit} className="flex flex-col gap-4">
			<div className="flex items-center justify-between">
				<div>
					<h3 className="text-lg font-semibold text-gray-900">
						We found {gaps.length} gap{gaps.length !== 1 ? "s" : ""} in your description
					</h3>
					<p className="text-sm text-gray-600">
						Answer these follow-up questions to improve your FRD, or skip to generate now.
					</p>
				</div>
			</div>

			<div className="flex flex-col gap-3">
				{gaps.map((gap, index) => (
					<div
						key={`${gap.section}-${index}`}
						className="rounded-lg border border-gray-200 bg-white"
					>
						<button
							type="button"
							onClick={() => toggleCollapse(index)}
							className="flex w-full items-center justify-between p-4 text-left"
						>
							<div className="flex items-center gap-2">
								<AlertCircle
									className={clsx(
										"h-4 w-4",
										gap.importance === "high" && "text-red-500",
										gap.importance === "medium" && "text-amber-500",
										gap.importance === "low" && "text-blue-500",
									)}
								/>
								<span className="text-sm font-medium text-gray-900">{gap.section}</span>
								<span
									className={clsx(
										"rounded-full px-2 py-0.5 text-xs",
										gap.importance === "high" && "bg-red-100 text-red-700",
										gap.importance === "medium" && "bg-amber-100 text-amber-700",
										gap.importance === "low" && "bg-blue-100 text-blue-700",
									)}
								>
									{gap.importance}
								</span>
								{answers[index]?.trim() && (
									<span className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700">
										answered
									</span>
								)}
							</div>
							{collapsed[index] ? (
								<ChevronDown className="h-4 w-4 text-gray-400" />
							) : (
								<ChevronUp className="h-4 w-4 text-gray-400" />
							)}
						</button>

						{!collapsed[index] && (
							<div className="border-t border-gray-100 px-4 pb-4">
								<p className="mt-2 text-sm text-gray-600">{gap.description}</p>
								<label
									htmlFor={`gap-${index}`}
									className="mt-3 block text-sm font-medium text-gray-700"
								>
									{gap.followUpPrompt}
								</label>
								<textarea
									id={`gap-${index}`}
									value={answers[index] ?? ""}
									onChange={(e) => handleAnswerChange(index, e.target.value)}
									rows={3}
									className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
									placeholder="Your answer (optional)..."
								/>
							</div>
						)}
					</div>
				))}
			</div>

			<div className="flex flex-col gap-2 sm:flex-row sm:justify-between">
				<button
					type="button"
					onClick={onSkipAll}
					disabled={isSubmitting}
					className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-50"
				>
					Skip & Generate Now
				</button>
				<button
					type="submit"
					disabled={isSubmitting}
					className="rounded-lg bg-primary px-6 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-50"
				>
					{isSubmitting
						? "Generating..."
						: `Generate FRD${answeredCount > 0 ? ` (${answeredCount} answer${answeredCount !== 1 ? "s" : ""})` : ""}`}
				</button>
			</div>
		</form>
	);
}
