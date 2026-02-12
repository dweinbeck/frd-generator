"use client";

import { signOut } from "firebase/auth";
import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/lib/firebase/auth-context";
import { getFirebaseAuth } from "@/lib/firebase/config";
import { CreditDisplay } from "../credits/credit-display";
import { PurchaseModal } from "../credits/purchase-modal";

export function AppHeader() {
	const { user } = useAuth();
	const router = useRouter();
	const [showPurchase, setShowPurchase] = useState(false);

	if (!user) return null;

	async function handleSignOut() {
		const auth = getFirebaseAuth();
		await signOut(auth);
		router.push("/sign-in");
	}

	return (
		<>
			<header className="border-b border-gray-200 bg-white px-4 py-3 sm:px-6">
				<div className="mx-auto flex max-w-5xl items-center justify-between">
					<span className="text-sm font-semibold text-gray-900">FRD Generator</span>
					<div className="flex items-center gap-4">
						<CreditDisplay onPurchase={() => setShowPurchase(true)} />
						<span className="text-xs text-gray-400 hidden sm:inline">{user.email}</span>
						<button
							type="button"
							onClick={handleSignOut}
							className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition-colors"
							aria-label="Sign out"
						>
							<LogOut className="h-4 w-4" />
						</button>
					</div>
				</div>
			</header>
			{showPurchase && <PurchaseModal onClose={() => setShowPurchase(false)} />}
		</>
	);
}
