export type GenerationMode = "fast" | "standard";

export interface Project {
	id: string;
	name: string;
	userId: string;
	mode: GenerationMode;
	latestVersionId: string | null;
	versionCount: number;
	createdAt: Date;
	updatedAt: Date;
}

export interface Version {
	id: string;
	projectId: string;
	versionNumber: number;
	content: string;
	structuredData: Record<string, unknown>;
	mode: GenerationMode;
	model: string;
	tokensUsed: number;
	metadata: {
		promptTokens: number;
		completionTokens: number;
		generationTimeMs: number;
	};
	createdAt: Date;
}

export interface FollowUpAnswer {
	section: string;
	question: string;
	answer: string;
}

export interface GenerationInput {
	projectId: string;
	projectName: string;
	brainDump: string;
	mode: GenerationMode;
	followUpAnswers?: FollowUpAnswer[];
	guidedAnswers?: GuidedAnswer[];
	modelId?: string;
	iterationFeedback?: string;
	parentVersionContent?: string;
}

export interface GuidedAnswer {
	section: string;
	question: string;
	answer: string;
}

export interface StandardModeQuestion {
	id: string;
	section: string;
	question: string;
	placeholder: string;
	required: boolean;
}
