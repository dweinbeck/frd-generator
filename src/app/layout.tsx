import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ConsentBanner } from "@/components/consent/consent-banner";
import { AppHeader } from "@/components/layout/app-header";
import { AuthProvider } from "@/lib/firebase/auth-context";
import "./globals.css";

const inter = Inter({
	subsets: ["latin"],
	variable: "--font-inter",
});

export const metadata: Metadata = {
	title: "FRD Generator",
	description: "Generate Claude Code-ready Functional Requirements Documents from your ideas",
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="en">
			<body className={`${inter.variable} font-sans antialiased`}>
				<AuthProvider>
					<AppHeader />
					<main className="min-h-screen">{children}</main>
					<ConsentBanner />
				</AuthProvider>
			</body>
		</html>
	);
}
