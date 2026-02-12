"use client";

import { useCallback, useState } from "react";

export function useCopyToClipboard() {
	const [isCopied, setIsCopied] = useState(false);

	const copy = useCallback(async (text: string) => {
		if (!navigator.clipboard) {
			return false;
		}

		try {
			await navigator.clipboard.writeText(text);
			setIsCopied(true);
			setTimeout(() => setIsCopied(false), 2000);
			return true;
		} catch {
			setIsCopied(false);
			return false;
		}
	}, []);

	return { isCopied, copy };
}
