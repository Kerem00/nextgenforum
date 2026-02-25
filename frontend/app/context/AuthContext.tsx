import React, { createContext, useContext, useState, useEffect } from "react";
import type { ReactNode } from "react";
import { postsClient } from "../api";

export type User = {
    id: number;
    email: string;
    full_name: string;
};

type AuthContextType = {
    user: User | null;
    token: string | null;
    login: (token: string, userId: number | null) => void;
    logout: () => void;
    isLoading: boolean;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Helper to decode JWT
function parseJwt(token: string) {
    try {
        return JSON.parse(atob(token.split('.')[1]));
    } catch (e) {
        return null;
    }
}

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const storedToken = localStorage.getItem("token");
        let storedUserId = localStorage.getItem("user_id");

        if (storedToken) {
            if (!storedUserId) {
                const decoded = parseJwt(storedToken);
                if (decoded) {
                    storedUserId = decoded.user_id?.toString() || decoded.sub;
                    localStorage.setItem("user_id", storedUserId as string);
                }
            }

            if (storedUserId) {
                setToken(storedToken);
                postsClient.get(`/users/${storedUserId}`)
                    .then(res => {
                        setUser(res.data);
                    })
                    .catch(err => {
                        console.error("Failed to fetch user", err);
                        // If token is invalid or user not found, clear auth state
                        logout();
                    })
                    .finally(() => {
                        setIsLoading(false);
                    });
            } else {
                setIsLoading(false);
            }
        } else {
            setIsLoading(false);
        }
    }, []);

    const login = async (newToken: string, userId: number | null) => {
        localStorage.setItem("token", newToken);
        setToken(newToken);

        let resolvedUserId = userId;
        if (!resolvedUserId) {
            const decoded = parseJwt(newToken);
            if (decoded) {
                // Our FastAPI token uses `user_id`, otherwise try to parse sub
                resolvedUserId = decoded.user_id || parseInt(decoded.sub, 10);
            }
        }

        if (resolvedUserId) {
            localStorage.setItem("user_id", resolvedUserId.toString());

            // Retry logic because of eventual consistency with RabbitMQ
            let attempts = 0;
            const maxAttempts = 5;
            while (attempts < maxAttempts) {
                try {
                    const res = await postsClient.get(`/users/${resolvedUserId}`);
                    setUser(res.data);
                    return; // Success
                } catch (err) {
                    attempts++;
                    console.warn(`User replica not found yet, retrying... (${attempts}/${maxAttempts})`);
                    if (attempts >= maxAttempts) {
                        console.error("Failed to load user info after login", err);
                    } else {
                        await new Promise(resolve => setTimeout(resolve, 1000)); // wait 1s
                    }
                }
            }
        }
    };

    const logout = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("user_id");
        setToken(null);
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, token, login, logout, isLoading }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
}
