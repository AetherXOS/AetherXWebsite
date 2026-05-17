import React, { useEffect, useMemo, useState } from "react";
import { api, trackEvent } from "../lib/api";
import { Book } from "lucide-react";

export default function Docs() {
    const [items, setItems] = useState([]);
    const [active, setActive] = useState(null);
    const [page, setPage] = useState(null);

    useEffect(() => {
        trackEvent("pageview", "/docs");
        api.get("/docs").then((r) => {
            setItems(r.data.items || []);
            if (r.data.items?.length) setActive(r.data.items[0].slug);
        });
    }, []);

    useEffect(() => {
        if (!active) return;
        api.get(`/docs/${active}`).then((r) => setPage(r.data));
    }, [active]);

    const sections = useMemo(() => {
        const out = {};
        items.forEach((it) => {
            (out[it.section] = out[it.section] || []).push(it);
        });
        Object.values(out).forEach((arr) =>
            arr.sort((a, b) => a.order - b.order),
        );
        return out;
    }, [items]);

    return (
        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-12 grid lg:grid-cols-[260px_1fr] gap-12">
            <aside className="hidden lg:block lg:sticky lg:top-24 self-start border-r border-neutral-900 pr-6 lg:max-h-[calc(100vh-8rem)] overflow-y-auto">
                <div className="flex items-center gap-2 mb-6 font-mono text-cyan-400 text-xs uppercase tracking-[0.3em]">
                    <Book size={12} /> docs
                </div>
                <nav className="space-y-6">
                    {Object.entries(sections).map(([section, pages]) => (
                        <div key={section}>
                            <div className="font-mono text-[10px] uppercase tracking-widest text-neutral-500 mb-2">
                                {section}
                            </div>
                            <ul className="space-y-0.5">
                                {pages.map((p) => (
                                    <li key={p.slug}>
                                        <button
                                            data-testid={`docs-nav-${p.slug}`}
                                            onClick={() => setActive(p.slug)}
                                            className={`w-full text-left px-3 py-1.5 font-mono text-sm border-l-2 transition-colors ${
                                                active === p.slug
                                                    ? "border-cyan-400 text-cyan-400 bg-cyan-400/5"
                                                    : "border-transparent text-neutral-400 hover:text-white hover:bg-neutral-950"
                                            }`}
                                        >
                                            {p.title}
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </nav>
            </aside>

            <div className="min-w-0 w-full overflow-hidden">
                {/* Mobile Document Selector Dropdown */}
                <div className="lg:hidden mb-8 border border-neutral-900 bg-[#070707] p-4 space-y-2">
                    <label htmlFor="docs-mobile-select" className="block font-mono text-[10px] uppercase tracking-[0.2em] text-neutral-500">
                        // Select Documentation Topic
                    </label>
                    <select
                        id="docs-mobile-select"
                        value={active || ""}
                        onChange={(e) => setActive(e.target.value)}
                        className="w-full bg-black border border-neutral-800 text-white font-mono text-xs px-3 py-2.5 outline-none focus:border-cyan-400 cursor-pointer"
                    >
                        {Object.entries(sections).map(([section, pages]) => (
                            <optgroup key={section} label={section} className="bg-black text-white font-mono text-xs uppercase">
                                {pages.map((p) => (
                                    <option key={p.slug} value={p.slug} className="normal-case">
                                        {p.title}
                                    </option>
                                ))}
                            </optgroup>
                        ))}
                    </select>
                </div>

                <article className="min-w-0 w-full overflow-hidden">
                    {page ? (
                        <>
                            <div className="font-mono text-cyan-400 text-xs uppercase tracking-[0.3em] mb-3">
                                // docs / {page.slug}
                            </div>
                            <h1 className="font-mono text-3xl sm:text-4xl font-bold tracking-tight">
                                {page.title}
                            </h1>
                            <div
                                className="prose-aether mt-8"
                                dangerouslySetInnerHTML={{ __html: page.html }}
                                data-testid="docs-content"
                            />
                        </>
                    ) : (
                        <div className="font-mono text-cyan-400">loading…</div>
                    )}
                </article>
            </div>
        </div>
    );
}
