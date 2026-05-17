import React, { useEffect, useState } from "react";
import AdminLayout from "../../components/AdminLayout";
import { api } from "../../lib/api";
import { Activity, Database, HardDrive, Clock } from "lucide-react";

function fmtBytes(n) {
    if (!n && n !== 0) return "—";
    const u = ["B", "KB", "MB", "GB"];
    let i = 0;
    while (n >= 1024 && i < u.length - 1) {
        n /= 1024;
        i++;
    }
    return `${n.toFixed(n < 10 ? 1 : 0)} ${u[i]}`;
}

function fmtUptime(s) {
    if (!s) return "—";
    const d = Math.floor(s / 86400);
    const h = Math.floor((s % 86400) / 3600);
    const m = Math.floor((s % 3600) / 60);
    return `${d}d ${h}h ${m}m`;
}

export default function AdminSystem() {
    const [health, setHealth] = useState(null);
    const [logs, setLogs] = useState([]);

    useEffect(() => {
        const tick = () => {
            api.get("/admin/health").then((r) => setHealth(r.data));
            api.get("/admin/logs?limit=100").then((r) => setLogs(r.data.items || []));
        };
        tick();
        const i = setInterval(tick, 8000);
        return () => clearInterval(i);
    }, []);

    return (
        <AdminLayout title="System Health & Logs">
            <p className="text-neutral-400 font-mono text-sm mb-6">
                Live server metrics and admin activity logs. Auto-refreshes every 8s.
            </p>

            {!health ? (
                <div className="font-mono text-cyan-400">loading…</div>
            ) : (
                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                    <div className="border border-neutral-900 bg-[#070707] p-5">
                        <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-widest text-neutral-500">
                            <Activity size={12} className="text-cyan-400" /> Database
                        </div>
                        <div className="mt-2 font-mono text-2xl font-bold">
                            {health.db_ok ? (
                                <span className="text-cyan-400">healthy</span>
                            ) : (
                                <span className="text-red-400">down</span>
                            )}
                        </div>
                        <div className="font-mono text-[11px] text-neutral-500 mt-1">mongo ping ok</div>
                    </div>
                    <div className="border border-neutral-900 bg-[#070707] p-5">
                        <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-widest text-neutral-500">
                            <Clock size={12} className="text-cyan-400" /> Uptime
                        </div>
                        <div className="mt-2 font-mono text-2xl font-bold">
                            {fmtUptime(health.uptime_seconds)}
                        </div>
                        <div className="font-mono text-[11px] text-neutral-500 mt-1">
                            since {new Date(health.started_at).toLocaleString()}
                        </div>
                    </div>
                    <div className="border border-neutral-900 bg-[#070707] p-5">
                        <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-widest text-neutral-500">
                            <Database size={12} className="text-cyan-400" /> Collections
                        </div>
                        <div className="mt-2 font-mono text-2xl font-bold">
                            {(
                                health.counts.posts +
                                health.counts.releases +
                                health.counts.changelogs
                            ).toLocaleString()}
                        </div>
                        <div className="font-mono text-[11px] text-neutral-500 mt-1">
                            posts {health.counts.posts} · changelogs {health.counts.changelogs} · releases{" "}
                            {health.counts.releases}
                        </div>
                    </div>
                    <div className="border border-neutral-900 bg-[#070707] p-5">
                        <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-widest text-neutral-500">
                            <HardDrive size={12} className="text-cyan-400" /> Disk
                        </div>
                        <div className="mt-2 font-mono text-2xl font-bold">
                            {fmtBytes(health.storage_used_bytes)}
                        </div>
                        <div className="font-mono text-[11px] text-neutral-500 mt-1">
                            release storage used
                        </div>
                    </div>
                </div>
            )}

            <div className="border border-neutral-900 bg-black">
                <div className="px-5 py-3 border-b border-neutral-900 font-mono text-xs uppercase tracking-widest text-cyan-400 flex items-center gap-2">
                    <span className="w-2 h-2 bg-cyan-400 cyan-glow inline-block" /> // admin activity log
                </div>
                <div className="max-h-[420px] overflow-y-auto font-mono text-xs">
                    {logs.length === 0 && (
                        <div className="p-6 text-neutral-500">no activity yet.</div>
                    )}
                    {logs.map((l) => (
                        <div
                            key={l.id}
                            className="px-5 py-2 border-b border-neutral-900 flex gap-4 hover:bg-neutral-950"
                        >
                            <span className="text-neutral-600 shrink-0">
                                {new Date(l.ts).toLocaleString()}
                            </span>
                            <span className="text-cyan-400 shrink-0">{l.action}</span>
                            <span className="text-neutral-400 shrink-0">{l.actor}</span>
                            <span className="text-neutral-600 truncate">
                                {JSON.stringify(l.meta)}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        </AdminLayout>
    );
}
