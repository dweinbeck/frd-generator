"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { CopyButton } from "@/components/export/copy-button";
import { DownloadButton } from "@/components/export/download-button";

interface FrdDisplayProps {
	markdown: string;
	projectName: string;
}

function slugify(text: string): string {
	return text
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-|-$/g, "");
}

export function FrdDisplay({ markdown, projectName }: FrdDisplayProps) {
	return (
		<div className="w-full">
			<div className="flex flex-col sm:flex-row gap-2 sm:gap-4 mb-6">
				<CopyButton text={markdown} />
				<DownloadButton content={markdown} filename={`${slugify(projectName)}-frd.md`} />
			</div>

			<article className="prose prose-sm sm:prose-base lg:prose-lg max-w-none prose-headings:scroll-mt-20">
				<ReactMarkdown remarkPlugins={[remarkGfm]}>{markdown}</ReactMarkdown>
			</article>
		</div>
	);
}
