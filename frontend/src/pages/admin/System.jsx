import React, { useEffect, useState } from "react";
import AdminLayout from "../../components/AdminLayout";
import { api } from "../../lib/api";
import { SETTINGS_FIELDS, normalizeSettings } from "../../lib/settings";
import { Activity, Database, HardDrive, Clock, Key, Trash2, Copy } from "lucide-react";

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
    if (!s && s !== 0) return "—";
    const d = Math.floor(s / 86400);
    const h = Math.floor((s % 86400) / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = Math.floor(s % 60);
    return `${d}d ${h}h ${m}m ${sec}s`;
}

export default function AdminSystem() {
    const [health, setHealth] = useState(null);
    const [activeUsers, setActiveUsers] = useState(0);
    const [logs, setLogs] = useState([]);
    const [exporting, setExporting] = useState(false);
    const [importing, setImporting] = useState(false);
    const [dbErr, setDbErr] = useState(null);
    const [dbMsg, setDbMsg] = useState(null);
    const [secondsTicker, setSecondsTicker] = useState(Date.now());

    useEffect(() => {
        const timer = setInterval(() => {
            setSecondsTicker(Date.now());
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    // API Token States
    const [tokens, setTokens] = useState([]);
    const [newTokenName, setNewTokenName] = useState("");
    const [generatedTokenVal, setGeneratedTokenVal] = useState(null);
    const [tokenErr, setTokenErr] = useState(null);
    const [tokenMsg, setTokenMsg] = useState(null);

    // System Settings States
    const [settings, setSettings] = useState(normalizeSettings());
    const [settingsErr, setSettingsErr] = useState(null);
    const [settingsMsg, setSettingsMsg] = useState(null);
    const [savingSettings, setSavingSettings] = useState(false);

    useEffect(() => {
        const tick = () => {
            api.get("/admin/health").then((r) => {
                const d = r.data || {};
                d.counts = d.counts || { posts: 0, releases: 0, changelogs: 0 };
                d.storage_used_bytes = d.storage_used_bytes || 0;
                d.started_at = d.started_at || new Date().toISOString();
                setHealth(d);
            }).catch(() => setHealth({ counts: { posts: 0, releases: 0, changelogs: 0 }, storage_used_bytes: 0 }));
            api.get("/admin/logs?limit=100").then((r) => setLogs((r.data && r.data.items) ? r.data.items : [])).catch(() => setLogs([]));
            api.get("/admin/tokens").then((r) => setTokens(Array.isArray(r.data) ? r.data : (r.data && r.data.items) || [])).catch(() => {});
            api.get("/settings").then((r) => setSettings(normalizeSettings(r.data))).catch(() => {});
            api.get("/admin/system/metrics").then((r) => setActiveUsers(r.data?.active_users || 0)).catch(() => {});
        };
        tick();
        const i = setInterval(tick, 8000);
        return () => clearInterval(i);
    }, []);

    const handleSaveSettings = async (e) => {
        e.preventDefault();
        setSettingsErr(null);
        setSettingsMsg(null);
        setSavingSettings(true);
        try {
            const res = await api.put("/admin/settings", settings);
            setSettings(normalizeSettings(res.data));
            setSettingsMsg("Centralized system settings updated successfully!");
        } catch (err) {
            setSettingsErr(err.response?.data?.detail || err.message);
        } finally {
            setSavingSettings(false);
        }
    };

    const handleCreateToken = async (e) => {
        e.preventDefault();
        setTokenErr(null);
        setTokenMsg(null);
        setGeneratedTokenVal(null);
        if (!newTokenName.trim()) return;
        try {
            const res = await api.post("/admin/tokens", { name: newTokenName });
            setTokens(prev => [...prev, res.data]);
            setGeneratedTokenVal(res.data.token);
            setNewTokenName("");
            setTokenMsg("Token generated successfully! Copy it now; you won't be able to see it again.");
        } catch (err) {
            setTokenErr(err.response?.data?.detail || err.message);
        }
    };

    const handleRevokeToken = async (id) => {
        if (!confirm("Are you sure you want to revoke this API token? Any applications or CI/CD pipelines using it will lose access immediately.")) return;
        setTokenErr(null);
        setTokenMsg(null);
        try {
            await api.delete(`/admin/tokens/${id}`);
            setTokens(prev => prev.filter(t => t.id !== id));
            setTokenMsg("Token revoked successfully.");
        } catch (err) {
            setTokenErr(err.response?.data?.detail || err.message);
        }
    };

    const handleExport = async () => {
        setExporting(true);
        setDbErr(null);
        setDbMsg(null);
        try {
            const res = await api.get("/admin/db/export");
            const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(res.data, null, 2));
            const downloadAnchor = document.createElement("a");
            downloadAnchor.setAttribute("href", dataStr);
            downloadAnchor.setAttribute("download", `aetherxos_db_backup_${new Date().toISOString().substring(0, 10)}.json`);
            document.body.appendChild(downloadAnchor);
            downloadAnchor.click();
            downloadAnchor.remove();
            setDbMsg("Database exported successfully.");
        } catch (e) {
            setDbErr(e.response?.data?.detail || e.message);
        } finally {
            setExporting(false);
        }
    };

    const handleImport = async (event) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setImporting(true);
        setDbErr(null);
        setDbMsg(null);

        try {
            const formData = new FormData();
            formData.append("file", file);

            const res = await api.post("/admin/db/import", formData, {
                headers: {
                    "Content-Type": "multipart/form-data",
                },
            });
            setDbMsg(`${res.data.message} Restored ${res.data.counts.posts} posts and ${res.data.counts.releases} releases.`);
            
            // Refresh database metrics instantly
            const healthRes = await api.get("/admin/health");
            setHealth(healthRes.data);
        } catch (e) {
            setDbErr(e.response?.data?.detail || e.message);
        } finally {
            setImporting(false);
            event.target.value = "";
        }
    };

    return (
        <AdminLayout title="System Health & Logs">
            <p className="text-neutral-400 font-mono text-sm mb-6">
                Live server metrics, backup management, and admin activity logs. Auto-refreshes every 8s.
            </p>

            {!health ? (
                <div className="font-mono text-cyan-400">loading…</div>
            ) : (
                <>
                    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                        <div className="border border-neutral-900 bg-[#070707] p-5">
                            <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-widest text-neutral-500">
                                <Activity size={12} className="text-cyan-400" /> Database
                            </div>
                            <div className="mt-2 font-mono text-2xl font-bold">
                                {health && health.db_ok ? (
                                    <span className="text-cyan-400">healthy</span>
                                ) : (
                                    <span className="text-red-400">down</span>
                                )}
                            </div>
                            <div className="font-mono text-[11px] text-neutral-500 mt-1">Prisma-backed persistent db</div>
                        </div>
                        <div className="border border-neutral-900 bg-[#070707] p-5">
                            <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-widest text-neutral-500">
                                <Activity size={12} className="text-cyan-400" /> Active Users
                            </div>
                            <div className="mt-2 font-mono text-2xl font-bold text-cyan-400">{activeUsers}</div>
                            <div className="font-mono text-[11px] text-neutral-500 mt-1">recent unique visitors (last 60s)</div>
                        </div>
                        <div className="border border-neutral-900 bg-[#070707] p-5">
                            <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-widest text-neutral-500">
                                <Clock size={12} className="text-cyan-400" /> Uptime
                            </div>
                            <div className="mt-2 font-mono text-2xl font-bold">
                                {fmtUptime(
                                    health.started_at
                                        ? Math.floor((secondsTicker - new Date(health.started_at).getTime()) / 1000)
                                        : health.uptime_seconds
                                )}
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

                    <div className="grid md:grid-cols-2 gap-4 mb-8">
                        {/* BACKUP & RESTORE BLOCK */}
                        <div className="border border-neutral-900 bg-[#070707] p-5 space-y-4">
                            <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-widest text-cyan-400">
                                <Database size={12} /> Database Backup & Restore
                            </div>
                            <p className="text-xs text-neutral-400 font-mono">
                                Export your entire database as a single JSON file, or restore it using a backup.
                            </p>
                            
                            <div className="flex flex-wrap gap-3 pt-2">
                                <button
                                    onClick={handleExport}
                                    disabled={exporting || importing}
                                    className="px-3 py-1.5 bg-cyan-400 text-black font-mono text-xs uppercase tracking-widest font-bold hover:bg-cyan-300 disabled:opacity-50"
                                >
                                    {exporting ? "exporting..." : "export db"}
                                </button>
                                
                                <label className="cursor-pointer px-3 py-1.5 border border-neutral-800 bg-black font-mono text-xs uppercase tracking-widest text-cyan-400 hover:border-cyan-400 inline-block disabled:opacity-50">
                                    {importing ? "importing..." : "import db"}
                                    <input
                                        type="file"
                                        accept=".json"
                                        onChange={handleImport}
                                        disabled={exporting || importing}
                                        className="hidden"
                                    />
                                </label>
                            </div>

                            {dbErr && (
                                <div className="border border-red-500/40 bg-red-500/10 text-red-300 px-3 py-1.5 font-mono text-[11px]">
                                    [ERR] {dbErr}
                                </div>
                            )}
                            {dbMsg && (
                                <div className="border border-cyan-500/40 bg-cyan-500/10 text-cyan-300 px-3 py-1.5 font-mono text-[11px]">
                                    [OK] {dbMsg}
                                </div>
                            )}
                        </div>

                        {/* SERVER DETAILS & REFRESH CONTROL */}
                        <div className="border border-neutral-900 bg-[#070707] p-5 space-y-3 font-mono text-xs text-neutral-400">
                            <div className="flex items-center gap-2 text-[11px] uppercase tracking-widest text-cyan-400">
                                <Activity size={12} /> Server Environment
                            </div>
                            <div className="space-y-1">
                                <div className="flex justify-between border-b border-neutral-900 pb-1">
                                    <span>Framework Mode:</span>
                                    <span className="text-neutral-200">React Router v7 Full-Stack</span>
                                </div>
                                <div className="flex justify-between border-b border-neutral-900 pb-1">
                                    <span>Execution Engine:</span>
                                    <span className="text-neutral-200">Node.js (Server Hydration)</span>
                                </div>
                                <div className="flex justify-between border-b border-neutral-900 pb-1">
                                    <span>Active Database:</span>
                                    <span className="text-cyan-400">db.json (Persistent File)</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Geo-Telemetry:</span>
                                    <span className="text-neutral-200">Enabled (Offline GeoIP)</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* SYSTEM SETTINGS MANAGEMENT */}
                    <div className="border border-neutral-900 bg-[#070707] p-5 mb-8 space-y-4">
                        <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-widest text-cyan-400 border-b border-neutral-900 pb-3">
                            <Activity size={12} /> Centralized System Configuration
                        </div>
                        <p className="text-xs text-neutral-400 font-mono">
                            Manage global system constants like the exokernel version, release countdown status, and official Discord invitation links.
                        </p>
                        
                        <form onSubmit={handleSaveSettings} className="space-y-4 font-mono text-xs">
                            <div className="grid sm:grid-cols-2 gap-4">
                                {SETTINGS_FIELDS.slice(0, 2).map((field) => (
                                    <div key={field.key} className="space-y-1.5">
                                        <label className="text-neutral-500 uppercase tracking-wider text-[10px]">{field.label}</label>
                                        <input
                                            type="text"
                                            value={settings[field.key] || ""}
                                            onChange={(e) => setSettings({ ...settings, [field.key]: e.target.value })}
                                            placeholder={field.placeholder}
                                            className="w-full bg-black border border-neutral-800 focus:border-cyan-400 outline-none text-white px-3 py-2"
                                        />
                                    </div>
                                ))}
                            </div>
                            <div className="grid sm:grid-cols-2 gap-4">
                                {SETTINGS_FIELDS.slice(2).map((field) => (
                                    <div key={field.key} className="space-y-1.5">
                                        <label className="text-neutral-500 uppercase tracking-wider text-[10px]">{field.label}</label>
                                        {field.key === "live_chat_enabled" ? (
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="checkbox"
                                                    checked={!!settings.live_chat_enabled}
                                                    onChange={(e) => setSettings({ ...settings, live_chat_enabled: e.target.checked })}
                                                    className="w-4 h-4"
                                                />
                                                <span className="text-neutral-400 text-[12px]">Enable live chat on public pages</span>
                                            </div>
                                        ) : (
                                            <input
                                                type="text"
                                                value={settings[field.key] || ""}
                                                onChange={(e) => setSettings({ ...settings, [field.key]: e.target.value })}
                                                placeholder={field.placeholder}
                                                className="w-full bg-black border border-neutral-800 focus:border-cyan-400 outline-none text-white px-3 py-2"
                                            />
                                        )}
                                    </div>
                                ))}
                            </div>
                            
                            <div className="flex justify-between items-center pt-2">
                                <button
                                    type="submit"
                                    disabled={savingSettings}
                                    className="px-4 py-2 bg-cyan-400 text-black hover:bg-cyan-300 font-mono text-xs uppercase tracking-widest font-bold transition-colors disabled:opacity-50"
                                >
                                    {savingSettings ? "saving..." : "save settings"}
                                </button>
                                
                                <span className="text-[10px] text-neutral-500">
                                    These updates propagate instantly to the public header, footer, and releases telemetry.
                                </span>
                            </div>
                        </form>

                        {settingsErr && (
                            <div className="border border-red-500/40 bg-red-500/10 text-red-300 px-3 py-2 font-mono text-[11px]">
                                [ERR] {settingsErr}
                            </div>
                        )}
                        {settingsMsg && (
                            <div className="border border-cyan-500/40 bg-cyan-500/10 text-cyan-300 px-3 py-2 font-mono text-[11px]">
                                [OK] {settingsMsg}
                            </div>
                        )}
                    </div>

                    {/* API TOKENS MANAGER */}
                    <div className="border border-neutral-900 bg-[#070707] p-5 mb-8 space-y-6">
                        <div className="flex items-center justify-between border-b border-neutral-900 pb-3">
                            <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-widest text-cyan-400">
                                <Key size={12} /> System API Access Tokens
                            </div>
                            <span className="text-[10px] text-neutral-500 font-mono">
                                Use to authorize CI/CD metrics, Releases and Webhooks
                            </span>
                        </div>

                        {/* Generation Form */}
                        <form onSubmit={handleCreateToken} className="flex flex-col sm:flex-row gap-3">
                            <input
                                type="text"
                                placeholder="Token description (e.g. GitHub Actions CI)..."
                                value={newTokenName}
                                onChange={(e) => setNewTokenName(e.target.value)}
                                className="flex-1 bg-black border border-neutral-800 focus:border-cyan-400 outline-none text-white px-3 py-2 font-mono text-xs"
                            />
                            <button
                                type="submit"
                                className="px-4 py-2 bg-cyan-400 text-black hover:bg-cyan-300 font-mono text-xs uppercase tracking-widest font-bold shrink-0 transition-colors"
                            >
                                Generate Token
                            </button>
                        </form>

                        {/* Generated Token Warning Message */}
                        {generatedTokenVal && (
                            <div className="border border-cyan-500/40 bg-cyan-500/5 p-4 space-y-3 font-mono text-xs">
                                <div className="text-cyan-400 font-bold uppercase tracking-wider flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 bg-cyan-400 animate-ping rounded-full" />
                                    <span>🔑 Secure API Token Created (Copy Now)</span>
                                </div>
                                <p className="text-neutral-400 text-[11px]">
                                    For security reasons, this token will only be shown once. If lost, you must revoke it and generate a new one.
                                </p>
                                <div className="flex items-center gap-2 bg-black p-3 border border-neutral-800">
                                    <code className="text-white text-xs select-all break-all flex-1">{generatedTokenVal}</code>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            navigator.clipboard.writeText(generatedTokenVal);
                                            alert("Token copied to clipboard!");
                                        }}
                                        className="text-cyan-400 hover:text-cyan-300 p-1 shrink-0"
                                        title="Copy to clipboard"
                                    >
                                        <Copy size={14} />
                                    </button>
                                </div>
                            </div>
                        )}

                        {tokenErr && (
                            <div className="border border-red-500/40 bg-red-500/10 text-red-300 px-3 py-2 font-mono text-[11px]">
                                [ERR] {tokenErr}
                            </div>
                        )}
                        {tokenMsg && !generatedTokenVal && (
                            <div className="border border-cyan-500/40 bg-cyan-500/10 text-cyan-300 px-3 py-2 font-mono text-[11px]">
                                [OK] {tokenMsg}
                            </div>
                        )}

                        {/* Tokens List Table */}
                        <div className="border border-neutral-900 bg-black overflow-x-auto">
                            <table className="w-full text-left font-mono text-xs">
                                <thead className="bg-[#050505] text-neutral-500 border-b border-neutral-900 uppercase text-[10px] tracking-wider">
                                    <tr>
                                        <th className="p-3">Description</th>
                                        <th className="p-3">Token Prefix</th>
                                        <th className="p-3">Created</th>
                                        <th className="p-3">Last Used</th>
                                        <th className="p-3 text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-neutral-900/50">
                                    {tokens.length === 0 ? (
                                        <tr>
                                            <td colSpan="5" className="p-6 text-center text-neutral-600">
                                                No API Access Tokens generated yet. Use the input above to create one.
                                            </td>
                                        </tr>
                                    ) : (
                                        tokens.map((t) => (
                                            <tr key={t.id} className="hover:bg-neutral-950/40">
                                                <td className="p-3 text-white font-bold">{t.name}</td>
                                                <td className="p-3 text-neutral-500">
                                                    <code>{t.token.substring(0, 15)}...</code>
                                                </td>
                                                <td className="p-3 text-neutral-400">
                                                    {new Date(t.created_at).toLocaleDateString()}
                                                </td>
                                                <td className="p-3 text-neutral-400">
                                                    {t.last_used_at ? new Date(t.last_used_at).toLocaleString() : "Never"}
                                                </td>
                                                <td className="p-3 text-right">
                                                    <button
                                                        onClick={() => handleRevokeToken(t.id)}
                                                        className="text-red-400 hover:text-red-300 p-1"
                                                        title="Revoke Token"
                                                    >
                                                        <Trash2 size={13} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
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
