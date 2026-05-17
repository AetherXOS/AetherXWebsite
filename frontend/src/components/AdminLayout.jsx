import React from "react";
import { NavLink, Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
    LayoutDashboard,
    FileText,
    GitCommitHorizontal,
    Package,
    Activity,
    LogOut,
    Cpu,
    ExternalLink,
    BookOpen,
    Users as UsersIcon,
    ShieldCheck,
    Megaphone,
    MessageSquare,
} from "lucide-react";

const NAV = [
    { to: "/admin", label: "Analytics", icon: LayoutDashboard, end: true, role: "admin" },
    { to: "/admin/posts", label: "News CMS", icon: FileText, role: "staff" },
    { to: "/admin/changelogs", label: "Changelogs", icon: GitCommitHorizontal, role: "staff" },
    { to: "/admin/docs", label: "Documentation", icon: BookOpen, role: "staff" },
    { to: "/admin/releases", label: "Releases", icon: Package, role: "admin" },
    { to: "/admin/announcements", label: "Announcements", icon: Megaphone, role: "admin" },
    { to: "/admin/support", label: "Live Support", icon: MessageSquare, role: "staff" },
    { to: "/admin/security", label: "Signing Key", icon: ShieldCheck, role: "admin" },
    { to: "/admin/users", label: "Users", icon: UsersIcon, role: "admin" },
    { to: "/admin/system", label: "System Health", icon: Activity, role: "admin" },
];

export default function AdminLayout({ children, title }) {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    React.useEffect(() => {
        let timeout;
        const resetTimer = () => {
            if (timeout) clearTimeout(timeout);
            timeout = setTimeout(async () => {
                await logout();
                navigate("/admin/login");
                if (typeof window !== "undefined") {
                    window.location.reload();
                }
            }, 15 * 60 * 1000); // 15 minutes idle security guard
        };

        const events = ["mousemove", "keydown", "click", "scroll"];
        events.forEach(evt => window.addEventListener(evt, resetTimer));
        
        resetTimer();

        return () => {
            if (timeout) clearTimeout(timeout);
            events.forEach(evt => window.removeEventListener(evt, resetTimer));
        };
    }, [logout, navigate]);

    return (
        <div className="min-h-screen bg-black text-white grid grid-cols-1 lg:grid-cols-[260px_1fr]">
            <aside className="border-r border-neutral-900 bg-[#050505] lg:min-h-screen">
                <div className="px-5 py-5 border-b border-neutral-900 flex items-center gap-2">
                    <span className="inline-flex items-center justify-center w-8 h-8 border border-cyan-400/60 text-cyan-400">
                        <Cpu size={16} />
                    </span>
                    <div className="font-mono text-sm">
                        <div className="font-bold">AetherXOS</div>
                        <div className="text-[10px] uppercase tracking-widest text-cyan-400">
                            // admin
                        </div>
                    </div>
                </div>
                <nav className="p-3 space-y-1">
                    {NAV.filter((n) => n.role === "staff" || user?.role === "admin").map((n) => {
                        const Icon = n.icon;
                        return (
                            <NavLink
                                key={n.to}
                                to={n.to}
                                end={n.end}
                                data-testid={`admin-nav-${n.label.toLowerCase().replace(/\s+/g, "-")}`}
                                className={({ isActive }) =>
                                    `flex items-center gap-3 px-3 py-2 font-mono text-sm border border-transparent transition-colors ${
                                        isActive
                                            ? "bg-cyan-400/10 border-cyan-400/40 text-cyan-400"
                                            : "text-neutral-400 hover:text-white hover:border-neutral-800"
                                    }`
                                }
                            >
                                <Icon size={16} />
                                {n.label}
                            </NavLink>
                        );
                    })}
                </nav>
                <div className="mt-auto p-3 border-t border-neutral-900 fixed lg:static bottom-0 left-0 w-full lg:w-auto bg-[#050505]">
                    <a
                        href="/api/docs/scalar"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 px-3 py-2 font-mono text-xs text-neutral-500 hover:text-cyan-400"
                    >
                        <ExternalLink size={14} /> API Playground (Scalar)
                    </a>
                    <a
                        href="/api/docs/swagger"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 px-3 py-2 font-mono text-xs text-neutral-500 hover:text-cyan-400"
                    >
                        <ExternalLink size={14} /> API Sandbox (Swagger)
                    </a>
                    <a
                        href="/api/docs/redoc"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 px-3 py-2 font-mono text-xs text-neutral-500 hover:text-cyan-400"
                    >
                        <ExternalLink size={14} /> API Reference (Redoc)
                    </a>
                    <Link
                        to="/"
                        className="flex items-center gap-2 px-3 py-2 font-mono text-xs text-neutral-500 hover:text-cyan-400"
                    >
                        <ExternalLink size={14} /> View public site
                    </Link>
                    <button
                        data-testid="admin-logout-btn"
                        onClick={async () => {
                            await logout();
                            navigate("/admin/login");
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 font-mono text-xs text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/30"
                    >
                        <LogOut size={14} /> Logout {user?.email}
                    </button>
                </div>
            </aside>
            <div className="flex flex-col">
                <header className="border-b border-neutral-900 px-6 lg:px-10 py-5 flex items-center justify-between">
                    <div>
                        <div className="text-[10px] uppercase tracking-[0.25em] text-cyan-400 font-mono">
                            // {user?.role || "admin"}
                        </div>
                        <h1
                            className="text-2xl font-mono font-bold mt-1"
                            data-testid="admin-page-title"
                        >
                            {title}
                        </h1>
                    </div>
                    <div className="hidden sm:flex items-center gap-3 font-mono text-xs text-neutral-500">
                        <span className="inline-flex items-center gap-2">
                            <span className="w-2 h-2 bg-cyan-400 cyan-glow inline-block" />
                            session active
                        </span>
                        <span>{user?.email}</span>
                    </div>
                </header>
                <div className="p-6 lg:p-10 flex-1">{children}</div>
            </div>
        </div>
    );
}
