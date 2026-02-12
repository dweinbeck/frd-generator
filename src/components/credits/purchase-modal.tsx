"use client";

import { useState } from "react";
import { useAuthedFetch } from "@/hooks/use-authed-fetch";

const PACKAGES = [
	{ credits: 100, price: "$4.99", label: "100 credits", index: 0 },
	{ credits: 500, price: "$19.99", label: "500 credits", index: 1 },
	{ credits: 1500, price: "$49.99", label: "1,500 credits", index: 2 },
];

interface PurchaseModalProps {
	onClose: () => void;
}

export function PurchaseModal({ onClose }: PurchaseModalProps) {
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState("");
	const authedFetch = useAuthedFetch();

	async function handlePurchase(packageIndex: number) {
		setIsLoading(true);
		setError("");

		try {
			const res = await authedFetch("/api/credits/checkout", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ packageIndex }),
			});

			if (!res.ok) {
				const data = await res.json();
				throw new Error(data.error || "Checkout failed");
			}

			const data = await res.json();
			if (data.url) {
				window.location.href = data.url;
			}
		} catch (err) {
			setError(err instanceof Error ? err.message : "Checkout failed");
			setIsLoading(false);
		}
	}

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
			<div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
				<div className="flex items-center justify-between mb-4">
					<h2 className="text-lg font-semibold text-gray-900">Buy Credits</h2>
					<button
						type="button"
						onClick={onClose}
						className="text-gray-400 hover:text-gray-600 text-xl leading-none"
						aria-label="Close"
					>
						&times;
					</button>
				</div>

				<p className="text-sm text-gray-600 mb-4">
					Initial generation costs 50 credits. Each iteration costs 25 credits.
				</p>

				{error && (
					<div role="alert" className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
						{error}
					</div>
				)}

				<div className="flex flex-col gap-3">
					{PACKAGES.map((pkg) => (
						<button
							key={pkg.index}
							type="button"
							onClick={() => handlePurchase(pkg.index)}
							disabled={isLoading}
							className="flex items-center justify-between rounded-lg border border-gray-200 px-4 py-3 text-left transition-colors hover:border-primary hover:bg-blue-50 disabled:opacity-50"
						>
							<div>
								<span className="text-sm font-medium text-gray-900">{pkg.label}</span>
							</div>
							<span className="text-sm font-semibold text-primary">{pkg.price}</span>
						</button>
					))}
				</div>
			</div>
		</div>
	);
}
