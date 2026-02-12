"use client";

import { clsx } from "clsx";
import { ClipboardList, Zap } from "lucide-react";
import type { GenerationMode } from "@/types";

interface ModeSelectorProps {
	value: GenerationMode;
	onChange: (mode: GenerationMode) => void;
}

const modes = [
	{
		id: "fast" as const,
		name: "Fast Mode",
		description: "Paste your brain dump and get an FRD in seconds",
		timeEstimate: "~10 seconds",
		icon: Zap,
		disabled: false,
		badge: null as string | null,
	},
	{
		id: "standard" as const,
		name: "Standard Mode",
		description: "Guided questions to build a comprehensive FRD",
		timeEstimate: "~5 minutes",
		icon: ClipboardList,
		disabled: true,
		badge: "Coming Soon" as string | null,
	},
];

export function ModeSelector({ value, onChange }: ModeSelectorProps) {
	return (
		<div className="grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Generation mode">
			{modes.map((mode) => {
				const Icon = mode.icon;
				const isSelected = value === mode.id;

				return (
					<label
						key={mode.id}
						className={clsx(
							"relative flex cursor-pointer flex-col gap-2 rounded-xl border-2 p-4 text-left transition-all",
							"focus-within:outline-none focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2",
							isSelected && !mode.disabled && "border-primary bg-blue-50",
							!isSelected && !mode.disabled && "border-gray-200 hover:border-gray-300",
							mode.disabled && "cursor-not-allowed border-gray-200 opacity-50",
						)}
					>
						<input
							type="radio"
							name="generation-mode"
							value={mode.id}
							checked={isSelected}
							disabled={mode.disabled}
							onChange={() => onChange(mode.id)}
							className="sr-only"
							aria-label={mode.name}
						/>
						<div className="flex items-center gap-2">
							<Icon className={clsx("h-5 w-5", isSelected ? "text-primary" : "text-gray-400")} />
							<span className="font-semibold text-gray-900">{mode.name}</span>
							{mode.badge && (
								<span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500">
									{mode.badge}
								</span>
							)}
						</div>
						<p className="text-sm text-gray-600">{mode.description}</p>
						<p className="text-xs text-gray-400">{mode.timeEstimate}</p>
					</label>
				);
			})}
		</div>
	);
}
