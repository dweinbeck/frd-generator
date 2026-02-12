"use client";

import { ChevronLeft, ChevronRight, SkipForward } from "lucide-react";
import { useState } from "react";
import { STANDARD_MODE_QUESTIONS } from "@/lib/standard-mode-questions";
import type { GuidedAnswer } from "@/types";

interface StandardModeFlowProps {
	onSubmit: (answers: GuidedAnswer[]) => void;
	isSubmitting: boolean;
}

export function StandardModeFlow({ onSubmit, isSubmitting }: StandardModeFlowProps) {
	const [currentIndex, setCurrentIndex] = useState(0);
	const [answers, setAnswers] = useState<Record<string, string>>({});

	const currentQuestion = STANDARD_MODE_QUESTIONS[currentIndex];
	const totalQuestions = STANDARD_MODE_QUESTIONS.length;
	const isLast = currentIndex === totalQuestions - 1;

	function handleAnswerChange(value: string) {
		setAnswers((prev) => ({ ...prev, [currentQuestion.id]: value }));
	}

	function handleNext() {
		if (isLast) {
			handleFinish();
		} else {
			setCurrentIndex((prev) => prev + 1);
		}
	}

	function handlePrev() {
		setCurrentIndex((prev) => Math.max(0, prev - 1));
	}

	function handleSkip() {
		if (isLast) {
			handleFinish();
		} else {
			setCurrentIndex((prev) => prev + 1);
		}
	}

	function handleFinish() {
		const guidedAnswers: GuidedAnswer[] = [];
		for (const question of STANDARD_MODE_QUESTIONS) {
			const answer = answers[question.id]?.trim();
			if (answer) {
				guidedAnswers.push({
					section: question.section,
					question: question.question,
					answer,
				});
			}
		}
		onSubmit(guidedAnswers);
	}

	const answeredCount = Object.values(answers).filter((a) => a?.trim()).length;
	const currentAnswer = answers[currentQuestion.id] ?? "";

	return (
		<div className="flex flex-col gap-6">
			<div>
				<div className="mb-4 flex items-center justify-between">
					<span className="text-sm text-gray-500">
						Question {currentIndex + 1} of {totalQuestions}
					</span>
					<span className="text-sm text-gray-500">{answeredCount} answered</span>
				</div>
				<div className="h-1 w-full rounded-full bg-gray-200">
					<div
						className="h-1 rounded-full bg-primary transition-all"
						style={{ width: `${((currentIndex + 1) / totalQuestions) * 100}%` }}
					/>
				</div>
			</div>

			<div>
				<div className="mb-1 flex items-center gap-2">
					<span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
						{currentQuestion.section}
					</span>
					{currentQuestion.required && <span className="text-xs text-red-500">Required</span>}
				</div>
				<label htmlFor="guided-answer" className="block text-base font-medium text-gray-900">
					{currentQuestion.question}
				</label>
				<textarea
					id="guided-answer"
					value={currentAnswer}
					onChange={(e) => handleAnswerChange(e.target.value)}
					rows={5}
					placeholder={currentQuestion.placeholder}
					className="mt-2 w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 placeholder:text-gray-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 resize-y"
				/>
			</div>

			<div className="flex items-center justify-between">
				<button
					type="button"
					onClick={handlePrev}
					disabled={currentIndex === 0}
					className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
				>
					<ChevronLeft className="h-4 w-4" />
					Previous
				</button>

				<div className="flex gap-2">
					{!currentQuestion.required && (
						<button
							type="button"
							onClick={handleSkip}
							className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-500 transition-colors hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
						>
							<SkipForward className="h-4 w-4" />
							Skip
						</button>
					)}

					{isLast ? (
						<button
							type="button"
							onClick={handleFinish}
							disabled={isSubmitting}
							className="rounded-lg bg-primary px-6 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-dark disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
						>
							{isSubmitting ? "Generating..." : "Generate FRD"}
						</button>
					) : (
						<button
							type="button"
							onClick={handleNext}
							className="inline-flex items-center gap-1 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
						>
							Next
							<ChevronRight className="h-4 w-4" />
						</button>
					)}
				</div>
			</div>
		</div>
	);
}
