"use client";

import type { User } from "firebase/auth";
import { onAuthStateChanged } from "firebase/auth";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { getFirebaseAuth } from "./config";

interface AuthContextValue {
	user: User | null;
	loading: boolean;
	getIdToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextValue>({
	user: null,
	loading: true,
	getIdToken: async () => null,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
	const [user, setUser] = useState<User | null>(null);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		const auth = getFirebaseAuth();
		const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
			setUser(firebaseUser);
			setLoading(false);
		});

		return unsubscribe;
	}, []);

	const value = useMemo(
		() => ({
			user,
			loading,
			getIdToken: async () => {
				if (!user) return null;
				return user.getIdToken();
			},
		}),
		[user, loading],
	);

	return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
	return useContext(AuthContext);
}
