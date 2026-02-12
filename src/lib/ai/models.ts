import "server-only";
import { google } from "@ai-sdk/google";

export const MODELS = {
	"gemini-2.5-flash": {
		id: "gemini-2.5-flash",
		name: "Gemini 2.5 Flash",
		description: "Fast and cost-effective. Great for most FRD generations.",
		maxOutputTokens: 8192,
	},
	// Note: ID may change to "gemini-3-pro" when model reaches GA
	"gemini-3-pro-preview": {
		id: "gemini-3-pro-preview",
		name: "Gemini 3 Pro",
		description: "Premium model for complex requirements and deeper analysis.",
		maxOutputTokens: 16384,
	},
} as const;

export type ModelId = keyof typeof MODELS;

export function getModel(modelId: string) {
	const id = modelId in MODELS ? (modelId as ModelId) : "gemini-2.5-flash";
	return google(MODELS[id].id);
}
