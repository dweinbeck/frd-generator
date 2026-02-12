import "server-only";
import { nanoid } from "nanoid";

type LogLevel = "info" | "warn" | "error";

interface LogEntry {
	level: LogLevel;
	message: string;
	correlationId: string;
	userId?: string;
	action?: string;
	metadata?: Record<string, unknown>;
	timestamp: string;
}

/**
 * Structured logger with correlation IDs (OBS-01).
 * AUTH-06: Never include prompt content, brain dump, or FRD content in logs.
 */
export function createLogger(correlationId?: string) {
	const id = correlationId ?? nanoid(12);

	function log(
		level: LogLevel,
		message: string,
		data?: Omit<LogEntry, "level" | "message" | "correlationId" | "timestamp">,
	) {
		const entry: LogEntry = {
			level,
			message,
			correlationId: id,
			timestamp: new Date().toISOString(),
			...data,
		};

		// AUTH-06: Strip any fields that could contain sensitive content
		const safeEntry = { ...entry };
		if (safeEntry.metadata) {
			const {
				brainDump: _b,
				prompt: _p,
				content: _c,
				composedPrompt: _cp,
				...safeMeta
			} = safeEntry.metadata as Record<string, unknown>;
			safeEntry.metadata = safeMeta;
		}

		const output = JSON.stringify(safeEntry);

		switch (level) {
			case "error":
				console.error(output);
				break;
			case "warn":
				console.warn(output);
				break;
			default:
				console.log(output);
		}
	}

	return {
		correlationId: id,
		info: (
			message: string,
			data?: Omit<LogEntry, "level" | "message" | "correlationId" | "timestamp">,
		) => log("info", message, data),
		warn: (
			message: string,
			data?: Omit<LogEntry, "level" | "message" | "correlationId" | "timestamp">,
		) => log("warn", message, data),
		error: (
			message: string,
			data?: Omit<LogEntry, "level" | "message" | "correlationId" | "timestamp">,
		) => log("error", message, data),
	};
}
