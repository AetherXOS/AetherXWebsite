import React, { useEffect, useState } from "react";
import AdminLayout from "../../components/AdminLayout";
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
import { Eye, Users, Download, Globe2 } from "lucide-react";

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
    const [days, setDays] = useState(7);
    const [data, setData] = useState(null);

    useEffect(() => {
        api.get(`/admin/analytics?days=${days}`).then((r) => setData(r.data));
    }, [days]);

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
