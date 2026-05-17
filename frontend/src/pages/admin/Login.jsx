import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { formatApiError } from "../../lib/api";
import { Terminal, Cpu } from "lucide-react";

export default function AdminLogin() {
    const { login, user, bootstrapped } = useAuth();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [err, setErr] = useState(null);
    const [busy, setBusy] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        if (bootstrapped && user) {
            navigate(user.role === "admin" ? "/admin" : "/admin/posts", { replace: true });
        }
    }, [user, bootstrapped, navigate]);

    async function onSubmit(e) {
        e.preventDefault();
        setBusy(true);
        setErr(null);
        try {
            const u = await login(email, password);
            navigate(u.role === "admin" ? "/admin" : "/admin/posts", { replace: true });
        } catch (ex) {
            setErr(formatApiError(ex.response?.data?.detail) || ex.message);
        } finally {
            setBusy(false);
        }
    }

    return (
        <div className="min-h-screen bg-black text-white grid-bg relative">
            <div className="absolute inset-0 radial-glow pointer-events-none" />
            <div className="relative max-w-md mx-auto px-6 pt-24">
                <div className="flex items-center gap-3 mb-10">
                    <span className="inline-flex items-center justify-center w-10 h-10 border border-cyan-400/60 text-cyan-400 cyan-glow">
                        <Cpu size={18} />
                    </span>
                    <div>
                        <div className="font-mono font-bold text-lg">
                            Aether<span className="text-cyan-400">XOS</span>
                        </div>
                        <div className="font-mono text-[10px] uppercase tracking-widest text-cyan-400">
                            // admin console
                        </div>
                    </div>
                </div>

                <div className="border border-neutral-900 bg-[#070707]">
                    <div className="px-6 py-4 border-b border-neutral-900 flex items-center gap-2 font-mono text-xs text-neutral-400">
                        <Terminal size={14} className="text-cyan-400" />
                        ssh admin@aetherxos.dev
                    </div>
                    <form onSubmit={onSubmit} className="p-6 space-y-5">
                        <div>
                            <label className="block font-mono text-[11px] uppercase tracking-widest text-neutral-400 mb-2">
                                email
                            </label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                data-testid="admin-login-email"
                                className="w-full bg-black border border-neutral-800 focus:border-cyan-400 outline-none px-3 py-2 font-mono text-sm"
                                placeholder="admin@aetherxos.dev"
                                required
                            />
                        </div>
                        <div>
                            <label className="block font-mono text-[11px] uppercase tracking-widest text-neutral-400 mb-2">
                                password
                            </label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                data-testid="admin-login-password"
                                className="w-full bg-black border border-neutral-800 focus:border-cyan-400 outline-none px-3 py-2 font-mono text-sm"
                                required
                            />
                        </div>
                        {err && (
                            <div
                                className="border border-red-500/40 bg-red-500/10 text-red-300 px-3 py-2 font-mono text-xs"
                                data-testid="admin-login-error"
                            >
                                [ERR] {err}
                            </div>
                        )}
                        <button
                            type="submit"
                            disabled={busy}
                            data-testid="admin-login-submit"
                            className="w-full px-4 py-3 bg-cyan-400 text-black font-mono text-sm font-bold uppercase tracking-wider hover:bg-cyan-300 disabled:opacity-50"
                        >
                            {busy ? "authenticating…" : "$ sudo login"}
                        </button>
                        <p className="font-mono text-[11px] text-neutral-500 text-center">
                            JWT-protected · brute-force locked after 5 attempts
                        </p>
                    </form>
                </div>
            </div>
        </div>
    );
}
