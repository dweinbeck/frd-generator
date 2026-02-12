"use client";

import { Star } from "lucide-react";
import { useState } from "react";
import { useAuthedFetch } from "@/hooks/use-authed-fetch";

interface RatingWidgetProps {
	projectId: string;
	versionId: string;
	initialRating?: number;
}

export function RatingWidget({ projectId, versionId, initialRating }: RatingWidgetProps) {
	const [rating, setRating] = useState(initialRating ?? 0);
	const [hoverRating, setHoverRating] = useState(0);
	const [submitted, setSubmitted] = useState(!!initialRating);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const authedFetch = useAuthedFetch();

	async function handleSubmit(value: number) {
		setRating(value);
		setIsSubmitting(true);

		try {
			const res = await authedFetch(`/api/projects/${projectId}/versions/${versionId}/rating`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ rating: value }),
			});

			if (res.ok) {
				setSubmitted(true);
			}
		} finally {
			setIsSubmitting(false);
		}
	}

	const displayRating = hoverRating || rating;
	const stars = [1, 2, 3, 4, 5];

	return (
		<div className="flex flex-col items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 p-4">
			<p className="text-sm font-medium text-gray-700">
				How well did the generator help you produce an FRD?
			</p>
			<div className="flex gap-1">
				{stars.map((star) => {
					const halfValue = star - 0.5;
					return (
						<div key={star} className="relative">
							{/* Half star hit area */}
							<button
								type="button"
								className="absolute left-0 top-0 h-full w-1/2 z-10 cursor-pointer"
								onClick={() => handleSubmit(halfValue)}
								onMouseEnter={() => setHoverRating(halfValue)}
								onMouseLeave={() => setHoverRating(0)}
								disabled={isSubmitting}
								aria-label={`Rate ${halfValue} stars`}
							/>
							{/* Full star hit area */}
							<button
								type="button"
								className="absolute right-0 top-0 h-full w-1/2 z-10 cursor-pointer"
								onClick={() => handleSubmit(star)}
								onMouseEnter={() => setHoverRating(star)}
								onMouseLeave={() => setHoverRating(0)}
								disabled={isSubmitting}
								aria-label={`Rate ${star} stars`}
							/>
							<Star
								className={`h-8 w-8 transition-colors ${
									displayRating >= star
										? "fill-yellow-400 text-yellow-400"
										: displayRating >= halfValue
											? "fill-yellow-400/50 text-yellow-400"
											: "text-gray-300"
								}`}
							/>
						</div>
					);
				})}
			</div>
			{submitted && <p className="text-xs text-green-600">Rating saved: {rating} / 5</p>}
		</div>
	);
}
