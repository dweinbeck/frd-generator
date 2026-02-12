"use client";

import { Download } from "lucide-react";

interface DownloadButtonProps {
	content: string;
	filename: string;
}

export function DownloadButton({ content, filename }: DownloadButtonProps) {
	function handleDownload() {
		const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
		const url = URL.createObjectURL(blob);
		const link = document.createElement("a");
		link.href = url;
		link.download = filename;
		link.click();
		URL.revokeObjectURL(url);
	}

	return (
		<button
			type="button"
			onClick={handleDownload}
			className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
			aria-label="Download FRD as markdown file"
		>
			<Download className="h-4 w-4" />
			<span>Download .md</span>
		</button>
	);
}
