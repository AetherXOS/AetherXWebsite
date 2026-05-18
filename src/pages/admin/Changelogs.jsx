import React, { useEffect, useState } from "react";
import AdminLayout from "../../components/AdminLayout";
import WysiwygEditor from "../../components/WysiwygEditor";
import { api, formatApiError } from "../../lib/api";
import { Plus, Trash2, Edit, X, Save } from "lucide-react";

const TYPES = ["feature", "fix", "security", "perf", "breaking"];
const EMPTY = { version: "", title: "", content: "", type: "feature", released_at: "" };

export default function AdminChangelogs() {
    const [items, setItems] = useState([]);
    const [editing, setEditing] = useState(null);
    const [err, setErr] = useState(null);
    const [saving, setSaving] = useState(false);

    const load = () => api.get("/changelogs").then((r) => {
        const payload = r.data;
        const itemsArr = Array.isArray(payload) ? payload : (payload && (payload.items || payload)) || [];
        setItems(itemsArr || []);
    }).catch(() => setItems([]));
    useEffect(() => {
        load();
    }, []);

    async function save() {
        setSaving(true);
        setErr(null);
        try {
            const body = { ...editing };
            if (editing.id) await api.put(`/changelogs/${editing.id}`, body);
            else await api.post(`/changelogs`, body);
            setEditing(null);
            load();
        } catch (e) {
            setErr(formatApiError(e.response?.data?.detail) || e.message);
        } finally {
            setSaving(false);
        }
    }
    async function remove(id) {
        if (!window.confirm("Delete this changelog entry?")) return;
        await api.delete(`/changelogs/${id}`);
        load();
    }

    return (
        <AdminLayout title="Changelog Manager">
            <div className="flex justify-between items-center mb-6">
                <p className="text-neutral-400 font-mono text-sm">
                    Document architectural changes, system-call updates, and fixes.
                </p>
                <button
                    onClick={() => {
                        setEditing({ ...EMPTY });
                        setErr(null);
                    }}
                    data-testid="new-changelog-btn"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-400 text-black font-mono text-xs uppercase tracking-widest font-bold hover:bg-cyan-300"
                >
                    <Plus size={14} /> New Entry
                </button>
            </div>

            <div className="border border-neutral-900">
                <table className="w-full font-mono text-sm">
                    <thead className="border-b border-neutral-900 text-left text-[10px] uppercase tracking-widest text-neutral-500">
                        <tr>
                            <th className="px-4 py-3">Version</th>
                            <th className="px-4 py-3">Title</th>
                            <th className="px-4 py-3">Type</th>
                            <th className="px-4 py-3">Released</th>
                            <th className="px-4 py-3"></th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.map((c) => (
                            <tr key={c.id} className="border-b border-neutral-900 hover:bg-neutral-950">
                                <td className="px-4 py-3 text-cyan-400">v{c.version}</td>
                                <td className="px-4 py-3">{c.title}</td>
                                <td className="px-4 py-3 text-neutral-400">{c.type}</td>
                                <td className="px-4 py-3 text-neutral-500 text-xs">
                                    {new Date(c.released_at).toLocaleDateString()}
                                </td>
                                <td className="px-4 py-3 text-right space-x-2">
                                    <button
                                        onClick={() => {
                                            setEditing(c);
                                            setErr(null);
                                        }}
                                        className="p-1.5 border border-neutral-800 hover:border-cyan-400/60 hover:text-cyan-400"
                                    >
                                        <Edit size={12} />
                                    </button>
                                    <button
                                        onClick={() => remove(c.id)}
                                        className="p-1.5 border border-neutral-800 hover:border-red-400/60 hover:text-red-400"
                                    >
                                        <Trash2 size={12} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {items.length === 0 && (
                            <tr>
                                <td colSpan="5" className="p-10 text-center text-neutral-500">
                                    no changelogs yet.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {editing && (
                <div className="fixed inset-0 bg-black/80 z-50 flex items-start justify-center overflow-y-auto py-10 px-4">
                    <div className="w-full max-w-3xl border border-neutral-800 bg-black">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-900">
                            <div className="font-mono text-cyan-400 text-xs uppercase tracking-widest">
                                {editing.id ? "edit changelog" : "new changelog"}
                            </div>
                            <button
                                onClick={() => setEditing(null)}
                                className="p-1 border border-neutral-800 hover:border-cyan-400/60 hover:text-cyan-400"
                            >
                                <X size={14} />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="grid grid-cols-3 gap-3">
                                <input
                                    placeholder="Version e.g. 1.1.0"
                                    value={editing.version}
                                    onChange={(e) => setEditing((s) => ({ ...s, version: e.target.value }))}
                                    data-testid="changelog-version-input"
                                    className="bg-black border border-neutral-800 focus:border-cyan-400 outline-none px-3 py-2 font-mono text-sm"
                                />
                                <select
                                    value={editing.type}
                                    onChange={(e) => setEditing((s) => ({ ...s, type: e.target.value }))}
                                    className="bg-black border border-neutral-800 focus:border-cyan-400 outline-none px-3 py-2 font-mono text-sm"
                                >
                                    {TYPES.map((t) => (
                                        <option key={t} value={t}>
                                            {t}
                                        </option>
                                    ))}
                                </select>
                                <input
                                    type="date"
                                    value={editing.released_at?.slice(0, 10) || ""}
                                    onChange={(e) =>
                                        setEditing((s) => ({
                                            ...s,
                                            released_at: e.target.value
                                                ? new Date(e.target.value).toISOString()
                                                : "",
                                        }))
                                    }
                                    className="bg-black border border-neutral-800 focus:border-cyan-400 outline-none px-3 py-2 font-mono text-sm"
                                />
                            </div>
                            <input
                                placeholder="Title"
                                value={editing.title}
                                onChange={(e) => setEditing((s) => ({ ...s, title: e.target.value }))}
                                className="w-full bg-black border border-neutral-800 focus:border-cyan-400 outline-none px-3 py-2 font-mono text-sm"
                            />
                            <WysiwygEditor
                                value={editing.content}
                                onChange={(v) => setEditing((s) => ({ ...s, content: v }))}
                            />
                            {err && (
                                <div className="border border-red-500/40 bg-red-500/10 text-red-300 px-3 py-2 font-mono text-xs">
                                    [ERR] {err}
                                </div>
                            )}
                            <div className="flex gap-3 justify-end pt-3 border-t border-neutral-900">
                                <button
                                    onClick={() => setEditing(null)}
                                    className="px-4 py-2 border border-neutral-800 hover:border-cyan-400/60 font-mono text-xs uppercase tracking-widest"
                                >
                                    cancel
                                </button>
                                <button
                                    onClick={save}
                                    disabled={saving}
                                    data-testid="save-changelog-btn"
                                    className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-400 text-black font-mono text-xs uppercase tracking-widest font-bold hover:bg-cyan-300 disabled:opacity-50"
                                >
                                    <Save size={14} /> {saving ? "saving…" : "save"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
}
