import "server-only";
import Stripe from "stripe";

let stripeInstance: Stripe;

export function getStripe(): Stripe {
	if (!stripeInstance) {
		const secretKey = process.env.STRIPE_SECRET_KEY;
		if (!secretKey) {
			throw new Error("STRIPE_SECRET_KEY is not set");
		}
		stripeInstance = new Stripe(secretKey, {
			typescript: true,
		});
	}
	return stripeInstance;
}

export const CREDIT_COSTS = {
	initial: 50,
	iteration: 25,
} as const;

export const CREDIT_PACKAGES = [
	{ credits: 100, priceInCents: 499, label: "100 credits" },
	{ credits: 500, priceInCents: 1999, label: "500 credits" },
	{ credits: 1500, priceInCents: 4999, label: "1,500 credits" },
] as const;
