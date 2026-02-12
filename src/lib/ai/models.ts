import "server-only";
import { google } from "@ai-sdk/google";

export const MODELS = {
	"gemini-2.5-flash": {
		id: "gemini-2.5-flash",
		name: "Gemini 2.5 Flash",
		description: "Fast and cost-effective. Great for most FRD generations.",
		maxOutputTokens: 8192,
	},
	"gemini-3-pro": {
		id: "gemini-3-pro",
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
