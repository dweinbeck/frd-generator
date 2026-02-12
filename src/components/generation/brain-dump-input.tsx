"use client";

import { useEffect, useRef, useState } from "react";

interface BrainDumpInputProps {
	onSubmit: (brainDump: string) => void;
	error?: string;
	maxLength?: number;
	isSubmitting?: boolean;
}

const MIN_LENGTH = 50;
const DEFAULT_MAX_LENGTH = 15000;

export function BrainDumpInput({
	onSubmit,
	error,
	maxLength = DEFAULT_MAX_LENGTH,
	isSubmitting = false,
}: BrainDumpInputProps) {
	const [text, setText] = useState("");
	const textareaRef = useRef<HTMLTextAreaElement>(null);

	useEffect(() => {
		textareaRef.current?.focus();
	}, []);

	const isUnderMin = text.length < MIN_LENGTH;
	const isOverMax = text.length > maxLength;
	const canSubmit = !isUnderMin && !isOverMax && !isSubmitting;

	function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		if (canSubmit) {
			onSubmit(text);
		}
	}

	return (
		<form onSubmit={handleSubmit} className="flex flex-col gap-4">
			<div>
				<label htmlFor="brain-dump" className="block text-sm font-medium text-gray-700 mb-1">
					Describe your project idea
				</label>
				<textarea
					ref={textareaRef}
					id="brain-dump"
					value={text}
					onChange={(e) => setText(e.target.value)}
					placeholder="Tell us about your project idea. What problem does it solve? Who uses it? What are the key features? Include as much detail as you can..."
					rows={10}
					maxLength={maxLength + 100}
					className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 placeholder:text-gray-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 resize-y min-h-[160px]"
					aria-describedby="char-count brain-dump-error"
				/>
				<div className="mt-1 flex items-center justify-between">
					<div>
						{isUnderMin && text.length > 0 && (
							<p className="text-xs text-amber-600">
								Minimum 50 characters ({MIN_LENGTH - text.length} more needed)
							</p>
						)}
					</div>
					<p id="char-count" className={`text-xs ${isOverMax ? "text-red-600" : "text-gray-400"}`}>
						{text.length.toLocaleString()}/{maxLength.toLocaleString()}
					</p>
				</div>
			</div>

			{error && (
				<div
					id="brain-dump-error"
					role="alert"
					className="rounded-lg bg-red-50 p-3 text-sm text-red-700"
				>
					{error}
				</div>
			)}

			<button
				type="submit"
				disabled={!canSubmit}
				className="rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
			>
				{isSubmitting ? "Generating..." : "Generate FRD"}
			</button>
		</form>
	);
}
