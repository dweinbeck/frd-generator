"use client";

import { FileText } from "lucide-react";
import { useEffect, useState } from "react";

const statusMessages = [
	"Analyzing your input...",
	"Identifying requirements...",
	"Building user personas...",
	"Structuring document...",
	"Setting priorities...",
	"Generating acceptance criteria...",
	"Finalizing FRD...",
];

export function GenerationProgress() {
	const [messageIndex, setMessageIndex] = useState(0);

	useEffect(() => {
		const interval = setInterval(() => {
			setMessageIndex((prev) => (prev + 1) % statusMessages.length);
		}, 3500);
		return () => clearInterval(interval);
	}, []);

	return (
		<div className="flex flex-col items-center justify-center gap-6 py-16">
			<div className="relative">
				<FileText className="h-12 w-12 text-primary animate-pulse" />
			</div>
			<div className="text-center">
				<h2 className="text-lg font-semibold text-gray-900 mb-2">Generating your FRD...</h2>
				<p className="text-sm text-gray-500 transition-opacity duration-300">
					{statusMessages[messageIndex]}
				</p>
			</div>
		</div>
	);
}
