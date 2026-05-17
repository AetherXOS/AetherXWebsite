import React from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { Terminal, Github, Cpu } from "lucide-react";

const NAV = [
    { to: "/", label: "Home" },
    { to: "/downloads", label: "Downloads" },
    { to: "/news", label: "News" },
    { to: "/changelog", label: "Changelog" },
    { to: "/architecture", label: "Architecture" },
    { to: "/docs", label: "Docs" },
];

export default function Layout({ children }) {
    const location = useLocation();
    return (
        <div className="min-h-screen flex flex-col bg-black text-white">
            <header className="sticky top-0 z-40 border-b border-neutral-900 bg-black/85 backdrop-blur">
                <div className="max-w-7xl mx-auto flex items-center justify-between px-6 lg:px-8 h-16">
                    <Link
                        to="/"
                        data-testid="nav-logo"
                        className="flex items-center gap-2 font-mono font-bold text-lg tracking-tight"
                    >
                        <span className="inline-flex items-center justify-center w-8 h-8 border border-cyan-400/60 text-cyan-400 cyan-glow">
                            <Cpu size={16} />
                        </span>
                        <span>
                            Aether<span className="text-cyan-400">XOS</span>
                        </span>
                        <span className="hidden sm:inline text-[10px] uppercase tracking-[0.2em] text-neutral-500 ml-2 border border-neutral-800 px-1.5 py-0.5">
                            v1.0
                        </span>
                    </Link>
                    <nav className="hidden md:flex items-center gap-1 font-mono text-sm">
                        {NAV.map((n) => (
                            <NavLink
                                key={n.to}
                                to={n.to}
                                data-testid={`nav-${n.label.toLowerCase()}`}
                                className={({ isActive }) =>
                                    `px-3 py-1.5 border border-transparent transition-colors hover:text-cyan-400 hover:border-cyan-400/40 ${isActive ? "text-cyan-400 border-cyan-400/40" : "text-neutral-300"}`
                                }
                                end={n.to === "/"}
                            >
                                {n.label}
                            </NavLink>
                        ))}
                    </nav>
                    <div className="flex items-center gap-2">
                        <a
                            href="https://github.com"
                            target="_blank"
                            rel="noreferrer"
                            data-testid="nav-github"
                            className="hidden sm:inline-flex items-center gap-2 px-3 py-1.5 border border-neutral-800 hover:border-cyan-400/60 hover:text-cyan-400 font-mono text-xs uppercase tracking-wider transition-colors"
                        >
                            <Github size={14} /> Source
                        </a>
                        <Link
                            to="/downloads"
                            data-testid="nav-cta-download"
                            className="inline-flex items-center gap-2 px-3 py-1.5 bg-cyan-400 text-black hover:bg-cyan-300 font-mono text-xs font-bold uppercase tracking-wider transition-colors"
                        >
                            <Terminal size={14} /> Get Aether
                        </Link>
                    </div>
                </div>
                {/* Mobile nav strip */}
                <nav className="md:hidden border-t border-neutral-900 flex overflow-x-auto font-mono text-xs">
                    {NAV.map((n) => (
                        <NavLink
                            key={n.to}
                            to={n.to}
                            className={({ isActive }) =>
                                `px-4 py-2 whitespace-nowrap ${isActive ? "text-cyan-400" : "text-neutral-400"}`
                            }
                            end={n.to === "/"}
                        >
                            {n.label}
                        </NavLink>
                    ))}
                </nav>
            </header>

            <main key={location.pathname} className="flex-1">
                {children}
            </main>

            <footer className="border-t border-neutral-900 bg-black mt-24">
                <div className="max-w-7xl mx-auto px-6 lg:px-8 py-12 grid md:grid-cols-4 gap-10 text-sm">
                    <div className="space-y-3">
                        <div className="font-mono font-bold text-lg">
                            Aether<span className="text-cyan-400">XOS</span>
                        </div>
                        <p className="text-neutral-500 leading-relaxed">
                            An exokernel + Library OS designed for bare-metal
                            performance, memory safety, and uncompromising
                            modularity.
                        </p>
                        <p className="text-neutral-600 font-mono text-xs">
                            $ uname -r → aether-1.0.0-exo
                        </p>
                    </div>
                    <div>
                        <div className="font-mono text-xs uppercase tracking-widest text-neutral-400 mb-3">
                            Product
                        </div>
                        <ul className="space-y-2 text-neutral-400">
                            <li>
                                <Link
                                    to="/downloads"
                                    className="hover:text-cyan-400"
                                >
                                    Downloads
                                </Link>
                            </li>
                            <li>
                                <Link
                                    to="/changelog"
                                    className="hover:text-cyan-400"
                                >
                                    Changelog
                                </Link>
                            </li>
                            <li>
                                <Link
                                    to="/architecture"
                                    className="hover:text-cyan-400"
                                >
                                    Architecture
                                </Link>
                            </li>
                        </ul>
                    </div>
                    <div>
                        <div className="font-mono text-xs uppercase tracking-widest text-neutral-400 mb-3">
                            Developers
                        </div>
                        <ul className="space-y-2 text-neutral-400">
                            <li>
                                <Link to="/docs" className="hover:text-cyan-400">
                                    Documentation
                                </Link>
                            </li>
                            <li>
                                <Link to="/news" className="hover:text-cyan-400">
                                    News
                                </Link>
                            </li>
                            <li>
                                <Link
                                    to="/admin/login"
                                    className="hover:text-cyan-400"
                                >
                                    Admin
                                </Link>
                            </li>
                        </ul>
                    </div>
                    <div>
                        <div className="font-mono text-xs uppercase tracking-widest text-neutral-400 mb-3">
                            System
                        </div>
                        <ul className="space-y-2 text-neutral-400 font-mono text-xs">
                            <li>arch: x86_64 · arm64 · riscv</li>
                            <li>license: BSD-3-Clause</li>
                            <li>© {new Date().getFullYear()} AetherXOS</li>
                        </ul>
                    </div>
                </div>
            </footer>
        </div>
    );
}
