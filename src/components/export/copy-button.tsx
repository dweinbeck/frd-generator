"use client";

import { Check, Copy } from "lucide-react";
import { useCopyToClipboard } from "@/hooks/use-copy-to-clipboard";

interface CopyButtonProps {
	text: string;
}

export function CopyButton({ text }: CopyButtonProps) {
	const { isCopied, copy } = useCopyToClipboard();

	return (
		<button
			type="button"
			onClick={() => copy(text)}
			className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
			aria-label="Copy FRD markdown to clipboard"
		>
			{isCopied ? (
				<>
					<Check className="h-4 w-4 text-green-600" />
					<span>Copied!</span>
				</>
			) : (
				<>
					<Copy className="h-4 w-4" />
					<span>Copy Markdown</span>
				</>
			)}
		</button>
	);
}
