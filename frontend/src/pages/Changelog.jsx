import React, { useEffect, useState } from "react";
import { api, trackEvent } from "../lib/api";
import { GitCommitHorizontal, Sparkles, Bug, Shield, Zap, AlertTriangle } from "lucide-react";

const TYPE_META = {
    feature: { label: "feature", icon: Sparkles, color: "text-cyan-400 border-cyan-400/50" },
    fix: { label: "fix", icon: Bug, color: "text-green-400 border-green-400/50" },
    security: { label: "security", icon: Shield, color: "text-red-400 border-red-400/50" },
    perf: { label: "perf", icon: Zap, color: "text-yellow-400 border-yellow-400/50" },
    breaking: { label: "breaking", icon: AlertTriangle, color: "text-orange-400 border-orange-400/50" },
};

export default function Changelog() {
    const [items, setItems] = useState([]);

    useEffect(() => {
        trackEvent("pageview", "/changelog");
        api.get("/changelogs").then((r) => setItems(r.data.items || []));
    }, []);

    return (
        <div>
            <section className="border-b border-neutral-900">
                <div className="max-w-7xl mx-auto px-6 lg:px-8 py-16">
                    <div className="font-mono text-cyan-400 text-xs uppercase tracking-[0.3em] mb-3">
                        // git log --pretty=fuller
                    </div>
                    <h1 className="font-mono text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight">
                        Changelog
                    </h1>
                    <p className="text-neutral-400 mt-4 max-w-2xl">
                        Every release. Every architectural change. Every
                        system-call. The full git-style history of AetherXOS.
                    </p>
                </div>
            </section>

            <div className="max-w-4xl mx-auto px-6 lg:px-8 py-16">
                <ol className="relative border-l border-neutral-800 pl-6 space-y-12">
                    {items.map((c) => {
                        const meta = TYPE_META[c.type] || TYPE_META.feature;
                        const Icon = meta.icon;
                        return (
                            <li
                                key={c.id}
                                data-testid={`changelog-${c.version}`}
                                className="relative"
                            >
                                <span className="absolute -left-[31px] top-1 inline-flex items-center justify-center w-6 h-6 bg-black border border-cyan-400/60 text-cyan-400">
                                    <GitCommitHorizontal size={12} />
                                </span>
                                <div className="border border-neutral-900 bg-[#070707] p-6">
                                    <div className="flex items-center gap-3 flex-wrap mb-2">
                                        <span className="font-mono text-cyan-400 font-bold tracking-tight">
                                            v{c.version}
                                        </span>
                                        <span
                                            className={`font-mono text-[10px] uppercase tracking-widest px-2 py-0.5 border ${meta.color} inline-flex items-center gap-1`}
                                        >
                                            <Icon size={10} /> {meta.label}
                                        </span>
                                        <span className="font-mono text-xs text-neutral-500 ml-auto">
                                            {new Date(
                                                c.released_at,
                                            ).toLocaleDateString(undefined, {
                                                year: "numeric",
                                                month: "short",
                                                day: "2-digit",
                                            })}
                                        </span>
                                    </div>
                                    <h2 className="font-mono text-xl font-bold tracking-tight mb-3">
                                        {c.title}
                                    </h2>
                                    <div
                                        className="prose-aether text-sm"
                                        dangerouslySetInnerHTML={{
                                            __html: c.content,
                                        }}
                                    />
                                </div>
                            </li>
                        );
                    })}
                </ol>
            </div>
        </div>
    );
}
