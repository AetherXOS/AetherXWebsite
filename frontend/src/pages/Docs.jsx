import React, { useEffect, useState } from "react";
import { trackEvent } from "../lib/api";
import { Book } from "lucide-react";

const SECTIONS = [
    {
        id: "intro",
        title: "Introduction",
        pages: [
            { id: "welcome", title: "Welcome" },
            { id: "philosophy", title: "Design Philosophy" },
            { id: "quickstart", title: "Quickstart" },
        ],
    },
    {
        id: "core",
        title: "Exokernel Core",
        pages: [
            { id: "capabilities", title: "Capabilities" },
            { id: "memory", title: "Memory & Paging" },
            { id: "ipc", title: "IPC Primitives" },
            { id: "syscalls", title: "System Calls" },
        ],
    },
    {
        id: "libos",
        title: "Building a Library OS",
        pages: [
            { id: "scaffold", title: "Scaffold a LibOS" },
            { id: "posix", title: "Linking the POSIX Layer" },
            { id: "rt", title: "Real-time Layer" },
            { id: "custom-sched", title: "Custom Scheduler" },
        ],
    },
    {
        id: "drivers",
        title: "Drivers",
        pages: [
            { id: "nic", title: "Zero-copy NIC" },
            { id: "nvme", title: "NVMe" },
            { id: "gpu", title: "GPU Compute" },
        ],
    },
    {
        id: "ops",
        title: "Operations",
        pages: [
            { id: "install", title: "Installation" },
            { id: "boot", title: "Boot & Init" },
            { id: "monitor", title: "Monitoring" },
        ],
    },
];

const CONTENT = {
    welcome: {
        title: "Welcome to AetherXOS",
        body: "<p>AetherXOS is an exokernel + Library OS. This documentation walks you from your first capability invocation to writing your own library OS.</p><h2>Who is this for?</h2><ul><li>Systems engineers tired of fighting their kernel</li><li>Latency-sensitive workloads (HFT, RT control, RTC)</li><li>Curious kernel hackers</li></ul>",
    },
    capabilities: {
        title: "Capabilities",
        body: "<p>A capability is a typed, unforgeable reference to a resource. The exokernel only allows operations on resources you hold a capability for.</p><pre><code>let nic_cap = bootinfo.find_cap::&lt;Nic&gt;()?;\nlet pkt = nic_cap.recv_zerocopy()?;</code></pre>",
    },
    scaffold: {
        title: "Scaffold a LibOS",
        body: "<p>A LibOS is just a crate that links against <code>aether-core</code> and exposes whatever runtime you want.</p><ol><li><code>cargo new --lib mylibos</code></li><li>Add <code>aether-core = \"1.0\"</code></li><li>Implement the <code>LibOs</code> trait</li><li>Boot it with <code>aether-init</code></li></ol>",
    },
};

export default function Docs() {
    const [active, setActive] = useState("welcome");

    useEffect(() => {
        trackEvent("pageview", "/docs");
    }, []);

    const page = CONTENT[active] || {
        title: SECTIONS.flatMap((s) => s.pages).find((p) => p.id === active)
            ?.title || "Coming Soon",
        body: "<p>This documentation page is on our roadmap. Want to contribute? Open a PR on the <code>aether-docs</code> repository.</p>",
    };

    return (
        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-12 grid lg:grid-cols-[260px_1fr] gap-12">
            <aside className="lg:sticky lg:top-24 self-start border-r border-neutral-900 pr-6 lg:h-[calc(100vh-8rem)] overflow-y-auto">
                <div className="flex items-center gap-2 mb-6 font-mono text-cyan-400 text-xs uppercase tracking-[0.3em]">
                    <Book size={12} /> docs
                </div>
                <nav className="space-y-6">
                    {SECTIONS.map((sec) => (
                        <div key={sec.id}>
                            <div className="font-mono text-[10px] uppercase tracking-widest text-neutral-500 mb-2">
                                {sec.title}
                            </div>
                            <ul className="space-y-0.5">
                                {sec.pages.map((p) => (
                                    <li key={p.id}>
                                        <button
                                            data-testid={`docs-nav-${p.id}`}
                                            onClick={() => setActive(p.id)}
                                            className={`w-full text-left px-3 py-1.5 font-mono text-sm border-l-2 transition-colors ${
                                                active === p.id
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
            <article>
                <div className="font-mono text-cyan-400 text-xs uppercase tracking-[0.3em] mb-3">
                    // docs / {active}
                </div>
                <h1 className="font-mono text-4xl font-bold tracking-tight">
                    {page.title}
                </h1>
                <div
                    className="prose-aether mt-8"
                    dangerouslySetInnerHTML={{ __html: page.body }}
                />
            </article>
        </div>
    );
}
