"use client";

import { clsx } from "clsx";

interface ModelSelectorProps {
	value: string;
	onChange: (modelId: string) => void;
}

const models = [
	{
		id: "gemini-2.5-flash",
		name: "Gemini 2.5 Flash",
		description: "Fast and cost-effective",
		badge: "Default",
	},
	{
		id: "gemini-3-pro-preview",
		name: "Gemini 3 Pro",
		description: "Premium, deeper analysis",
		badge: "Premium",
	},
];

export function ModelSelector({ value, onChange }: ModelSelectorProps) {
	return (
		<div className="flex gap-2">
			{models.map((model) => (
				<button
					key={model.id}
					type="button"
					onClick={() => onChange(model.id)}
					className={clsx(
						"flex-1 rounded-lg border px-3 py-2 text-left text-sm transition-all",
						"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
						value === model.id
							? "border-primary bg-blue-50 text-gray-900"
							: "border-gray-200 text-gray-600 hover:border-gray-300",
					)}
				>
					<div className="flex items-center justify-between">
						<span className="font-medium">{model.name}</span>
						<span
							className={clsx(
								"rounded-full px-2 py-0.5 text-xs",
								model.badge === "Default"
									? "bg-green-100 text-green-700"
									: "bg-purple-100 text-purple-700",
							)}
						>
							{model.badge}
						</span>
					</div>
					<p className="mt-0.5 text-xs text-gray-500">{model.description}</p>
				</button>
			))}
		</div>
	);
}
