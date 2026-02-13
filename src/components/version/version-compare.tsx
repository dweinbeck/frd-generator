"use client";

import dynamic from "next/dynamic";
import { DiffMethod } from "react-diff-viewer-continued";

const ReactDiffViewer = dynamic(() => import("react-diff-viewer-continued"), {
	ssr: false,
	loading: () => (
		<div className="animate-pulse text-sm text-gray-400 p-4">Loading diff viewer...</div>
	),
});

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
		<div className="rounded-lg border border-gray-200 overflow-hidden">
			<div className="flex border-b border-gray-200 bg-gray-50">
				<div className="flex-1 px-4 py-2 text-sm font-semibold text-gray-700">{leftLabel}</div>
				<div className="flex-1 px-4 py-2 text-sm font-semibold text-gray-700">{rightLabel}</div>
			</div>
			<ReactDiffViewer
				oldValue={leftMarkdown}
				newValue={rightMarkdown}
				splitView={true}
				compareMethod={DiffMethod.WORDS}
				useDarkTheme={false}
				hideLineNumbers={true}
			/>
		</div>
	);
}
