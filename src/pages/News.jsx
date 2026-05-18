import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, trackEvent } from "../lib/api";
import { Search, Tag, Calendar, ArrowRight } from "lucide-react";

const PAGE_SIZE = 9;

export default function News() {
    const [data, setData] = useState({
        items: [],
        total: 0,
        categories: [],
        tags: [],
    });
    const [page, setPage] = useState(1);
    const [q, setQ] = useState("");
    const [category, setCategory] = useState(null);
    const [tag, setTag] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        trackEvent("pageview", "/news");
    }, []);

    useEffect(() => {
        setLoading(true);
        const params = new URLSearchParams();
        params.set("page", page);
        params.set("page_size", PAGE_SIZE);
        if (q) params.set("q", q);
        if (category) params.set("category", category);
        if (tag) params.set("tag", tag);
        api.get(`/posts?${params.toString()}`)
            .then((r) => setData(r.data))
            .finally(() => setLoading(false));
    }, [page, q, category, tag]);

    const totalPages = Math.max(1, Math.ceil(data.total / PAGE_SIZE));

    return (
        <div>
            <section className="border-b border-neutral-900">
                <div className="max-w-7xl mx-auto px-6 lg:px-8 py-16">
                    <div className="font-mono text-cyan-400 text-xs uppercase tracking-[0.3em] mb-3">
                        // /var/aetherxos/news
                    </div>
                    <h1 className="font-mono text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight">
                        News &amp; Announcements
                    </h1>
                    <p className="text-neutral-400 mt-4 max-w-2xl">
                        Releases, engineering deep-dives, community updates,
                        and security advisories — straight from the AetherXOS
                        core team.
                    </p>
                </div>
            </section>

            <div className="max-w-7xl mx-auto px-6 lg:px-8 py-10">
                <div className="grid lg:grid-cols-[1fr_260px] gap-10">
                    <div>
                        <div className="flex gap-2 mb-6">
                            <div className="flex-1 flex items-center border border-neutral-800 focus-within:border-cyan-400/60 px-3">
                                <Search
                                    size={14}
                                    className="text-neutral-500"
                                />
                                <input
                                    value={q}
                                    onChange={(e) => {
                                        setQ(e.target.value);
                                        setPage(1);
                                    }}
                                    placeholder="search posts…"
                                    data-testid="news-search"
                                    className="bg-transparent px-3 py-2 font-mono text-sm outline-none w-full"
                                />
                            </div>
                            {(category || tag) && (
                                <button
                                    onClick={() => {
                                        setCategory(null);
                                        setTag(null);
                                        setPage(1);
                                    }}
                                    className="px-3 py-2 border border-neutral-800 font-mono text-xs uppercase hover:border-cyan-400/60 hover:text-cyan-400"
                                >
                                    clear filters
                                </button>
                            )}
                        </div>

                        {loading ? (
                            <div className="font-mono text-neutral-500">
                                loading...
                            </div>
                        ) : data.items.length === 0 ? (
                            <div className="border border-dashed border-neutral-800 p-12 text-center text-neutral-500 font-mono text-sm">
                                no posts match your filters.
                            </div>
                        ) : (
                            <div className="grid sm:grid-cols-2 gap-px bg-neutral-900 border border-neutral-900">
                                {data.items.map((p) => (
                                    <Link
                                        key={p.id}
                                        to={`/news/${p.slug}`}
                                        data-testid={`post-card-${p.slug}`}
                                        className="bg-black p-6 hover:bg-[#080808] transition-colors group flex flex-col"
                                    >
                                        <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-cyan-400 mb-3">
                                            <span>{p.category}</span>
                                            <span className="text-neutral-700">
                                                ·
                                            </span>
                                            <span className="text-neutral-500 flex items-center gap-1">
                                                <Calendar size={11} />
                                                {new Date(
                                                    p.created_at,
                                                ).toLocaleDateString()}
                                            </span>
                                        </div>
                                        <h3 className="font-mono text-lg font-bold tracking-tight group-hover:text-cyan-400 transition-colors">
                                            {p.title}
                                        </h3>
                                        <p className="text-neutral-400 text-sm mt-3 flex-1">
                                            {p.excerpt}
                                        </p>
                                        <div className="mt-4 flex items-center gap-2 flex-wrap">
                                            {(p.tags || []).map((t) => (
                                                <span
                                                    key={t}
                                                    className="font-mono text-[10px] text-neutral-500 border border-neutral-800 px-1.5 py-0.5"
                                                >
                                                    #{t}
                                                </span>
                                            ))}
                                        </div>
                                        <div className="mt-5 inline-flex items-center gap-1 text-cyan-400 font-mono text-xs uppercase tracking-widest">
                                            read <ArrowRight size={12} />
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        )}

                        {totalPages > 1 && (
                            <div className="flex items-center justify-between mt-8 font-mono text-xs uppercase tracking-widest">
                                <button
                                    disabled={page <= 1}
                                    onClick={() => setPage(page - 1)}
                                    data-testid="news-prev"
                                    className="px-3 py-2 border border-neutral-800 disabled:opacity-30 hover:border-cyan-400/60 hover:text-cyan-400"
                                >
                                    ← prev
                                </button>
                                <span className="text-neutral-500">
                                    page {page} / {totalPages}
                                </span>
                                <button
                                    disabled={page >= totalPages}
                                    onClick={() => setPage(page + 1)}
                                    data-testid="news-next"
                                    className="px-3 py-2 border border-neutral-800 disabled:opacity-30 hover:border-cyan-400/60 hover:text-cyan-400"
                                >
                                    next →
                                </button>
                            </div>
                        )}
                    </div>

                    <aside className="space-y-8">
                        <div>
                            <div className="font-mono text-xs uppercase tracking-widest text-cyan-400 mb-3">
                                Categories
                            </div>
                            <ul className="space-y-1">
                                {(data.categories || []).map((c) => (
                                    <li key={c}>
                                        <button
                                            data-testid={`category-${c}`}
                                            onClick={() => {
                                                setCategory(c);
                                                setPage(1);
                                            }}
                                            className={`w-full text-left px-3 py-2 font-mono text-sm border ${category === c ? "border-cyan-400/60 text-cyan-400" : "border-neutral-900 text-neutral-300 hover:border-neutral-700"}`}
                                        >
                                            {c}
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        </div>
                        <div>
                            <div className="font-mono text-xs uppercase tracking-widest text-cyan-400 mb-3 flex items-center gap-1">
                                <Tag size={12} /> Tags
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {(data.tags || []).map((t) => (
                                    <button
                                        key={t}
                                        onClick={() => {
                                            setTag(t);
                                            setPage(1);
                                        }}
                                        className={`font-mono text-[11px] px-2 py-1 border ${tag === t ? "border-cyan-400/60 text-cyan-400" : "border-neutral-900 text-neutral-400 hover:border-neutral-700"}`}
                                    >
                                        #{t}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </aside>
                </div>
            </div>
        </div>
    );
}
