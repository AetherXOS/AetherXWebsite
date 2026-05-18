import React, { useEffect, useState } from "react";
import AdminLayout from "../../components/AdminLayout";
import WysiwygEditor from "../../components/WysiwygEditor";
import { api, formatApiError } from "../../lib/api";
import { Plus, Trash2, Edit, X, Save, Eye, EyeOff } from "lucide-react";

const EMPTY = {
    title: "",
    excerpt: "",
    content: "",
    category: "Engineering",
    tags: [],
    published: true,
};

export default function AdminPosts() {
    const [items, setItems] = useState([]);
    const [editing, setEditing] = useState(null); // null | post object
    const [tagInput, setTagInput] = useState("");
    const [err, setErr] = useState(null);
    const [saving, setSaving] = useState(false);

    function load() {
        api.get(`/posts?include_unpublished=true&page_size=200`).then((r) => {
            const payload = r.data;
            const itemsArr = Array.isArray(payload) ? payload : (payload && (payload.items || payload)) || [];
            setItems(itemsArr || []);
        }).catch(() => setItems([]));
    }
    useEffect(load, []);

    function openNew() {
        setEditing({ ...EMPTY });
        setTagInput("");
        setErr(null);
    }

    async function save() {
        setSaving(true);
        setErr(null);
        try {
            const body = { ...editing, tags: editing.tags || [] };
            if (editing.id) {
                await api.put(`/posts/${editing.id}`, body);
            } else {
                await api.post(`/posts`, body);
            }
            setEditing(null);
            load();
        } catch (e) {
            setErr(formatApiError(e.response?.data?.detail) || e.message);
        } finally {
            setSaving(false);
        }
    }

    async function remove(id) {
        if (!window.confirm("Delete this post?")) return;
        await api.delete(`/posts/${id}`);
        load();
    }

    function addTag() {
        const t = tagInput.trim().toLowerCase();
        if (!t) return;
        setEditing((s) => ({ ...s, tags: [...new Set([...(s.tags || []), t])] }));
        setTagInput("");
    }

    return (
        <AdminLayout title="News CMS">
            <div className="flex justify-between items-center mb-6">
                <p className="text-neutral-400 font-mono text-sm">
                    Create and publish news articles with the WYSIWYG editor.
                </p>
                <button
                    onClick={openNew}
                    data-testid="new-post-btn"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-400 text-black font-mono text-xs uppercase tracking-widest font-bold hover:bg-cyan-300"
                >
                    <Plus size={14} /> New Post
                </button>
            </div>

            <div className="border border-neutral-900">
                <table className="w-full font-mono text-sm">
                    <thead className="border-b border-neutral-900 text-left text-[10px] uppercase tracking-widest text-neutral-500">
                        <tr>
                            <th className="px-4 py-3">Title</th>
                            <th className="px-4 py-3">Category</th>
                            <th className="px-4 py-3">Status</th>
                            <th className="px-4 py-3">Updated</th>
                            <th className="px-4 py-3"></th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.map((p) => (
                            <tr
                                key={p.id}
                                className="border-b border-neutral-900 hover:bg-neutral-950"
                            >
                                <td className="px-4 py-3 text-white">
                                    {p.title}
                                    <div className="text-[10px] text-neutral-600">
                                        /{p.slug}
                                    </div>
                                </td>
                                <td className="px-4 py-3 text-cyan-400">
                                    {p.category}
                                </td>
                                <td className="px-4 py-3">
                                    {p.published ? (
                                        <span className="inline-flex items-center gap-1 text-cyan-400 text-xs">
                                            <Eye size={12} /> live
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center gap-1 text-neutral-500 text-xs">
                                            <EyeOff size={12} /> draft
                                        </span>
                                    )}
                                </td>
                                <td className="px-4 py-3 text-neutral-500 text-xs">
                                    {new Date(p.updated_at).toLocaleString()}
                                </td>
                                <td className="px-4 py-3 text-right space-x-2">
                                    <button
                                        onClick={() => {
                                            setEditing(p);
                                            setErr(null);
                                        }}
                                        data-testid={`edit-post-${p.id}`}
                                        className="p-1.5 border border-neutral-800 hover:border-cyan-400/60 hover:text-cyan-400"
                                    >
                                        <Edit size={12} />
                                    </button>
                                    <button
                                        onClick={() => remove(p.id)}
                                        data-testid={`delete-post-${p.id}`}
                                        className="p-1.5 border border-neutral-800 hover:border-red-400/60 hover:text-red-400"
                                    >
                                        <Trash2 size={12} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {items.length === 0 && (
                            <tr>
                                <td
                                    colSpan="5"
                                    className="p-10 text-center text-neutral-500"
                                >
                                    no posts yet.
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
                                {editing.id ? "edit post" : "new post"}
                            </div>
                            <button
                                onClick={() => setEditing(null)}
                                className="p-1 border border-neutral-800 hover:border-cyan-400/60 hover:text-cyan-400"
                            >
                                <X size={14} />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <input
                                placeholder="Title"
                                value={editing.title}
                                onChange={(e) =>
                                    setEditing((s) => ({
                                        ...s,
                                        title: e.target.value,
                                    }))
                                }
                                data-testid="post-title-input"
                                className="w-full bg-black border border-neutral-800 focus:border-cyan-400 outline-none px-3 py-2 font-mono text-lg"
                            />
                            <textarea
                                placeholder="Excerpt (1-2 lines, shown in listings)"
                                value={editing.excerpt}
                                onChange={(e) =>
                                    setEditing((s) => ({
                                        ...s,
                                        excerpt: e.target.value,
                                    }))
                                }
                                rows={2}
                                className="w-full bg-black border border-neutral-800 focus:border-cyan-400 outline-none px-3 py-2 font-mono text-sm"
                            />
                            <div className="grid grid-cols-2 gap-3">
                                <input
                                    placeholder="Category"
                                    value={editing.category}
                                    onChange={(e) =>
                                        setEditing((s) => ({
                                            ...s,
                                            category: e.target.value,
                                        }))
                                    }
                                    className="bg-black border border-neutral-800 focus:border-cyan-400 outline-none px-3 py-2 font-mono text-sm"
                                />
                                <label className="flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-neutral-400">
                                    <input
                                        type="checkbox"
                                        checked={editing.published}
                                        onChange={(e) =>
                                            setEditing((s) => ({
                                                ...s,
                                                published: e.target.checked,
                                            }))
                                        }
                                        className="accent-cyan-400"
                                    />{" "}
                                    Published
                                </label>
                            </div>
                            <div>
                                <div className="font-mono text-[11px] uppercase tracking-widest text-neutral-500 mb-2">
                                    Tags
                                </div>
                                <div className="flex gap-2 flex-wrap mb-2">
                                    {(editing.tags || []).map((t) => (
                                        <span
                                            key={t}
                                            className="inline-flex items-center gap-1 font-mono text-xs border border-neutral-800 px-2 py-1"
                                        >
                                            #{t}
                                            <button
                                                onClick={() =>
                                                    setEditing((s) => ({
                                                        ...s,
                                                        tags: s.tags.filter(
                                                            (x) => x !== t,
                                                        ),
                                                    }))
                                                }
                                                className="text-neutral-500 hover:text-red-400"
                                            >
                                                <X size={10} />
                                            </button>
                                        </span>
                                    ))}
                                </div>
                                <div className="flex gap-2">
                                    <input
                                        value={tagInput}
                                        onChange={(e) =>
                                            setTagInput(e.target.value)
                                        }
                                        onKeyDown={(e) =>
                                            e.key === "Enter" &&
                                            (e.preventDefault(), addTag())
                                        }
                                        placeholder="add tag…"
                                        className="bg-black border border-neutral-800 focus:border-cyan-400 outline-none px-3 py-1.5 font-mono text-xs flex-1"
                                    />
                                    <button
                                        onClick={addTag}
                                        className="px-3 py-1.5 border border-neutral-800 hover:border-cyan-400/60 hover:text-cyan-400 font-mono text-xs"
                                    >
                                        add
                                    </button>
                                </div>
                            </div>
                            <WysiwygEditor
                                value={editing.content}
                                onChange={(v) =>
                                    setEditing((s) => ({ ...s, content: v }))
                                }
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
                                    data-testid="save-post-btn"
                                    className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-400 text-black font-mono text-xs uppercase tracking-widest font-bold hover:bg-cyan-300 disabled:opacity-50"
                                >
                                    <Save size={14} />{" "}
                                    {saving ? "saving…" : "save post"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
}
