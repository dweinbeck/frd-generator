import "server-only";
import { type App, cert, getApps, initializeApp } from "firebase-admin/app";
import { type Firestore, getFirestore } from "firebase-admin/firestore";

let app: App;
let db: Firestore;

function getAdminApp(): App {
	if (getApps().length > 0) {
		return getApps()[0];
	}

	const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

	app = initializeApp({
		credential: cert({
			projectId: process.env.FIREBASE_PROJECT_ID,
			clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
			privateKey,
		}),
	});

	return app;
}

export function getDb(): Firestore {
	if (!db) {
		const adminApp = getAdminApp();
		db = getFirestore(adminApp);
	}
	return db;
}
