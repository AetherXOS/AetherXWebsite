import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute({ children }) {
    const { user, bootstrapped } = useAuth();
    if (!bootstrapped) {
        return (
            <div
                className="min-h-screen flex items-center justify-center bg-black text-cyan-400 font-mono"
                data-testid="auth-loading"
            >
                <span className="cursor-blink">█</span> verifying session...
            </div>
        );
    }
    if (!user || user === false) {
        return <Navigate to="/admin/login" replace />;
    }
    return children;
}
