import React, { useEffect, useRef, useState } from "react";
import AdminLayout from "../../components/AdminLayout";
import { api, API_BASE, formatApiError } from "../../lib/api";
import { Plus, Trash2, Upload, Link2, Hash } from "lucide-react";

const CHANNELS = ["stable", "beta", "nightly"];

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

export default function AdminReleases() {
    const [items, setItems] = useState([]);
    const [mode, setMode] = useState(null); // "upload" | "external"
    const [form, setForm] = useState({});
    const [busy, setBusy] = useState(false);
    const [err, setErr] = useState(null);
    const fileRef = useRef(null);
    const sigRef = useRef(null);

    const load = () => api.get("/releases").then((r) => setItems(r.data.items || []));
    useEffect(() => {
        load();
    }, []);

    function openUpload() {
        setMode("upload");
        setForm({
            version: "",
            channel: "stable",
            title: "",
            notes: "",
            arch: "x86_64",
            min_ram_gb: 2,
            min_disk_gb: 4,
            signature_url: "",
            signing_key_fingerprint: "",
        });
        setErr(null);
    }
    function openExternal() {
        setMode("external");
        setForm({
            version: "",
            channel: "stable",
            title: "",
            notes: "",
            arch: "x86_64",
            min_ram_gb: 2,
            min_disk_gb: 4,
            file_url: "",
            file_name: "",
            sha256: "",
            file_size: 0,
            storage_kind: "external",
            signature_url: "",
            signing_key_fingerprint: "",
        });
        setErr(null);
    }

    async function submit() {
        setBusy(true);
        setErr(null);
        try {
            if (mode === "upload") {
                const f = fileRef.current?.files?.[0];
                if (!f) throw new Error("Select an ISO file to upload.");
                const fd = new FormData();
                fd.append("file", f);
                fd.append("version", form.version);
                fd.append("channel", form.channel);
                fd.append("title", form.title);
                fd.append("notes", form.notes || "");
                fd.append("arch", form.arch);
                fd.append("min_ram_gb", form.min_ram_gb);
                fd.append("min_disk_gb", form.min_disk_gb);
                fd.append("signature_url", form.signature_url || "");
                fd.append("signing_key_fingerprint", form.signing_key_fingerprint || "");
                const res = await api.post("/releases/upload", fd, {
                    headers: { "Content-Type": "multipart/form-data" },
                });
                const sigFile = sigRef.current?.files?.[0];
                if (sigFile && res.data?.id) {
                    const sfd = new FormData();
                    sfd.append("file", sigFile);
                    await api.post(`/releases/${res.data.id}/signature`, sfd, {
                        headers: { "Content-Type": "multipart/form-data" },
                    });
                }
            } else {
                await api.post(`/releases`, { ...form });
            }
            setMode(null);
            load();
        } catch (e) {
            setErr(formatApiError(e.response?.data?.detail) || e.message);
        } finally {
            setBusy(false);
        }
    }

    async function remove(id) {
        if (!window.confirm("Delete this release?")) return;
        await api.delete(`/releases/${id}`);
        load();
    }

    return (
        <AdminLayout title="Release & Download Manager">
            <div className="flex justify-between items-center mb-6 flex-wrap gap-3">
                <p className="text-neutral-400 font-mono text-sm">
                    Upload new ISO builds to disk (SHA256 auto-computed) or
                    register external mirror URLs.
                </p>
                <div className="flex gap-2">
                    <button
                        onClick={openUpload}
                        data-testid="upload-release-btn"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-400 text-black font-mono text-xs uppercase tracking-widest font-bold hover:bg-cyan-300"
                    >
                        <Upload size={14} /> Upload ISO
                    </button>
                    <button
                        onClick={openExternal}
                        data-testid="external-release-btn"
                        className="inline-flex items-center gap-2 px-4 py-2 border border-neutral-700 hover:border-cyan-400/60 hover:text-cyan-400 font-mono text-xs uppercase tracking-widest"
                    >
                        <Link2 size={14} /> Add URL + Checksum
                    </button>
                </div>
            </div>

            <div className="border border-neutral-900 overflow-x-auto">
                <table className="w-full font-mono text-sm">
                    <thead className="border-b border-neutral-900 text-left text-[10px] uppercase tracking-widest text-neutral-500">
                        <tr>
                            <th className="px-4 py-3">Version</th>
                            <th className="px-4 py-3">Channel</th>
                            <th className="px-4 py-3">Storage</th>
                            <th className="px-4 py-3">Size</th>
                            <th className="px-4 py-3">Downloads</th>
                            <th className="px-4 py-3">SHA256</th>
                            <th className="px-4 py-3"></th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.map((r) => (
                            <tr key={r.id} className="border-b border-neutral-900 hover:bg-neutral-950">
                                <td className="px-4 py-3 text-cyan-400">{r.version}</td>
                                <td className="px-4 py-3 capitalize">{r.channel}</td>
                                <td className="px-4 py-3 text-neutral-400">
                                    {r.storage_kind === "local" ? "disk" : "external"}
                                </td>
                                <td className="px-4 py-3 text-neutral-400">
                                    {fmtBytes(r.file_size)}
                                </td>
                                <td className="px-4 py-3 text-neutral-400">
                                    {(r.downloads || 0).toLocaleString()}
                                </td>
                                <td className="px-4 py-3 max-w-[200px] truncate text-neutral-500 text-xs">
                                    {r.sha256 || "—"}
                                </td>
                                <td className="px-4 py-3 text-right">
                                    <button
                                        onClick={() => remove(r.id)}
                                        data-testid={`delete-release-${r.id}`}
                                        className="p-1.5 border border-neutral-800 hover:border-red-400/60 hover:text-red-400"
                                    >
                                        <Trash2 size={12} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {items.length === 0 && (
                            <tr>
                                <td colSpan="7" className="p-10 text-center text-neutral-500">
                                    no releases yet.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {mode && (
                <div className="fixed inset-0 bg-black/80 z-50 flex items-start justify-center overflow-y-auto py-10 px-4">
                    <div className="w-full max-w-2xl border border-neutral-800 bg-black">
                        <div className="px-6 py-4 border-b border-neutral-900 font-mono text-cyan-400 text-xs uppercase tracking-widest">
                            {mode === "upload" ? "upload iso build" : "register external release"}
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-3">
                                <input
                                    placeholder="Version e.g. 1.0.0"
                                    value={form.version || ""}
                                    onChange={(e) => setForm((s) => ({ ...s, version: e.target.value }))}
                                    data-testid="release-version-input"
                                    className="bg-black border border-neutral-800 focus:border-cyan-400 outline-none px-3 py-2 font-mono text-sm"
                                />
                                <select
                                    value={form.channel || "stable"}
                                    onChange={(e) => setForm((s) => ({ ...s, channel: e.target.value }))}
                                    className="bg-black border border-neutral-800 focus:border-cyan-400 outline-none px-3 py-2 font-mono text-sm"
                                >
                                    {CHANNELS.map((c) => (
                                        <option key={c} value={c}>
                                            {c}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <input
                                placeholder="Title (e.g. AetherXOS 1.0 Stable)"
                                value={form.title || ""}
                                onChange={(e) => setForm((s) => ({ ...s, title: e.target.value }))}
                                className="w-full bg-black border border-neutral-800 focus:border-cyan-400 outline-none px-3 py-2 font-mono text-sm"
                            />
                            <textarea
                                placeholder="Release notes (plain text)"
                                rows={3}
                                value={form.notes || ""}
                                onChange={(e) => setForm((s) => ({ ...s, notes: e.target.value }))}
                                className="w-full bg-black border border-neutral-800 focus:border-cyan-400 outline-none px-3 py-2 font-mono text-sm"
                            />
                            <div className="grid grid-cols-3 gap-3">
                                <input
                                    placeholder="arch"
                                    value={form.arch || "x86_64"}
                                    onChange={(e) => setForm((s) => ({ ...s, arch: e.target.value }))}
                                    className="bg-black border border-neutral-800 focus:border-cyan-400 outline-none px-3 py-2 font-mono text-sm"
                                />
                                <input
                                    type="number"
                                    placeholder="min RAM (GB)"
                                    value={form.min_ram_gb ?? 2}
                                    onChange={(e) =>
                                        setForm((s) => ({ ...s, min_ram_gb: parseInt(e.target.value || "0") }))
                                    }
                                    className="bg-black border border-neutral-800 focus:border-cyan-400 outline-none px-3 py-2 font-mono text-sm"
                                />
                                <input
                                    type="number"
                                    placeholder="min disk (GB)"
                                    value={form.min_disk_gb ?? 4}
                                    onChange={(e) =>
                                        setForm((s) => ({ ...s, min_disk_gb: parseInt(e.target.value || "0") }))
                                    }
                                    className="bg-black border border-neutral-800 focus:border-cyan-400 outline-none px-3 py-2 font-mono text-sm"
                                />
                            </div>

                            {mode === "upload" ? (
                                <div className="space-y-3">
                                    <div>
                                        <div className="font-mono text-[11px] uppercase tracking-widest text-neutral-500 mb-2">
                                            ISO file
                                        </div>
                                        <input
                                            type="file"
                                            ref={fileRef}
                                            data-testid="release-file-input"
                                            className="w-full bg-black border border-dashed border-neutral-700 px-3 py-6 font-mono text-xs"
                                        />
                                        <div className="font-mono text-[11px] text-neutral-500 mt-2 flex items-center gap-1">
                                            <Hash size={11} className="text-cyan-400" />{" "}
                                            SHA256 will be computed automatically and saved to disk.
                                        </div>
                                    </div>
                                    <div>
                                        <div className="font-mono text-[11px] uppercase tracking-widest text-neutral-500 mb-2">
                                            Detached signature (.asc) — optional
                                        </div>
                                        <input
                                            type="file"
                                            ref={sigRef}
                                            accept=".asc,.sig,application/pgp-signature,text/plain"
                                            data-testid="release-sig-input"
                                            className="w-full bg-black border border-dashed border-neutral-700 px-3 py-4 font-mono text-xs"
                                        />
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    <input
                                        placeholder="Mirror URL (https://...)"
                                        value={form.file_url || ""}
                                        onChange={(e) => setForm((s) => ({ ...s, file_url: e.target.value }))}
                                        className="w-full bg-black border border-neutral-800 focus:border-cyan-400 outline-none px-3 py-2 font-mono text-sm"
                                    />
                                    <div className="grid grid-cols-2 gap-3">
                                        <input
                                            placeholder="File name"
                                            value={form.file_name || ""}
                                            onChange={(e) =>
                                                setForm((s) => ({ ...s, file_name: e.target.value }))
                                            }
                                            className="bg-black border border-neutral-800 focus:border-cyan-400 outline-none px-3 py-2 font-mono text-sm"
                                        />
                                        <input
                                            type="number"
                                            placeholder="File size (bytes)"
                                            value={form.file_size || 0}
                                            onChange={(e) =>
                                                setForm((s) => ({
                                                    ...s,
                                                    file_size: parseInt(e.target.value || "0"),
                                                }))
                                            }
                                            className="bg-black border border-neutral-800 focus:border-cyan-400 outline-none px-3 py-2 font-mono text-sm"
                                        />
                                    </div>
                                    <input
                                        placeholder="SHA256 checksum"
                                        value={form.sha256 || ""}
                                        onChange={(e) => setForm((s) => ({ ...s, sha256: e.target.value }))}
                                        className="w-full bg-black border border-neutral-800 focus:border-cyan-400 outline-none px-3 py-2 font-mono text-xs"
                                    />
                                </div>
                            )}

                            {err && (
                                <div className="border border-red-500/40 bg-red-500/10 text-red-300 px-3 py-2 font-mono text-xs">
                                    [ERR] {err}
                                </div>
                            )}
                            <div className="flex gap-3 justify-end pt-3 border-t border-neutral-900">
                                <button
                                    onClick={() => setMode(null)}
                                    className="px-4 py-2 border border-neutral-800 hover:border-cyan-400/60 font-mono text-xs uppercase tracking-widest"
                                >
                                    cancel
                                </button>
                                <button
                                    onClick={submit}
                                    disabled={busy}
                                    data-testid="save-release-btn"
                                    className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-400 text-black font-mono text-xs uppercase tracking-widest font-bold hover:bg-cyan-300 disabled:opacity-50"
                                >
                                    {busy ? "uploading…" : "publish"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
}
