"use client";

import { useEffect, useState } from "react";
import { useAuthedFetch } from "@/hooks/use-authed-fetch";

interface CreditDisplayProps {
	onPurchase: () => void;
}

export function CreditDisplay({ onPurchase }: CreditDisplayProps) {
	const [balance, setBalance] = useState<number | null>(null);
	const authedFetch = useAuthedFetch();

	useEffect(() => {
		async function fetchBalance() {
			try {
				const res = await authedFetch("/api/credits");
				if (res.ok) {
					const data = await res.json();
					setBalance(data.balance);
				}
			} catch {
				// Silently fail — credit display is non-critical
			}
		}
		fetchBalance();
	}, [authedFetch]);

	if (balance === null) {
		return null;
	}

	return (
		<div className="flex items-center gap-3">
			<span className="text-sm text-gray-600">
				<span className="font-medium">{balance}</span> credits
			</span>
			<button
				type="button"
				onClick={onPurchase}
				className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-dark transition-colors"
			>
				Buy Credits
			</button>
		</div>
	);
}
