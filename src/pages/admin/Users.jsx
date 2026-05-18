import React, { useEffect, useState } from "react";
import AdminLayout from "../../components/AdminLayout";
import { api, formatApiError } from "../../lib/api";
import { useAuth } from "../../context/AuthContext";
import { Plus, Trash2, Shield, UserCog, X } from "lucide-react";

const ROLES = ["admin", "editor"];

export default function AdminUsers() {
    const [items, setItems] = useState([]);
    const [creating, setCreating] = useState(false);
    const [form, setForm] = useState({ email: "", password: "", name: "", role: "editor" });
    const [err, setErr] = useState(null);
    const [busy, setBusy] = useState(false);
    const { user: me } = useAuth();

    const load = () => api.get("/admin/users").then((r) => setItems(r.data.items || []));
    useEffect(() => {
        load();
    }, []);

    async function create() {
        setBusy(true);
        setErr(null);
        try {
            await api.post("/admin/users", form);
            setCreating(false);
            setForm({ email: "", password: "", name: "", role: "editor" });
            load();
        } catch (e) {
            setErr(formatApiError(e.response?.data?.detail) || e.message);
        } finally {
            setBusy(false);
        }
    }

    async function changeRole(uid, role) {
        try {
            await api.put(`/admin/users/${uid}/role`, { role });
            load();
        } catch (e) {
            window.alert(formatApiError(e.response?.data?.detail) || e.message);
        }
    }

    async function remove(uid) {
        if (!window.confirm("Delete this user?")) return;
        try {
            await api.delete(`/admin/users/${uid}`);
            load();
        } catch (e) {
            window.alert(formatApiError(e.response?.data?.detail) || e.message);
        }
    }

    return (
        <AdminLayout title="Users & Roles">
            <div className="flex justify-between items-center mb-6">
                <p className="text-neutral-400 font-mono text-sm">
                    Invite team members. <span className="text-cyan-400">admin</span> has full
                    access; <span className="text-cyan-400">editor</span> can manage News, Changelogs
                    and Docs only.
                </p>
                <button
                    onClick={() => setCreating(true)}
                    data-testid="new-user-btn"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-400 text-black font-mono text-xs uppercase tracking-widest font-bold hover:bg-cyan-300"
                >
                    <Plus size={14} /> Invite User
                </button>
            </div>

            <div className="border border-neutral-900">
                <table className="w-full font-mono text-sm">
                    <thead className="border-b border-neutral-900 text-left text-[10px] uppercase tracking-widest text-neutral-500">
                        <tr>
                            <th className="px-4 py-3">Email</th>
                            <th className="px-4 py-3">Name</th>
                            <th className="px-4 py-3">Role</th>
                            <th className="px-4 py-3">Created</th>
                            <th className="px-4 py-3"></th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.map((u) => (
                            <tr key={u.id} className="border-b border-neutral-900 hover:bg-neutral-950">
                                <td className="px-4 py-3">
                                    {u.email}
                                    {me?.email === u.email && (
                                        <span className="ml-2 font-mono text-[10px] uppercase tracking-widest text-cyan-400">
                                            (you)
                                        </span>
                                    )}
                                </td>
                                <td className="px-4 py-3 text-neutral-300">{u.name}</td>
                                <td className="px-4 py-3">
                                    <span
                                        className={`inline-flex items-center gap-1 font-mono text-[11px] uppercase tracking-widest px-2 py-0.5 border ${
                                            u.role === "admin"
                                                ? "text-cyan-400 border-cyan-400/50"
                                                : "text-yellow-400 border-yellow-400/50"
                                        }`}
                                    >
                                        {u.role === "admin" ? <Shield size={10} /> : <UserCog size={10} />}
                                        {u.role}
                                    </span>
                                </td>
                                <td className="px-4 py-3 text-xs text-neutral-500">
                                    {new Date(u.created_at).toLocaleDateString()}
                                </td>
                                <td className="px-4 py-3 text-right space-x-2">
                                    {me?.email !== u.email && (
                                        <>
                                            <select
                                                value={u.role}
                                                onChange={(e) => changeRole(u.id, e.target.value)}
                                                className="bg-black border border-neutral-800 text-xs px-2 py-1 font-mono"
                                            >
                                                {ROLES.map((r) => (
                                                    <option key={r} value={r}>
                                                        {r}
                                                    </option>
                                                ))}
                                            </select>
                                            <button
                                                onClick={() => remove(u.id)}
                                                className="p-1.5 border border-neutral-800 hover:border-red-400/60 hover:text-red-400"
                                            >
                                                <Trash2 size={12} />
                                            </button>
                                        </>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {creating && (
                <div className="fixed inset-0 bg-black/80 z-50 flex items-start justify-center overflow-y-auto py-10 px-4">
                    <div className="w-full max-w-md border border-neutral-800 bg-black">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-900">
                            <div className="font-mono text-cyan-400 text-xs uppercase tracking-widest">
                                invite user
                            </div>
                            <button
                                onClick={() => setCreating(false)}
                                className="p-1 border border-neutral-800 hover:border-cyan-400/60 hover:text-cyan-400"
                            >
                                <X size={14} />
                            </button>
                        </div>
                        <div className="p-6 space-y-3">
                            <input
                                type="email"
                                placeholder="email"
                                value={form.email}
                                onChange={(e) => setForm((s) => ({ ...s, email: e.target.value }))}
                                data-testid="new-user-email"
                                className="w-full bg-black border border-neutral-800 focus:border-cyan-400 outline-none px-3 py-2 font-mono text-sm"
                            />
                            <input
                                placeholder="display name (optional)"
                                value={form.name}
                                onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}
                                className="w-full bg-black border border-neutral-800 focus:border-cyan-400 outline-none px-3 py-2 font-mono text-sm"
                            />
                            <input
                                type="password"
                                placeholder="temporary password"
                                value={form.password}
                                onChange={(e) => setForm((s) => ({ ...s, password: e.target.value }))}
                                data-testid="new-user-password"
                                className="w-full bg-black border border-neutral-800 focus:border-cyan-400 outline-none px-3 py-2 font-mono text-sm"
                            />
                            <select
                                value={form.role}
                                onChange={(e) => setForm((s) => ({ ...s, role: e.target.value }))}
                                className="w-full bg-black border border-neutral-800 focus:border-cyan-400 outline-none px-3 py-2 font-mono text-sm"
                            >
                                {ROLES.map((r) => (
                                    <option key={r} value={r}>{r}</option>
                                ))}
                            </select>
                            {err && (
                                <div className="border border-red-500/40 bg-red-500/10 text-red-300 px-3 py-2 font-mono text-xs">
                                    [ERR] {err}
                                </div>
                            )}
                            <div className="flex justify-end gap-3 pt-3 border-t border-neutral-900">
                                <button
                                    onClick={() => setCreating(false)}
                                    className="px-4 py-2 border border-neutral-800 hover:border-cyan-400/60 font-mono text-xs uppercase tracking-widest"
                                >
                                    cancel
                                </button>
                                <button
                                    onClick={create}
                                    disabled={busy}
                                    data-testid="create-user-submit"
                                    className="px-4 py-2 bg-cyan-400 text-black font-mono text-xs uppercase tracking-widest font-bold hover:bg-cyan-300 disabled:opacity-50"
                                >
                                    {busy ? "creating…" : "create"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
}
