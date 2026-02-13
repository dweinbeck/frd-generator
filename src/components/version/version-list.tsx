"use client";

import { clsx } from "clsx";
import { formatDistanceToNow } from "date-fns";
import { Clock, GitBranch, Star } from "lucide-react";
import { useEffect, useState } from "react";
import { useAuthedFetch } from "@/hooks/use-authed-fetch";

function formatTimestamp(createdAt: string | null): string {
	if (!createdAt) return "";
	return formatDistanceToNow(new Date(createdAt), { addSuffix: true });
}

interface VersionSummary {
	id: string;
	versionNumber: number;
	mode: string;
	model: string;
	rating?: number;
	parentVersionId?: string;
	createdAt: string | null;
}

interface VersionListProps {
	projectId: string;
	activeVersionId?: string;
	onSelect: (versionId: string) => void;
}

export function VersionList({ projectId, activeVersionId, onSelect }: VersionListProps) {
	const [versions, setVersions] = useState<VersionSummary[]>([]);
	const [loading, setLoading] = useState(true);
	const authedFetch = useAuthedFetch();

	useEffect(() => {
		async function fetchVersions() {
			try {
				const res = await authedFetch(`/api/projects/${projectId}/versions`);
				if (res.ok) {
					const data = await res.json();
					setVersions(data.versions);
				}
			} finally {
				setLoading(false);
			}
		}
		fetchVersions();
	}, [projectId, authedFetch]);

	if (loading) {
		return <div className="animate-pulse text-sm text-gray-400">Loading versions...</div>;
	}

	if (versions.length === 0) {
		return <p className="text-sm text-gray-500">No versions yet.</p>;
	}

	return (
		<div className="flex flex-col gap-1">
			<h3 className="text-sm font-medium text-gray-700 mb-1">Version History</h3>
			{versions.map((v) => (
				<button
					key={v.id}
					type="button"
					onClick={() => onSelect(v.id)}
					className={clsx(
						"flex items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition-colors",
						"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
						activeVersionId === v.id
							? "bg-blue-50 text-gray-900 border border-primary"
							: "hover:bg-gray-50 text-gray-700",
					)}
				>
					<div className="flex items-center gap-2">
						<span className="font-medium">v{v.versionNumber}</span>
						{v.parentVersionId && (
							<span title="Iteration">
								<GitBranch className="h-3 w-3 text-gray-400" />
							</span>
						)}
						<span className="text-xs text-gray-400">{v.model}</span>
					</div>
					<div className="flex items-center gap-2">
						{v.rating && (
							<span className="flex items-center gap-0.5 text-xs text-yellow-600">
								<Star className="h-3 w-3 fill-yellow-400" />
								{v.rating}
							</span>
						)}
						<Clock className="h-3 w-3 text-gray-400" />
						<span className="text-xs text-gray-400">{formatTimestamp(v.createdAt)}</span>
					</div>
				</button>
			))}
		</div>
	);
}
