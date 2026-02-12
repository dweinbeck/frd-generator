"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { GenerationFlow } from "@/components/generation/generation-flow";
import { GenerationProgress } from "@/components/generation/generation-progress";
import { ProjectView } from "@/components/version/project-view";
import { useAuthedFetch } from "@/hooks/use-authed-fetch";
import { useAuth } from "@/lib/firebase/auth-context";
import type { GenerationMode } from "@/types";

interface ProjectData {
	id: string;
	name: string;
	mode: GenerationMode;
	versionCount: number;
}

interface VersionData {
	id: string;
	content: string;
	rating?: number;
}

export default function ProjectPage() {
	const params = useParams<{ projectId: string }>();
	const router = useRouter();
	const { user, loading: authLoading } = useAuth();
	const authedFetch = useAuthedFetch();
	const [project, setProject] = useState<ProjectData | null>(null);
	const [latestVersion, setLatestVersion] = useState<VersionData | null>(null);
	const [loading, setLoading] = useState(true);
	const [notFound, setNotFound] = useState(false);

	useEffect(() => {
		if (authLoading) return;
		if (!user) {
			router.push("/sign-in");
			return;
		}

		async function fetchProject() {
			try {
				const res = await authedFetch(`/api/projects/${params.projectId}`);
				if (res.status === 404) {
					setNotFound(true);
					return;
				}
				if (res.status === 401) {
					router.push("/sign-in");
					return;
				}
				if (res.ok) {
					const data = await res.json();
					setProject(data.project);
					setLatestVersion(data.latestVersion);
				}
			} finally {
				setLoading(false);
			}
		}
		fetchProject();
	}, [params.projectId, user, authLoading, authedFetch, router]);

	if (authLoading || loading) {
		return (
			<div className="min-h-screen px-4 py-8 sm:px-6 lg:px-8">
				<div className="mx-auto max-w-5xl">
					<GenerationProgress />
				</div>
			</div>
		);
	}

	if (notFound || !project) {
		return (
			<div className="min-h-screen px-4 py-8 sm:px-6 lg:px-8">
				<div className="mx-auto max-w-5xl text-center">
					<h1 className="text-2xl font-bold text-gray-900">Project Not Found</h1>
					<p className="mt-2 text-gray-600">
						This project doesn&apos;t exist or you don&apos;t have access.
					</p>
					<Link href="/" className="mt-4 inline-block text-sm text-primary hover:underline">
						Go Home
					</Link>
				</div>
			</div>
		);
	}

	const hasExistingFRD = latestVersion && typeof latestVersion.content === "string";

	return (
		<div className="min-h-screen px-4 py-8 sm:px-6 lg:px-8">
			<div className="mx-auto max-w-5xl">
				<div className="mb-6 flex items-center justify-between">
					<div>
						<Link href="/" className="text-sm text-gray-500 hover:text-gray-700 transition-colors">
							&larr; Back to Home
						</Link>
						<h1 className="mt-1 text-2xl font-bold text-gray-900 sm:text-3xl">{project.name}</h1>
					</div>
				</div>

				{hasExistingFRD ? (
					<ProjectView
						projectId={params.projectId}
						projectName={project.name}
						initialMarkdown={latestVersion.content}
						initialVersionId={latestVersion.id}
						initialRating={latestVersion.rating}
						mode={project.mode}
					/>
				) : (
					<GenerationFlow
						projectId={params.projectId}
						projectName={project.name}
						mode={project.mode}
					/>
				)}
			</div>
		</div>
	);
}
