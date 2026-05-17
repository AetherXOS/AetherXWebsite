import React, { useEffect, useState } from "react";
import { trackEvent } from "../lib/api";
import { Cpu, Layers3, Boxes, Lock, Gauge, Network, FolderTree, Search, Upload, FileText, ChevronDown, ChevronRight } from "lucide-react";

const ARCH_DIAGRAM =
    "https://static.prod-images.emergentagent.com/jobs/517d1884-94a5-453f-a4b2-655a9a8ce7d2/images/527531bf35a0c05ca4b33674efedd4e3d4d7298c37e62a10815b3c21af55b5cc.png";

const DEFAULT_CONFIG = "";

export default function Architecture() {
    const [configText, setConfigText] = useState(DEFAULT_CONFIG);
    const [searchQuery, setSearchQuery] = useState("");
    const [expandedCats, setExpandedCats] = useState({
        "Exokernel Core Options": true,
        "Memory Management Architecture": true,
        "Security Hardening": true
    });

    useEffect(() => {
        trackEvent("pageview", "/architecture");
    }, []);

    // Parse standard .config or Cargo.toml strings into grouped categories
    const parseConfig = (text) => {
        const lines = text.split("\n");
        let currentCategory = "General Options";
        const groups = {};

        // Detect if the file is Cargo.toml/TOML format
        const isToml = text.includes("[package]") || text.includes("[features]") || text.includes("[dependencies]") || text.includes("dependencies.");

        if (isToml) {
            lines.forEach((line) => {
                const trimmed = line.trim();
                if (!trimmed || trimmed.startsWith("#")) return;

                if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
                    currentCategory = trimmed.slice(1, -1).trim().toUpperCase();
                    return;
                }

                const parts = trimmed.split("=");
                if (parts.length >= 2) {
                    const key = parts[0].trim();
                    let value = parts.slice(1).join("=").trim();
                    // Clean TOML quotes, brackets and arrays
                    value = value.replace(/^["'\[\s]+|["'\]\s]+$/g, "");
                    if (!value) value = "enabled";

                    if (!groups[currentCategory]) {
                        groups[currentCategory] = [];
                    }
                    groups[currentCategory].push({ key, value });
                }
            });
            return groups;
        }

        // Standard .config format
        lines.forEach((line) => {
            const trimmed = line.trim();
            if (!trimmed) return;

            if (trimmed.startsWith("#")) {
                const headerMatch = trimmed.match(/^#\s*([A-Za-z0-9\s&()\-]+)$/);
                if (headerMatch && !trimmed.includes("Config Version") && !trimmed.includes("Target Architecture")) {
                    currentCategory = headerMatch[1].trim();
                }
                return;
            }

            const parts = trimmed.split("=");
            if (parts.length >= 2) {
                const key = parts[0].trim();
                const value = parts.slice(1).join("=").trim();
                
                if (!groups[currentCategory]) {
                    groups[currentCategory] = [];
                }
                groups[currentCategory].push({ key, value });
            }
        });
        return groups;
    };

    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (evt) => {
            if (evt.target.result) {
                setConfigText(evt.target.result);
                // Expand all categories on custom config upload
                const parsed = parseConfig(evt.target.result);
                const allExpanded = {};
                Object.keys(parsed).forEach(cat => allExpanded[cat] = true);
                setExpandedCats(allExpanded);
            }
        };
        reader.readAsText(file);
    };

    const toggleCategory = (cat) => {
        setExpandedCats(s => ({ ...s, [cat]: !s[cat] }));
    };

    const parsedGroups = parseConfig(configText);

    // Apply search query filter
    const filteredGroups = {};
    Object.keys(parsedGroups).forEach(cat => {
        const items = parsedGroups[cat].filter(
            item => item.key.toLowerCase().includes(searchQuery.toLowerCase()) || 
                    item.value.toLowerCase().includes(searchQuery.toLowerCase())
        );
        if (items.length > 0) {
            filteredGroups[cat] = items;
        }
    });

    return (
        <div>
            <section className="border-b border-neutral-900">
                <div className="max-w-7xl mx-auto px-6 lg:px-8 py-16">
                    <div className="font-mono text-cyan-400 text-xs uppercase tracking-[0.3em] mb-3">
                        // /arch/aether/v1
                    </div>
                    <h1 className="font-mono text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight">
                        Architecture
                    </h1>
                    <p className="text-neutral-400 mt-4 max-w-2xl">
                        AetherXOS rethinks the operating system around two
                        ideas: <em className="text-cyan-400">expose hardware
                        safely</em> via capabilities, and{" "}
                        <em className="text-cyan-400">
                            let applications build their own OS
                        </em>{" "}
                        as a Library OS.
                    </p>
                </div>
            </section>

            <section className="max-w-7xl mx-auto px-6 lg:px-8 py-16 grid lg:grid-cols-2 gap-12">
                <div>
                    <h2 className="font-mono text-2xl font-bold tracking-tight">
                        Monolithic vs. Exokernel
                    </h2>
                    <p className="text-neutral-400 mt-4 leading-relaxed">
                        A monolithic kernel hides hardware behind thick
                        abstractions: a single file system, a single scheduler,
                        a single networking stack. Every application pays the
                        cost of that one-size-fits-all design — every syscall,
                        every page fault, every context switch.
                    </p>
                    <p className="text-neutral-400 mt-4 leading-relaxed">
                        An <span className="text-cyan-400">exokernel</span>{" "}
                        does the opposite. It only does what a kernel must:
                        track resource ownership and enforce capability
                        boundaries. Everything else — paging, scheduling,
                        filesystems — is moved into application-linked{" "}
                        <span className="text-cyan-400">library OS</span>{" "}
                        layers. Your app chooses its OS.
                    </p>
                    <div className="grid grid-cols-2 gap-px mt-8 bg-neutral-900 border border-neutral-900">
                        <div className="bg-black p-5">
                            <div className="font-mono text-[11px] uppercase tracking-widest text-neutral-500">
                                Monolithic
                            </div>
                            <ul className="mt-3 space-y-1 font-mono text-xs text-neutral-300">
                                <li>· thick syscall surface</li>
                                <li>· kernel does scheduling</li>
                                <li>· one network stack</li>
                                <li>· hidden hardware</li>
                            </ul>
                        </div>
                        <div className="bg-black p-5">
                            <div className="font-mono text-[11px] uppercase tracking-widest text-cyan-400">
                                Exokernel + LibOS
                            </div>
                            <ul className="mt-3 space-y-1 font-mono text-xs text-cyan-300">
                                <li>· thin capability surface</li>
                                <li>· user-level scheduling</li>
                                <li>· per-app network stack</li>
                                <li>· hardware in user-space</li>
                            </ul>
                        </div>
                    </div>
                </div>
                <div className="border border-neutral-900 bg-black p-3">
                    <img
                        src={ARCH_DIAGRAM}
                        alt="AetherXOS architecture diagram showing Exokernel vs Monolithic"
                        className="w-full h-auto"
                        data-testid="arch-diagram"
                    />
                    <div className="font-mono text-[10px] uppercase tracking-widest text-neutral-500 mt-2 px-2">
                        fig.1 — Exokernel core exposes raw resource caps to
                        LibOS layers.
                    </div>
                </div>
            </section>

            {/* Pillars */}
            <section className="max-w-7xl mx-auto px-6 lg:px-8 pb-20">
                <h2 className="font-mono text-2xl font-bold tracking-tight mb-8">
                    Design Pillars
                </h2>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 border border-neutral-900">
                    {[
                        { icon: Cpu, t: "Capability-first", d: "Every resource — pages, NICs, IRQs — is a typed capability. No ambient authority." },
                        { icon: Layers3, t: "Library OS", d: "POSIX, real-time, unikernel. Linked into your binary. Replaceable per-process." },
                        { icon: Boxes, t: "Microdrivers", d: "Drivers run in user space, isolated by capabilities. Crashes don't take down the host." },
                        { icon: Lock, t: "W^X + Rust core", d: "Memory-safe core, hardware-enforced W^X, signed capability invocations." },
                        { icon: Gauge, t: "Bare-metal latency", d: "Syscall p50 < 90ns. Zero-copy I/O. User-level interrupts on supported NICs." },
                        { icon: Network, t: "Composable I/O", d: "io_uring-style queues exposed natively. Your app does its own batching." },
                    ].map((p, i) => {
                        const Icon = p.icon;
                        return (
                            <div
                                key={p.t}
                                className={`p-7 ${i % 3 !== 2 ? "lg:border-r" : ""} ${i % 2 === 0 ? "md:border-r" : ""} border-neutral-900 ${i < 3 ? "lg:border-b" : ""}`}
                            >
                                <div className="inline-flex items-center justify-center w-9 h-9 border border-neutral-800 text-cyan-400 mb-4">
                                    <Icon size={16} />
                                </div>
                                <div className="font-mono font-bold tracking-tight">
                                    {p.t}
                                </div>
                                <p className="text-neutral-400 text-sm mt-2 leading-relaxed">
                                    {p.d}
                                </p>
                            </div>
                        );
                    })}
                </div>
            </section>

            {/* VISUAL KERNEL CONFIG CONFIG TREE PARSER */}
            <section className="max-w-7xl mx-auto px-6 lg:px-8 pb-24">
                <div className="border border-neutral-900 bg-neutral-950/20 p-6 sm:p-8">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                        <div>
                            <div className="flex items-center gap-2 font-mono text-cyan-400 text-xs uppercase tracking-widest mb-1.5">
                                <FolderTree size={14} className="text-cyan-400 animate-pulse" /> CONFIG ARCHITECTURE AUDIT
                            </div>
                            <h2 className="font-mono text-xl sm:text-2xl font-bold tracking-tight text-white">
                                Interactive Kernel Config Tree
                            </h2>
                        </div>
                        
                        {/* Custom config file upload */}
                        <label className="flex items-center gap-2 border border-neutral-800 hover:border-cyan-400/50 hover:text-cyan-400 font-mono text-xs uppercase tracking-wider px-3 py-2 cursor-pointer transition-colors h-fit select-none bg-black">
                            <Upload size={13} />
                            <span>Upload Config / TOML</span>
                            <input
                                type="file"
                                accept=".config,.toml,text/plain,Cargo.toml"
                                onChange={handleFileUpload}
                                className="hidden"
                            />
                        </label>
                    </div>

                    <p className="text-neutral-400 font-mono text-xs leading-relaxed max-w-3xl mb-6">
                        Examine active exokernel parameters or verify driver mappings on-the-fly. Upload your own <code>aetherxos.config</code> tree to visualize dependency trees instantly.
                    </p>

                    {/* Search and control bar */}
                    <div className="relative mb-6">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-600" />
                        <input
                            type="text"
                            placeholder="Filter flags by name or state (e.g. CONFIG_LIBOS)..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-black border border-neutral-800 focus:border-cyan-400 outline-none text-white pl-10 pr-4 py-2 font-mono text-xs"
                        />
                    </div>

                    {/* Interactive config categories tree */}
                    <div className="border border-neutral-900 bg-black divide-y divide-neutral-950 font-mono text-xs">
                        {Object.keys(filteredGroups).length === 0 ? (
                            <div className="p-12 text-center text-neutral-600 text-xs">
                                No matching exokernel flags detected. Try filtering for "CONFIG_".
                            </div>
                        ) : (
                            Object.keys(filteredGroups).map((cat) => {
                                const isExpanded = expandedCats[cat] || false;
                                return (
                                    <div key={cat} className="overflow-hidden">
                                        {/* Category node header */}
                                        <div
                                            onClick={() => toggleCategory(cat)}
                                            className="px-4 py-3 bg-neutral-950 hover:bg-neutral-900/60 flex items-center justify-between cursor-pointer select-none text-neutral-300 font-bold"
                                        >
                                            <div className="flex items-center gap-2">
                                                <FileText size={13} className="text-cyan-400" />
                                                <span>{cat}</span>
                                                <span className="text-[10px] text-neutral-500 font-normal">
                                                    ({filteredGroups[cat].length} flags)
                                                </span>
                                            </div>
                                            {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                        </div>

                                        {/* Collapsible nodes */}
                                        {isExpanded && (
                                            <div className="p-2 bg-black divide-y divide-neutral-950/40 pl-6 border-l border-neutral-900">
                                                {filteredGroups[cat].map((item) => {
                                                    const isEnabled = item.value === "y";
                                                    return (
                                                        <div key={item.key} className="py-2.5 px-3 flex flex-wrap items-center justify-between gap-2 hover:bg-neutral-950/50">
                                                            <div className="text-neutral-400 font-bold tracking-tight text-[11px] break-all min-w-0">
                                                                {item.key}
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                {isEnabled ? (
                                                                    <span className="text-[10px] font-bold border border-emerald-500/30 text-emerald-400 bg-emerald-500/5 px-2 py-0.5 uppercase">
                                                                        ENABLED
                                                                    </span>
                                                                ) : (
                                                                    <span className="text-[10px] font-bold border border-neutral-800 text-neutral-500 bg-neutral-950 px-2 py-0.5">
                                                                        {item.value}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            </section>
        </div>
    );
}
