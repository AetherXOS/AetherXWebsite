import React, { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import AdminLayout from "../../components/AdminLayout";
import { useAuth } from "../../context/AuthContext";
import { api } from "../../lib/api";
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    BarChart,
    Bar,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    Legend,
} from "recharts";
import { Eye, Users, Download, Globe2, Activity, Cpu, Server } from "lucide-react";

const COLORS = ["#00E5FF", "#7AECFF", "#3DE3FF", "#00C8E0", "#0099AB", "#006B78"];

function Stat({ icon: Icon, label, value, sub }) {
    return (
        <div className="border border-neutral-900 bg-[#070707] p-5">
            <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-widest text-neutral-500">
                <Icon size={12} className="text-cyan-400" />
                {label}
            </div>
            <div className="mt-2 font-mono text-3xl font-bold tracking-tight">
                {value}
            </div>
            {sub && (
                <div className="font-mono text-[11px] text-neutral-500 mt-1">
                    {sub}
                </div>
            )}
        </div>
    );
}

export default function AdminDashboard() {
    const { user } = useAuth();
    const [days, setDays] = useState(7);
    const [data, setData] = useState(null);
    const [metrics, setMetrics] = useState({ active_users: 1, cpu_load: 12, ram_load: 42, uptime_seconds: 0 });

    const windowStats = [7, 14, 30].map((windowDays) => {
        const summary = data?.windows?.find((item) => item.days === windowDays) || {
            days: windowDays,
            unique_visitors: 0,
        };

        return {
            days: windowDays,
            visitors: summary.unique_visitors || 0,
        };
    });

    useEffect(() => {
        if (user?.role !== "admin") return;
        let active = true;
        const loadAnalytics = () => {
            api.get(`/admin/analytics?days=${days}`).then((r) => {
                if (!active) return;
                const d = r.data || {};
                const normalized = {
                    summary: d.summary || { pageviews: 0, unique_visitors: 0, downloads: 0 },
                    windows: Array.isArray(d.windows) ? d.windows : [],
                    series: Array.isArray(d.series) ? d.series : [],
                    geography: Array.isArray(d.geography) ? d.geography : [],
                    top_pages: Array.isArray(d.top_pages) ? d.top_pages : [],
                    top_referrers: Array.isArray(d.top_referrers) ? d.top_referrers : [],
                    top_downloads: Array.isArray(d.top_downloads) ? d.top_downloads : [],
                };
                setData(normalized);
            }).catch(() => {
                if (!active) return;
                setData({ summary: { pageviews: 0, unique_visitors: 0, downloads: 0 }, windows: [], series: [], geography: [], top_pages: [], top_referrers: [], top_downloads: [] });
            });
        };
        loadAnalytics();
        const interval = setInterval(loadAnalytics, 8000);
        return () => {
            active = false;
            clearInterval(interval);
        };
    }, [days, user]);

    useEffect(() => {
        if (user?.role !== "admin") return;
        const fetchMetrics = () => {
            api.get("/admin/system/metrics")
                .then((r) => setMetrics(r.data || { active_users: 1, cpu_load: 12, ram_load: 42, uptime_seconds: 0 }))
                .catch(() => {});
        };
        fetchMetrics();
        const interval = setInterval(fetchMetrics, 3000);
        return () => clearInterval(interval);
    }, [user]);

    useEffect(() => {
        if (user?.role !== "admin") return;
        const source = new EventSource("/api/admin/analytics/stream", { withCredentials: true });

        const refreshLiveData = () => {
            api.get(`/admin/analytics?days=${days}`).then((r) => {
                const d = r.data || {};
                setData({
                    summary: d.summary || { pageviews: 0, unique_visitors: 0, downloads: 0 },
                    windows: Array.isArray(d.windows) ? d.windows : [],
                    series: Array.isArray(d.series) ? d.series : [],
                    geography: Array.isArray(d.geography) ? d.geography : [],
                    top_pages: Array.isArray(d.top_pages) ? d.top_pages : [],
                    top_referrers: Array.isArray(d.top_referrers) ? d.top_referrers : [],
                    top_downloads: Array.isArray(d.top_downloads) ? d.top_downloads : [],
                });
            }).catch(() => {});
            api.get("/admin/system/metrics").then((r) => {
                if (r.data) setMetrics(r.data);
            }).catch(() => {});
        };

        source.addEventListener("analytics", refreshLiveData);
        source.addEventListener("handshake", refreshLiveData);
        source.onerror = () => {
            // fallback polling already exists above
        };

        return () => source.close();
    }, [days, user]);

    if (user && user.role !== "admin") {
        return <Navigate to="/admin/posts" replace />;
    }

    return (
        <AdminLayout title="Analytics & Traffic">
            <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
                <p className="text-neutral-400 max-w-xl font-mono text-sm">
                    Real-time monitoring across the public site and download
                    center. Tracks anonymous pageviews and download events.
                </p>
                <div className="flex border border-neutral-900">
                    {[7, 14, 30].map((d) => (
                        <button
                            key={d}
                            data-testid={`range-${d}`}
                            onClick={() => setDays(d)}
                            className={`px-4 py-2 font-mono text-xs uppercase tracking-widest border-r border-neutral-900 last:border-r-0 ${
                                days === d
                                    ? "bg-cyan-400 text-black font-bold"
                                    : "text-neutral-400 hover:text-cyan-400"
                            }`}
                        >
                            {d}d
                        </button>
                    ))}
                </div>
            </div>

            {!data ? (
                <div className="font-mono text-cyan-400">loading…</div>
            ) : (
                <>
                    {/* Live Cyber-Neon Telemetry board */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 font-mono text-xs">
                        <div className="border border-cyan-400/20 bg-cyan-400/5 p-5 relative overflow-hidden flex flex-col justify-between">
                            <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-400/10 rounded-full blur-2xl pointer-events-none" />
                            <div className="flex items-center gap-2 font-bold tracking-widest text-cyan-400 uppercase">
                                <Activity size={14} className="text-cyan-400 animate-pulse" />
                                Live Active Visitors
                            </div>
                            <div className="mt-4 flex items-baseline gap-2">
                                <span className="text-4xl font-bold tracking-tight text-white animate-pulse">
                                    {metrics.active_users}
                                </span>
                                <span className="text-[10px] text-cyan-400 uppercase font-bold">VISITORS</span>
                            </div>
                            <p className="text-neutral-500 text-[10px] mt-2 border-t border-neutral-900 pt-2 uppercase">
                                Recent unique page visitors from tracked site activity (last 60s)
                            </p>
                        </div>

                        <div className="border border-neutral-900 bg-[#070707] p-5 flex flex-col justify-between">
                            <div className="flex items-center gap-2 font-bold tracking-widest text-neutral-400 uppercase">
                                <Cpu size={14} className="text-cyan-400" />
                                Exokernel CPU Load
                            </div>
                            <div className="mt-4 space-y-2">
                                <div className="flex justify-between items-baseline">
                                    <span className="text-2xl font-bold text-white tracking-tight">
                                        {metrics.cpu_load}%
                                    </span>
                                    <span className="text-[9px] text-neutral-500 uppercase">Fluctuating nominal</span>
                                </div>
                                <div className="w-full bg-neutral-950 h-1.5 border border-neutral-900 rounded-none overflow-hidden">
                                    <div 
                                        className="bg-cyan-400 h-full transition-all duration-1000 shadow-[0_0_8px_#00E5FF]" 
                                        style={{ width: `${metrics.cpu_load}%` }}
                                    />
                                </div>
                            </div>
                            <p className="text-neutral-500 text-[10px] mt-2 border-t border-neutral-900 pt-2 uppercase">
                                Dynamic system task core scheduler load telemetry
                            </p>
                        </div>

                        <div className="border border-neutral-900 bg-[#070707] p-5 flex flex-col justify-between">
                            <div className="flex items-center gap-2 font-bold tracking-widest text-neutral-400 uppercase">
                                <Server size={14} className="text-orange-400" />
                                Host LibOS Memory
                            </div>
                            <div className="mt-4 space-y-2">
                                <div className="flex justify-between items-baseline">
                                    <span className="text-2xl font-bold text-white tracking-tight">
                                        {metrics.ram_load}%
                                    </span>
                                    <span className="text-[9px] text-neutral-500 uppercase">{metrics.ram_used_gb || "108.8"} GB / {metrics.ram_total_gb || "256"} GB</span>
                                </div>
                                <div className="w-full bg-neutral-950 h-1.5 border border-neutral-900 rounded-none overflow-hidden">
                                    <div 
                                        className="bg-orange-400 h-full transition-all duration-1000" 
                                        style={{ width: `${metrics.ram_load}%` }}
                                    />
                                </div>
                            </div>
                            <p className="text-neutral-500 text-[10px] mt-2 border-t border-neutral-900 pt-2 uppercase">
                                Capability space page directory allocation
                            </p>
                        </div>
                    </div>

                    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                        <Stat
                            icon={Eye}
                            label="Pageviews"
                            value={data.summary.pageviews.toLocaleString()}
                            sub={`last ${days} days`}
                        />
                        <Stat
                            icon={Users}
                            label="Unique visitors"
                            value={data.summary.unique_visitors.toLocaleString()}
                            sub="distinct IPs"
                        />
                        <Stat
                            icon={Download}
                            label="Downloads"
                            value={data.summary.downloads.toLocaleString()}
                            sub="ISO + redirects"
                        />
                        <Stat
                            icon={Globe2}
                            label="Countries"
                            value={data.geography.length}
                            sub="geo distribution"
                        />
                    </div>

                    <div className="grid sm:grid-cols-3 gap-4 mb-8">
                        {windowStats.map((stat) => (
                            <div key={stat.days} className="border border-neutral-900 bg-[#070707] p-5">
                                <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-widest text-neutral-500">
                                    <Users size={12} className="text-cyan-400" />
                                    Unique visitors
                                </div>
                                <div className="mt-2 font-mono text-3xl font-bold tracking-tight text-white">
                                    {stat.visitors.toLocaleString()}
                                </div>
                                <div className="font-mono text-[11px] text-neutral-500 mt-1">
                                    last {stat.days} days
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="grid lg:grid-cols-3 gap-px bg-neutral-900 border border-neutral-900 mb-8">
                        <div className="lg:col-span-2 bg-black p-5">
                            <div className="font-mono text-xs uppercase tracking-widest text-cyan-400 mb-4">
                                // traffic
                            </div>
                            <div className="h-72">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={data.series}>
                                        <CartesianGrid stroke="#1a1a1a" />
                                        <XAxis
                                            dataKey="date"
                                            stroke="#525252"
                                            fontSize={11}
                                            tickFormatter={(d) => d.slice(5)}
                                        />
                                        <YAxis
                                            stroke="#525252"
                                            fontSize={11}
                                        />
                                        <Tooltip
                                            contentStyle={{
                                                background: "#000",
                                                border: "1px solid #222",
                                                fontFamily: "JetBrains Mono",
                                                fontSize: 12,
                                            }}
                                            labelStyle={{ color: "#00E5FF" }}
                                        />
                                        <Line
                                            type="monotone"
                                            dataKey="pageviews"
                                            stroke="#00E5FF"
                                            strokeWidth={2}
                                            dot={false}
                                        />
                                        <Line
                                            type="monotone"
                                            dataKey="downloads"
                                            stroke="#FF6B1A"
                                            strokeWidth={2}
                                            dot={false}
                                        />
                                        <Line
                                            type="monotone"
                                            dataKey="visitors"
                                            stroke="#7AECFF"
                                            strokeWidth={1}
                                            strokeDasharray="3 3"
                                            dot={false}
                                        />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                        <div className="bg-black p-5">
                            <div className="font-mono text-xs uppercase tracking-widest text-cyan-400 mb-4">
                                // geography
                            </div>
                            <div className="h-72">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={data.geography.slice(0, 6)}
                                            dataKey="events"
                                            nameKey="country"
                                            innerRadius={50}
                                            outerRadius={90}
                                            stroke="#000"
                                        >
                                            {data.geography
                                                .slice(0, 6)
                                                .map((_, i) => (
                                                    <Cell
                                                        key={i}
                                                        fill={COLORS[i % COLORS.length]}
                                                    />
                                                ))}
                                        </Pie>
                                        <Legend
                                            wrapperStyle={{
                                                fontSize: 11,
                                                fontFamily: "JetBrains Mono",
                                            }}
                                        />
                                        <Tooltip
                                            contentStyle={{
                                                background: "#000",
                                                border: "1px solid #222",
                                                fontFamily: "JetBrains Mono",
                                                fontSize: 12,
                                            }}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>

                    <div className="grid lg:grid-cols-3 gap-px bg-neutral-900 border border-neutral-900 mb-8">
                        <div className="bg-black p-5">
                            <div className="font-mono text-xs uppercase tracking-widest text-cyan-400 mb-4">
                                // top pages
                            </div>
                            <ul className="space-y-2 font-mono text-sm">
                                {data.top_pages.map((p) => (
                                    <li
                                        key={p.path}
                                        className="flex justify-between items-center border-b border-neutral-900 pb-2"
                                    >
                                        <span className="truncate">{p.path}</span>
                                        <span className="text-cyan-400">
                                            {p.views}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                        <div className="bg-black p-5">
                            <div className="font-mono text-xs uppercase tracking-widest text-cyan-400 mb-4">
                                // top referrers
                            </div>
                            <ul className="space-y-2 font-mono text-sm">
                                {data.top_referrers.map((p) => (
                                    <li
                                        key={p.source}
                                        className="flex justify-between items-center border-b border-neutral-900 pb-2"
                                    >
                                        <span className="truncate">
                                            {p.source}
                                        </span>
                                        <span className="text-cyan-400">
                                            {p.count}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                        <div className="bg-black p-5">
                            <div className="font-mono text-xs uppercase tracking-widest text-cyan-400 mb-4">
                                // downloads by build
                            </div>
                            <div className="h-64">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart
                                        data={data.top_downloads}
                                        layout="vertical"
                                        margin={{ left: 10 }}
                                    >
                                        <CartesianGrid stroke="#1a1a1a" />
                                        <XAxis
                                            type="number"
                                            stroke="#525252"
                                            fontSize={10}
                                        />
                                        <YAxis
                                            dataKey="version"
                                            type="category"
                                            stroke="#525252"
                                            fontSize={10}
                                            width={130}
                                        />
                                        <Tooltip
                                            contentStyle={{
                                                background: "#000",
                                                border: "1px solid #222",
                                                fontFamily: "JetBrains Mono",
                                                fontSize: 12,
                                            }}
                                        />
                                        <Bar dataKey="count" fill="#00E5FF" />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </AdminLayout>
    );
}
