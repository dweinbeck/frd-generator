import { NextResponse } from "next/server";
import { z } from "zod/v4";
import { requireAuth } from "@/lib/auth/require-auth";
import { CREDIT_PACKAGES, getStripe } from "@/lib/stripe/config";

const CheckoutSchema = z.object({
	packageIndex: z
		.number()
		.int()
		.min(0)
		.max(CREDIT_PACKAGES.length - 1),
});

export async function POST(req: Request) {
	const auth = await requireAuth(req);
	if (auth instanceof NextResponse) return auth;

	try {
		const body = await req.json();
		const input = CheckoutSchema.parse(body);
		const pkg = CREDIT_PACKAGES[input.packageIndex];

		const stripe = getStripe();

		const session = await stripe.checkout.sessions.create({
			mode: "payment",
			payment_method_types: ["card"],
			line_items: [
				{
					price_data: {
						currency: "usd",
						product_data: {
							name: `FRD Generator - ${pkg.label}`,
							description: `${pkg.credits} generation credits`,
						},
						unit_amount: pkg.priceInCents,
					},
					quantity: 1,
				},
			],
			metadata: {
				userId: auth.userId,
				credits: String(pkg.credits),
				packageLabel: pkg.label,
			},
			success_url: `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}?checkout=success`,
			cancel_url: `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}?checkout=cancel`,
		});

		return NextResponse.json({ url: session.url });
	} catch (error) {
		if (error instanceof Error && error.name === "ZodError") {
			return NextResponse.json({ error: "Invalid package selection" }, { status: 400 });
		}
		console.error("Checkout failed:", {
			error: error instanceof Error ? error.message : "Unknown error",
		});
		return NextResponse.json({ error: "Failed to create checkout session" }, { status: 500 });
	}
}
