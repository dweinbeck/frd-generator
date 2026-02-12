import type { StandardModeQuestion } from "@/types";

export const STANDARD_MODE_QUESTIONS: StandardModeQuestion[] = [
	{
		id: "project-overview",
		section: "Overview",
		question: "What is your project? Describe it in 2-3 sentences.",
		placeholder: "e.g., A web app that helps small businesses track their inventory and sales...",
		required: true,
	},
	{
		id: "problem",
		section: "Overview",
		question: "What problem does it solve? Why does this project need to exist?",
		placeholder:
			"e.g., Small businesses currently use spreadsheets to track inventory, which is error-prone and doesn't scale...",
		required: true,
	},
	{
		id: "users",
		section: "Personas",
		question: "Who will use this product? Describe your target users.",
		placeholder:
			"e.g., Store owners who manage inventory, Employees who process sales, Accountants who need reports...",
		required: true,
	},
	{
		id: "key-features",
		section: "Requirements",
		question: "What are the most important features? List the key things users need to do.",
		placeholder:
			"e.g., Add/edit products, Track stock levels, Process sales transactions, Generate inventory reports...",
		required: true,
	},
	{
		id: "secondary-features",
		section: "Requirements",
		question: "Are there any nice-to-have features that aren't critical for launch?",
		placeholder:
			"e.g., Barcode scanning, Multi-location support, Integration with accounting software...",
		required: false,
	},
	{
		id: "constraints",
		section: "Constraints",
		question: "Are there any technical, business, or timeline constraints?",
		placeholder:
			"e.g., Must work on mobile devices, Budget under $10k, Need to launch in 3 months, Must integrate with existing POS system...",
		required: false,
	},
	{
		id: "out-of-scope",
		section: "Out of Scope",
		question: "Is there anything this project should explicitly NOT do?",
		placeholder:
			"e.g., No accounting features, No e-commerce/online sales, No customer-facing portal...",
		required: false,
	},
	{
		id: "existing-systems",
		section: "Constraints",
		question: "Are there any existing systems or tools this needs to work with?",
		placeholder:
			"e.g., QuickBooks for accounting, Shopify for online sales, Google Workspace for team communication...",
		required: false,
	},
];
