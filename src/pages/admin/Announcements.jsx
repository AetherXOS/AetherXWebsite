import React, { useEffect, useState } from "react";
import AdminLayout from "../../components/AdminLayout";
import { api } from "../../lib/api";
import { Megaphone, Trash2, Save, ToggleLeft, ToggleRight, Sparkles, AlertTriangle, Plus } from "lucide-react";
import { toast } from "sonner";

export default function Announcements() {
    const [announcements, setAnnouncements] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    // Form states
    const [title, setTitle] = useState("");
    const [content, setContent] = useState("");
    const [type, setType] = useState("banner");
    const [active, setActive] = useState(true);
    const [dismissible, setDismissible] = useState(true);
    const [isCreating, setIsCreating] = useState(false);

    useEffect(() => {
        loadAnnouncements();
    }, []);

    const loadAnnouncements = async () => {
        setIsLoading(true);
        try {
            const res = await api.get("/admin/announcements");
            const d = res.data;
            const list = Array.isArray(d) ? d : (d && d.items) ? d.items : [];
            setAnnouncements(list || []);
        } catch (err) {
            console.error(err);
            toast.error("Failed to load announcements");
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        if (!title.trim() || !content.trim()) {
            toast.error("Please fill in all fields");
            return;
        }

        setIsCreating(true);
        try {
            const res = await api.post("/admin/announcements", {
                title,
                content,
                type,
                active,
                dismissible
            });
            toast.success("Announcement published successfully!");
            setTitle("");
            setContent("");
            setType("banner");
            setActive(true);
            setDismissible(true);
            setAnnouncements([res.data, ...announcements]);
        } catch (err) {
            console.error(err);
            toast.error("Failed to publish announcement");
        } finally {
            setIsCreating(false);
        }
    };

    const toggleActive = async (ann) => {
        try {
            const updated = { ...ann, active: !ann.active };
            const res = await api.put(`/admin/announcements/${ann.id}`, updated);
            toast.success(`Announcement ${res.data.active ? "activated" : "deactivated"}`);
            setAnnouncements(announcements.map((a) => (a.id === ann.id ? res.data : a)));
        } catch (err) {
            console.error(err);
            toast.error("Failed to toggle state");
        }
    };

    const handleDelete = async (id) => {
        if (!confirm("Are you sure you want to delete this announcement?")) return;

        try {
            await api.delete(`/admin/announcements/${id}`);
            toast.success("Announcement deleted successfully");
            setAnnouncements(announcements.filter((a) => a.id !== id));
        } catch (err) {
            console.error(err);
            toast.error("Failed to delete announcement");
        }
    };

    return (
        <AdminLayout title="Global Announcements CMS">
            <div className="grid grid-cols-1 xl:grid-cols-[400px_1fr] gap-8 font-mono text-sm">
                {/* Create Section */}
                <div className="border border-neutral-900 bg-[#050505] p-6 space-y-6 self-start">
                    <div className="border-b border-neutral-900 pb-3 flex items-center gap-2 text-cyan-400">
                        <Plus size={16} />
                        <span className="font-bold uppercase tracking-wider">Publish New Broadcast</span>
                    </div>

                    <form onSubmit={handleCreate} className="space-y-4">
                        <div className="space-y-1.5">
                            <label className="text-[10px] text-neutral-500 uppercase tracking-widest block font-bold">
                                Broadcast Title
                            </label>
                            <input
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="e.g. GPG Rotation Completed"
                                className="w-full bg-black border border-neutral-900 focus:border-cyan-400 outline-none text-white px-3 py-2"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[10px] text-neutral-500 uppercase tracking-widest block font-bold">
                                Message Body / Content
                            </label>
                            <textarea
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                                rows={4}
                                placeholder="Write the details for users..."
                                className="w-full bg-black border border-neutral-900 focus:border-cyan-400 outline-none text-white px-3 py-2 resize-none"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-[10px] text-neutral-500 uppercase tracking-widest block font-bold">
                                    Display Format
                                </label>
                                <select
                                    value={type}
                                    onChange={(e) => setType(e.target.value)}
                                    className="w-full bg-black border border-neutral-900 focus:border-cyan-400 outline-none text-white px-3 py-2"
                                >
                                    <option value="banner">Header Banner</option>
                                    <option value="popup">Modal Popup</option>
                                </select>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[10px] text-neutral-500 uppercase tracking-widest block font-bold">
                                    Dismissible
                                </label>
                                <select
                                    value={dismissible ? "yes" : "no"}
                                    onChange={(e) => setDismissible(e.target.value === "yes")}
                                    className="w-full bg-black border border-neutral-900 focus:border-cyan-400 outline-none text-white px-3 py-2"
                                >
                                    <option value="yes">Dismissible</option>
                                    <option value="no">Sticky (Fixed)</option>
                                </select>
                            </div>
                        </div>

                        <div className="flex items-center justify-between border-t border-neutral-900 pt-4">
                            <span className="text-xs text-neutral-400">Initialize Broadcast on Publish:</span>
                            <button
                                type="button"
                                onClick={() => setActive(!active)}
                                className={`flex items-center gap-1.5 text-xs font-bold ${
                                    active ? "text-cyan-400" : "text-neutral-500"
                                }`}
                            >
                                {active ? <ToggleRight size={24} /> : <ToggleLeft size={24} />}
                            </button>
                        </div>

                        <button
                            type="submit"
                            disabled={isCreating}
                            className="w-full py-2.5 bg-cyan-400 text-black font-bold uppercase hover:bg-cyan-300 transition-colors flex items-center justify-center gap-2"
                        >
                            <Megaphone size={14} /> Publish Broadcast
                        </button>
                    </form>
                </div>

                {/* List Section */}
                <div className="border border-neutral-900 bg-[#050505] p-6 space-y-6">
                    <div className="border-b border-neutral-900 pb-3 flex items-center gap-2 text-cyan-400">
                        <Sparkles size={16} />
                        <span className="font-bold uppercase tracking-wider">Active Broadcast History</span>
                    </div>

                    {isLoading ? (
                        <div className="text-neutral-500 text-center py-10 font-mono text-xs">
                            $ cat /var/log/announcements.db ...
                        </div>
                    ) : announcements.length === 0 ? (
                        <div className="text-neutral-500 text-center py-10 border border-dashed border-neutral-900 text-xs">
                            No broadcasts registered. Fill in the form on the left to publish one.
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {announcements.map((ann) => (
                                <div
                                    key={ann.id}
                                    className={`border border-neutral-900 p-4 relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 transition-colors ${
                                        ann.active ? "bg-cyan-400/[0.02] border-cyan-400/20" : "bg-black"
                                    }`}
                                >
                                    <div className="space-y-1.5 max-w-xl">
                                        <div className="flex items-center gap-2">
                                            <span
                                                className={`text-[9px] uppercase font-bold tracking-widest px-1.5 py-0.5 border ${
                                                    ann.type === "banner"
                                                        ? "border-cyan-400/40 text-cyan-400"
                                                        : "border-purple-400/40 text-purple-400"
                                                }`}
                                            >
                                                {ann.type}
                                            </span>
                                            <span className="text-xs text-neutral-500">
                                                {new Date(ann.created_at).toLocaleString()}
                                            </span>
                                        </div>
                                        <h4 className="font-bold text-white text-base">{ann.title}</h4>
                                        <p className="text-neutral-400 text-xs leading-relaxed">{ann.content}</p>
                                    </div>

                                    <div className="flex items-center gap-4 sm:border-l sm:border-neutral-900 sm:pl-4">
                                        <button
                                            onClick={() => toggleActive(ann)}
                                            className={`flex flex-col items-center gap-1.5 font-bold ${
                                                ann.active ? "text-cyan-400" : "text-neutral-500"
                                            }`}
                                            title={ann.active ? "Deactivate" : "Activate"}
                                        >
                                            {ann.active ? <ToggleRight size={24} /> : <ToggleLeft size={24} />}
                                            <span className="text-[9px] uppercase tracking-widest">
                                                {ann.active ? "Active" : "Paused"}
                                            </span>
                                        </button>

                                        <button
                                            onClick={() => handleDelete(ann.id)}
                                            className="text-neutral-600 hover:text-red-400 flex flex-col items-center gap-1.5"
                                            title="Delete"
                                        >
                                            <Trash2 size={16} />
                                            <span className="text-[9px] uppercase tracking-widest">Delete</span>
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </AdminLayout>
    );
}
