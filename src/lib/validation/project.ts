import { z } from "zod/v4";

export const CreateProjectSchema = z.object({
	name: z
		.string()
		.min(1, "Project name is required")
		.max(100, "Project name must be 100 characters or fewer"),
	mode: z.enum(["fast", "standard"]),
});

export type CreateProjectInput = z.infer<typeof CreateProjectSchema>;
