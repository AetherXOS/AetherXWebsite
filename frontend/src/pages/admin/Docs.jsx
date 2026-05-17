import React, { useEffect, useState } from "react";
import AdminLayout from "../../components/AdminLayout";
import MarkdownEditor from "../../components/MarkdownEditor";
import { api, formatApiError } from "../../lib/api";
import { Plus, Trash2, Edit, X, Save } from "lucide-react";

const EMPTY = {
    slug: "",
    title: "",
    section: "Introduction",
    order: 0,
    body: "",
    published: true,
};

export default function AdminDocs() {
    const [items, setItems] = useState([]);
    const [editing, setEditing] = useState(null);
    const [err, setErr] = useState(null);
    const [saving, setSaving] = useState(false);

    const load = () =>
        api.get(`/docs?include_unpublished=true`).then((r) => setItems(r.data.items || []));
    useEffect(() => {
        load();
    }, []);

    async function save() {
        setSaving(true);
        setErr(null);
        try {
            const body = { ...editing };
            if (editing.id) await api.put(`/docs/${editing.id}`, body);
            else await api.post(`/docs`, body);
            setEditing(null);
            load();
        } catch (e) {
            setErr(formatApiError(e.response?.data?.detail) || e.message);
        } finally {
            setSaving(false);
        }
    }
    async function remove(id) {
        if (!window.confirm("Delete this doc page?")) return;
        await api.delete(`/docs/${id}`);
        load();
    }

    const sections = [
        "Introduction",
        "Exokernel Core",
        "Library OS",
        "Drivers",
        "Operations",
    ];

    return (
        <AdminLayout title="Documentation">
            <div className="flex justify-between items-center mb-6">
                <p className="text-neutral-400 font-mono text-sm">
                    Manage Markdown-powered doc pages served at <code>/docs</code>.
                </p>
                <button
                    onClick={() => {
                        setEditing({ ...EMPTY });
                        setErr(null);
                    }}
                    data-testid="new-doc-btn"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-400 text-black font-mono text-xs uppercase tracking-widest font-bold hover:bg-cyan-300"
                >
                    <Plus size={14} /> New Doc
                </button>
            </div>

            <div className="border border-neutral-900 overflow-x-auto">
                <table className="w-full font-mono text-sm">
                    <thead className="border-b border-neutral-900 text-left text-[10px] uppercase tracking-widest text-neutral-500">
                        <tr>
                            <th className="px-4 py-3">Section</th>
                            <th className="px-4 py-3">Order</th>
                            <th className="px-4 py-3">Title</th>
                            <th className="px-4 py-3">Slug</th>
                            <th className="px-4 py-3">Status</th>
                            <th className="px-4 py-3"></th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.map((d) => (
                            <tr key={d.id} className="border-b border-neutral-900 hover:bg-neutral-950">
                                <td className="px-4 py-3 text-cyan-400">{d.section}</td>
                                <td className="px-4 py-3 text-neutral-500">{d.order}</td>
                                <td className="px-4 py-3">{d.title}</td>
                                <td className="px-4 py-3 text-neutral-500">/{d.slug}</td>
                                <td className="px-4 py-3 text-xs">
                                    {d.published ? (
                                        <span className="text-cyan-400">live</span>
                                    ) : (
                                        <span className="text-neutral-500">draft</span>
                                    )}
                                </td>
                                <td className="px-4 py-3 text-right space-x-2">
                                    <button
                                        onClick={() => {
                                            setEditing(d);
                                            setErr(null);
                                        }}
                                        className="p-1.5 border border-neutral-800 hover:border-cyan-400/60 hover:text-cyan-400"
                                    >
                                        <Edit size={12} />
                                    </button>
                                    <button
                                        onClick={() => remove(d.id)}
                                        className="p-1.5 border border-neutral-800 hover:border-red-400/60 hover:text-red-400"
                                    >
                                        <Trash2 size={12} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {items.length === 0 && (
                            <tr>
                                <td colSpan="6" className="p-10 text-center text-neutral-500">
                                    no docs yet.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {editing && (
                <div className="fixed inset-0 bg-black/80 z-50 flex items-start justify-center overflow-y-auto py-10 px-4">
                    <div className="w-full max-w-4xl border border-neutral-800 bg-black">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-900">
                            <div className="font-mono text-cyan-400 text-xs uppercase tracking-widest">
                                {editing.id ? "edit doc" : "new doc"}
                            </div>
                            <button
                                onClick={() => setEditing(null)}
                                className="p-1 border border-neutral-800 hover:border-cyan-400/60 hover:text-cyan-400"
                            >
                                <X size={14} />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-3">
                                <input
                                    placeholder="Title"
                                    value={editing.title}
                                    onChange={(e) => setEditing((s) => ({ ...s, title: e.target.value }))}
                                    data-testid="doc-title-input"
                                    className="bg-black border border-neutral-800 focus:border-cyan-400 outline-none px-3 py-2 font-mono text-sm"
                                />
                                <input
                                    placeholder="slug (e.g. quickstart)"
                                    value={editing.slug}
                                    onChange={(e) =>
                                        setEditing((s) => ({ ...s, slug: e.target.value.toLowerCase().replace(/[^\w-]+/g, "-") }))
                                    }
                                    data-testid="doc-slug-input"
                                    className="bg-black border border-neutral-800 focus:border-cyan-400 outline-none px-3 py-2 font-mono text-sm"
                                />
                            </div>
                            <div className="grid grid-cols-3 gap-3">
                                <select
                                    value={editing.section}
                                    onChange={(e) => setEditing((s) => ({ ...s, section: e.target.value }))}
                                    className="bg-black border border-neutral-800 focus:border-cyan-400 outline-none px-3 py-2 font-mono text-sm"
                                >
                                    {sections.map((s) => (
                                        <option key={s} value={s}>{s}</option>
                                    ))}
                                </select>
                                <input
                                    type="number"
                                    placeholder="order"
                                    value={editing.order ?? 0}
                                    onChange={(e) => setEditing((s) => ({ ...s, order: parseInt(e.target.value || "0") }))}
                                    className="bg-black border border-neutral-800 focus:border-cyan-400 outline-none px-3 py-2 font-mono text-sm"
                                />
                                <label className="flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-neutral-400">
                                    <input
                                        type="checkbox"
                                        checked={editing.published}
                                        onChange={(e) =>
                                            setEditing((s) => ({ ...s, published: e.target.checked }))
                                        }
                                        className="accent-cyan-400"
                                    />{" "}
                                    Published
                                </label>
                            </div>
                            <MarkdownEditor
                                value={editing.body}
                                onChange={(v) => setEditing((s) => ({ ...s, body: v }))}
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
                                    data-testid="save-doc-btn"
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
