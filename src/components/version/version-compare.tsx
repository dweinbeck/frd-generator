"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface VersionCompareProps {
	leftMarkdown: string;
	rightMarkdown: string;
	leftLabel: string;
	rightLabel: string;
}

export function VersionCompare({
	leftMarkdown,
	rightMarkdown,
	leftLabel,
	rightLabel,
}: VersionCompareProps) {
	return (
		<div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
			<div className="rounded-lg border border-gray-200 p-4">
				<h3 className="mb-3 text-sm font-semibold text-gray-700 border-b pb-2">{leftLabel}</h3>
				<article className="prose prose-sm max-w-none">
					<ReactMarkdown remarkPlugins={[remarkGfm]}>{leftMarkdown}</ReactMarkdown>
				</article>
			</div>
			<div className="rounded-lg border border-gray-200 p-4">
				<h3 className="mb-3 text-sm font-semibold text-gray-700 border-b pb-2">{rightLabel}</h3>
				<article className="prose prose-sm max-w-none">
					<ReactMarkdown remarkPlugins={[remarkGfm]}>{rightMarkdown}</ReactMarkdown>
				</article>
			</div>
		</div>
	);
}
