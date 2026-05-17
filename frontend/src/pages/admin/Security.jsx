import React, { useEffect, useState } from "react";
import AdminLayout from "../../components/AdminLayout";
import { api, formatApiError } from "../../lib/api";
import { KeyRound, Save, Shield, Plus, Trash2, Edit3, Check, AlertCircle, Lock, Search, Download, Clock } from "lucide-react";
import { toast } from "sonner";

export default function AdminSecurity() {
    const [data, setData] = useState({ fingerprint: "", public_key: "", notes: "" });
    const [err, setErr] = useState(null);
    const [msg, setMsg] = useState(null);
    const [saving, setSaving] = useState(false);

    // CVE CMS States
    const [cves, setCves] = useState([]);
    const [activeTab, setActiveTab] = useState("gpg");
    const [editingCveId, setEditingCveId] = useState(null);
    const [cveForm, setCveForm] = useState({
        title: "",
        description: "",
        severity: "High",
        module: "",
        status: "patched"
    });

    // Security Audit Logs states
    const [logs, setLogs] = useState([]);
    const [logSearch, setLogSearch] = useState("");

    useEffect(() => {
        api.get("/security/key").then((r) => setData(r.data || { fingerprint: "", public_key: "", notes: "" }));
        loadCves();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const loadCves = async () => {
        try {
            const res = await api.get("/security/cves");
            setCves(res.data || []);
        } catch (e) {
            console.error("Error loading CVEs:", e);
        }
    };

    const loadLogs = async () => {
        try {
            const res = await api.get("/admin/logs?limit=100");
            setLogs(res.data.items || []);
        } catch (e) {
            console.error("Error loading logs:", e);
        }
    };

    useEffect(() => {
        if (activeTab === "audit") {
            loadLogs();
        }
    }, [activeTab]);

    const exportLogsCsv = () => {
        let csvContent = "data:text/csv;charset=utf-8,ID,Timestamp,Actor,Action,Metadata\n";
        logs.forEach(log => {
            const row = [
                log.id,
                log.ts,
                log.actor,
                log.action,
                JSON.stringify(log.meta).replace(/"/g, '""')
            ].map(val => `"${val}"`).join(",");
            csvContent += row + "\n";
        });
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `aetherxos_security_audit_${Date.now()}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success("Audit trail logs exported as CSV successfully!");
    };

    async function saveKey() {
        setSaving(true);
        setErr(null);
        setMsg(null);
        try {
            await api.put("/security/key", data);
            setMsg("Signing key updated successfully.");
            toast.success("Signing key published successfully");
        } catch (e) {
            setErr(formatApiError(e.response?.data?.detail) || e.message);
            toast.error("Failed to update signing key");
        } finally {
            setSaving(false);
        }
    }

    // CVE Operations
    const handleCveSubmit = async (e) => {
        e.preventDefault();
        if (!cveForm.title || !cveForm.description || !cveForm.module) {
            toast.error("Please fill in all required fields");
            return;
        }

        try {
            if (editingCveId) {
                await api.put(`/admin/security/cves/${editingCveId}`, cveForm);
                toast.success(`Advisory ${editingCveId} updated successfully`);
                setEditingCveId(null);
            } else {
                const res = await api.post("/admin/security/cves", cveForm);
                toast.success(`Security Advisory ${res.data.id} published`);
            }
            setCveForm({ title: "", description: "", severity: "High", module: "", status: "patched" });
            loadCves();
        } catch (e) {
            toast.error(formatApiError(e.response?.data?.detail) || "Failed to publish advisory");
        }
    };

    const startEditCve = (cve) => {
        setEditingCveId(cve.id);
        setCveForm({
            title: cve.title,
            description: cve.description,
            severity: cve.severity,
            module: cve.module,
            status: cve.status
        });
        toast.info(`Editing ${cve.id}`);
    };

    const cancelEdit = () => {
        setEditingCveId(null);
        setCveForm({ title: "", description: "", severity: "High", module: "", status: "patched" });
    };

    const deleteCve = async (id) => {
        if (!confirm(`Are you sure you want to delete ${id}?`)) return;
        try {
            await api.delete(`/admin/security/cves/${id}`);
            toast.success(`Deleted ${id}`);
            loadCves();
        } catch (e) {
            toast.error("Failed to delete security advisory");
        }
    };

    return (
        <AdminLayout title="Security Center Control">
            {/* Cyber-Neon Tabs */}
            <div className="flex border-b border-neutral-900 mb-6 font-mono text-xs uppercase tracking-widest bg-black">
                <button
                    onClick={() => setActiveTab("gpg")}
                    className={`px-6 py-3 font-bold border-b-2 transition-all ${
                        activeTab === "gpg"
                            ? "border-cyan-400 text-cyan-400 bg-cyan-400/5"
                            : "border-transparent text-neutral-500 hover:text-white"
                    }`}
                >
                    <span className="flex items-center gap-1.5">
                        <KeyRound size={12} /> GPG Signing Key
                    </span>
                </button>
                <button
                    onClick={() => setActiveTab("cve")}
                    className={`px-6 py-3 font-bold border-b-2 transition-all ${
                        activeTab === "cve"
                            ? "border-cyan-400 text-cyan-400 bg-cyan-400/5"
                            : "border-transparent text-neutral-500 hover:text-white"
                    }`}
                >
                    <span className="flex items-center gap-1.5">
                        <Shield size={12} /> Security Advisories (CVEs)
                    </span>
                </button>
                <button
                    onClick={() => setActiveTab("audit")}
                    className={`px-6 py-3 font-bold border-b-2 transition-all ${
                        activeTab === "audit"
                            ? "border-cyan-400 text-cyan-400 bg-cyan-400/5"
                            : "border-transparent text-neutral-500 hover:text-white"
                    }`}
                >
                    <span className="flex items-center gap-1.5">
                        <Clock size={12} /> Audit Trails
                    </span>
                </button>
            </div>

            {activeTab === "gpg" && (
                <div>
                    <p className="text-neutral-400 font-mono text-xs mb-6">
                        Publish the public GPG key + fingerprint used to sign AetherXOS
                        release artifacts. Shown publicly at <code>/security</code>.
                    </p>
                    <div className="border border-neutral-900 bg-[#070707] p-6 space-y-4 max-w-3xl">
                        <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-cyan-400">
                            <KeyRound size={14} /> GPG public key metadata
                        </div>
                        <input
                            placeholder="Fingerprint (e.g. 4F2A 8C19 …)"
                            value={data.fingerprint || ""}
                            onChange={(e) => setData((s) => ({ ...s, fingerprint: e.target.value }))}
                            data-testid="gpg-fingerprint-input"
                            className="w-full bg-black border border-neutral-800 focus:border-cyan-400 outline-none px-3 py-2 font-mono text-xs text-white"
                        />
                        <textarea
                            placeholder={"-----BEGIN PGP PUBLIC KEY BLOCK-----\n...\n-----END PGP PUBLIC KEY BLOCK-----"}
                            rows={12}
                            value={data.public_key || ""}
                            onChange={(e) => setData((s) => ({ ...s, public_key: e.target.value }))}
                            spellCheck={false}
                            data-testid="gpg-public-key-input"
                            className="w-full bg-black border border-neutral-800 focus:border-cyan-400 outline-none px-3 py-2 font-mono text-[11px] whitespace-pre text-neutral-300"
                        />
                        <input
                            placeholder="Notes (e.g. rotated 2026-01-01, valid until 2028)"
                            value={data.notes || ""}
                            onChange={(e) => setData((s) => ({ ...s, notes: e.target.value }))}
                            className="w-full bg-black border border-neutral-800 focus:border-cyan-400 outline-none px-3 py-2 font-mono text-xs text-white"
                        />
                        {err && (
                            <div className="border border-red-500/40 bg-red-500/10 text-red-300 px-3 py-2 font-mono text-xs">
                                [ERR] {err}
                            </div>
                        )}
                        {msg && (
                            <div className="border border-cyan-500/40 bg-cyan-500/10 text-cyan-300 px-3 py-2 font-mono text-xs">
                                [OK] {msg}
                            </div>
                        )}
                        <div className="flex justify-end">
                            <button
                                onClick={saveKey}
                                disabled={saving}
                                data-testid="save-gpg-key-btn"
                                className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-400 text-black font-mono text-xs uppercase tracking-widest font-bold hover:bg-cyan-300 disabled:opacity-50"
                            >
                                <Save size={14} /> {saving ? "saving…" : "publish key"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === "cve" && (
                <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6 font-mono text-xs">
                    {/* Left Column: Advisories List */}
                    <div className="space-y-4">
                        <h3 className="text-cyan-400 font-bold uppercase tracking-wider mb-2">Registered advisories</h3>
                        {cves.length === 0 ? (
                            <div className="p-8 text-center border border-neutral-900 text-neutral-600 bg-neutral-950/20">
                                No security advisories published. NOMINAL state.
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {cves.map((cve) => {
                                    const severityBadge = {
                                        Critical: "border-red-500/30 text-red-400 bg-red-500/5",
                                        High: "border-orange-500/30 text-orange-400 bg-orange-500/5",
                                        Medium: "border-yellow-500/30 text-yellow-400 bg-yellow-500/5",
                                        Low: "border-cyan-500/30 text-cyan-400 bg-cyan-500/5"
                                    };
                                    return (
                                        <div key={cve.id} className="border border-neutral-900 bg-black p-4 space-y-2">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <span className={`px-2 py-0.5 border ${severityBadge[cve.severity] || "border-neutral-800 text-neutral-500"}`}>
                                                        {cve.severity}
                                                    </span>
                                                    <span className="text-white font-bold text-sm">{cve.id}</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => startEditCve(cve)}
                                                        className="p-1 text-neutral-500 hover:text-cyan-400"
                                                        title="Edit Advisory"
                                                    >
                                                        <Edit3 size={14} />
                                                    </button>
                                                    <button
                                                        onClick={() => deleteCve(cve.id)}
                                                        className="p-1 text-neutral-500 hover:text-red-400"
                                                        title="Delete Advisory"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            </div>
                                            <div>
                                                <div className="text-[10px] text-neutral-500">// {cve.module}</div>
                                                <div className="text-white font-bold text-sm mt-0.5">{cve.title}</div>
                                            </div>
                                            <p className="text-neutral-400 leading-relaxed text-[11px] truncate max-w-lg">
                                                {cve.description}
                                            </p>
                                            <div className="flex items-center justify-between text-[9px] text-neutral-500 pt-1">
                                                <span>Mitigation: <strong className="text-emerald-400 font-normal">{cve.status}</strong></span>
                                                <span>Published: {new Date(cve.published_at).toLocaleDateString()}</span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Right Column: Publish Form */}
                    <div className="border border-neutral-900 bg-[#070707] p-4 h-fit space-y-4">
                        <h3 className="text-cyan-400 font-bold uppercase tracking-wider border-b border-neutral-900 pb-2">
                            {editingCveId ? `Edit Advisory ${editingCveId}` : "Publish new advisory"}
                        </h3>
                        <form onSubmit={handleCveSubmit} className="space-y-3">
                            <div className="space-y-1">
                                <label className="text-neutral-500">Affected Module *</label>
                                <input
                                    type="text"
                                    placeholder="e.g. Kernel VFS Layer"
                                    value={cveForm.module}
                                    onChange={(e) => setCveForm(s => ({ ...s, module: e.target.value }))}
                                    className="w-full bg-black border border-neutral-800 focus:border-cyan-400 outline-none px-2 py-1.5 text-white"
                                    required
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-neutral-500">Advisory Title *</label>
                                <input
                                    type="text"
                                    placeholder="e.g. Memory Alignment Race Condition"
                                    value={cveForm.title}
                                    onChange={(e) => setCveForm(s => ({ ...s, title: e.target.value }))}
                                    className="w-full bg-black border border-neutral-800 focus:border-cyan-400 outline-none px-2 py-1.5 text-white"
                                    required
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <div className="space-y-1">
                                    <label className="text-neutral-500">Severity *</label>
                                    <select
                                        value={cveForm.severity}
                                        onChange={(e) => setCveForm(s => ({ ...s, severity: e.target.value }))}
                                        className="w-full bg-black border border-neutral-800 focus:border-cyan-400 outline-none px-2 py-1.5 text-white"
                                    >
                                        <option value="Critical">Critical</option>
                                        <option value="High">High</option>
                                        <option value="Medium">Medium</option>
                                        <option value="Low">Low</option>
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-neutral-500">Status *</label>
                                    <select
                                        value={cveForm.status}
                                        onChange={(e) => setCveForm(s => ({ ...s, status: e.target.value }))}
                                        className="w-full bg-black border border-neutral-800 focus:border-cyan-400 outline-none px-2 py-1.5 text-white"
                                    >
                                        <option value="patched">Patched</option>
                                        <option value="active">Active/Unpatched</option>
                                        <option value="under investigation">Investigating</option>
                                    </select>
                                </div>
                            </div>
                            <div className="space-y-1">
                                <label className="text-neutral-500">Description *</label>
                                <textarea
                                    placeholder="Provide root-cause, impacts, and verification guides..."
                                    rows={5}
                                    value={cveForm.description}
                                    onChange={(e) => setCveForm(s => ({ ...s, description: e.target.value }))}
                                    className="w-full bg-black border border-neutral-800 focus:border-cyan-400 outline-none px-2 py-1.5 text-neutral-300"
                                    required
                                />
                            </div>
                            <div className="flex gap-2 justify-end pt-2">
                                {editingCveId && (
                                    <button
                                        type="button"
                                        onClick={cancelEdit}
                                        className="px-3 py-1.5 border border-neutral-800 text-neutral-500 hover:text-white"
                                    >
                                        Cancel
                                    </button>
                                )}
                                <button
                                    type="submit"
                                    className="px-4 py-1.5 bg-cyan-400 text-black font-bold hover:bg-cyan-300"
                                >
                                    {editingCveId ? "Update Advisory" : "Publish Advisory"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {activeTab === "audit" && (
                <div className="font-mono text-xs space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-900 pb-4">
                        <div>
                            <div className="flex items-center gap-2 text-cyan-400 uppercase tracking-widest font-bold mb-1">
                                <Lock size={12} /> Live Security Audit Logs
                            </div>
                            <p className="text-neutral-500 text-[11px] uppercase">
                                Real-time immutable record of system changes and logins
                            </p>
                        </div>
                        <button
                            onClick={exportLogsCsv}
                            className="inline-flex items-center gap-2 px-3 py-1.5 border border-cyan-400/20 text-cyan-400 hover:bg-cyan-400/5 transition-colors uppercase font-bold tracking-widest text-[10px]"
                        >
                            <Download size={13} /> Export Logs (.CSV)
                        </button>
                    </div>

                    {/* Filter logs search */}
                    <div className="relative">
                        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-600" />
                        <input
                            type="text"
                            placeholder="Filter logs by actor, action, or metadata..."
                            value={logSearch}
                            onChange={(e) => setLogSearch(e.target.value)}
                            className="w-full bg-black border border-neutral-900 focus:border-cyan-400 outline-none text-white pl-9 pr-4 py-2 text-xs"
                        />
                    </div>

                    {/* Logs listing */}
                    <div className="border border-neutral-900 bg-black divide-y divide-neutral-900">
                        {logs.filter(log => 
                            log.action.toLowerCase().includes(logSearch.toLowerCase()) ||
                            log.actor.toLowerCase().includes(logSearch.toLowerCase()) ||
                            JSON.stringify(log.meta).toLowerCase().includes(logSearch.toLowerCase())
                        ).length === 0 ? (
                            <div className="p-8 text-center text-neutral-600">
                                No security logs match the current search query.
                            </div>
                        ) : (
                            logs.filter(log => 
                                log.action.toLowerCase().includes(logSearch.toLowerCase()) ||
                                log.actor.toLowerCase().includes(logSearch.toLowerCase()) ||
                                JSON.stringify(log.meta).toLowerCase().includes(logSearch.toLowerCase())
                            ).map((log) => {
                                const isCriticalAction = log.action.includes("delete") || log.action.includes("demote") || log.action.includes("db_import");
                                return (
                                    <div key={log.id} className="p-4 hover:bg-neutral-950/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className={`px-1.5 py-0.5 border text-[9px] font-bold uppercase tracking-wider ${
                                                    isCriticalAction 
                                                        ? "border-red-500/30 text-red-400 bg-red-500/5 animate-pulse" 
                                                        : "border-cyan-500/20 text-cyan-400 bg-cyan-400/5"
                                                }`}>
                                                    {log.action}
                                                </span>
                                                <span className="text-white font-bold">{log.actor}</span>
                                                <span className="text-[10px] text-neutral-600">ID: {log.id}</span>
                                            </div>
                                            <div className="text-[10px] text-neutral-500 break-all font-mono">
                                                Meta: {JSON.stringify(log.meta)}
                                            </div>
                                        </div>
                                        <div className="text-right text-[10px] text-neutral-500 whitespace-nowrap self-end sm:self-center">
                                            {new Date(log.ts).toLocaleString()}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            )}
        </AdminLayout>
    );
}
