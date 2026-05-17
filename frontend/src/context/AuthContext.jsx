import React, { createContext, useContext, useEffect, useState } from "react";
import { api } from "../lib/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null); // null = loading, false = unauth, object = authed
    const [bootstrapped, setBootstrapped] = useState(false);

    useEffect(() => {
        let mounted = true;
        api.get("/auth/me")
            .then((res) => {
                if (mounted) setUser(res.data);
            })
            .catch(() => {
                if (mounted) setUser(false);
            })
            .finally(() => {
                if (mounted) setBootstrapped(true);
            });
        return () => {
            mounted = false;
        };
    }, []);

    async function login(email, password) {
        const res = await api.post("/auth/login", { email, password });
        if (res.data?.access_token) {
            localStorage.setItem("aether_token", res.data.access_token);
        }
        setUser(res.data.user);
        return res.data.user;
    }

    async function logout() {
        try {
            await api.post("/auth/logout");
        } catch (_) {}
        localStorage.removeItem("aether_token");
        setUser(false);
    }

    return (
        <AuthContext.Provider
            value={{ user, setUser, login, logout, bootstrapped }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    return useContext(AuthContext);
}
