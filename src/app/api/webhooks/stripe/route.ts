import { NextResponse } from "next/server";
import { trackEvent } from "@/lib/analytics";
import { getDb } from "@/lib/db/admin";
import { addCredits } from "@/lib/db/credits";
import { createLogger } from "@/lib/logger";
import { getStripe } from "@/lib/stripe/config";

export async function POST(req: Request) {
	const logger = createLogger();

	try {
		const body = await req.text();
		const signature = req.headers.get("stripe-signature");

		if (!signature) {
			return NextResponse.json({ error: "Missing signature" }, { status: 400 });
		}

		const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
		if (!webhookSecret) {
			logger.error("STRIPE_WEBHOOK_SECRET not configured");
			return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
		}

		const stripe = getStripe();
		const event = stripe.webhooks.constructEvent(body, signature, webhookSecret);

		if (event.type === "checkout.session.completed") {
			const session = event.data.object;
			const userId = session.metadata?.userId;
			const credits = Number.parseInt(session.metadata?.credits ?? "0", 10);
			const packageLabel = session.metadata?.packageLabel ?? "";

			if (userId && credits > 0) {
				// Check for duplicate webhook delivery (idempotency)
				const db = getDb();
				const existingTx = await db
					.collection("credit_transactions")
					.where("metadata.stripeSessionId", "==", session.id)
					.limit(1)
					.get();

				if (!existingTx.empty) {
					logger.info("Duplicate Stripe webhook, skipping credit addition", {
						metadata: { sessionId: session.id, userId },
					});
					return NextResponse.json({ received: true });
				}

				await addCredits(userId, credits, {
					stripeSessionId: session.id,
					reason: "purchase",
				});

				trackEvent(
					userId,
					{
						event: "credits_purchased",
						amount: credits,
						packageLabel,
					},
					logger.correlationId,
				);

				logger.info("Credits added after Stripe checkout", {
					userId,
					metadata: { credits, sessionId: session.id },
				});
			}
		}

		return NextResponse.json({ received: true });
	} catch (error) {
		logger.error("Stripe webhook failed", {
			metadata: { error: error instanceof Error ? error.message : "Unknown error" },
		});
		return NextResponse.json({ error: "Webhook processing failed" }, { status: 400 });
	}
}
