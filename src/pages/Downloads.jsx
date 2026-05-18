import React, { useEffect, useMemo, useState } from "react";
import { api, API_BASE, trackEvent } from "../lib/api";
import {
    Download,
    Copy,
    Check,
    Shield,
    HardDrive,
    Cpu as CpuIcon,
    Calendar,
    Hash,
} from "lucide-react";

const TABS = [
    {
        key: "stable",
        label: "Stable",
        desc: "Production-ready releases. Long-term support, security backports, full LibOS coverage.",
        accent: "text-cyan-400",
    },
    {
        key: "beta",
        label: "Beta",
        desc: "Pre-release candidates. New features, mostly stable, expect occasional regressions.",
        accent: "text-yellow-400",
    },
    {
        key: "nightly",
        label: "Nightly",
        desc: "Built from main every 24h. Bleeding-edge, may break — for kernel hackers only.",
        accent: "text-red-400",
    },
];

function fmtBytes(n) {
    if (!n && n !== 0) return "—";
    const u = ["B", "KB", "MB", "GB"];
    let i = 0;
    while (n >= 1024 && i < u.length - 1) {
        n /= 1024;
        i++;
    }
    return `${n.toFixed(n < 10 ? 1 : 0)} ${u[i]}`;
}
function fmtDate(s) {
    if (!s) return "—";
    try {
        return new Date(s).toLocaleDateString(undefined, {
            year: "numeric",
            month: "short",
            day: "2-digit",
        });
    } catch {
        return s;
    }
}

export default function Downloads() {
    const [tab, setTab] = useState("stable");
    const [items, setItems] = useState([]);
    const [distros, setDistros] = useState([]);
    const [copied, setCopied] = useState(null);

    useEffect(() => {
        trackEvent("pageview", "/downloads");
    }, []);

    useEffect(() => {
        api.get("/releases").then((r) => setItems(r.data.items || []));
        api.get("/distros").then((r) => setDistros(r.data || []));
    }, []);

    const grouped = useMemo(() => {
        const g = { stable: [], beta: [], nightly: [] };
        items.forEach((r) => {
            if (g[r.channel]) g[r.channel].push(r);
        });
        return g;
    }, [items]);

    function copy(text, key) {
        navigator.clipboard.writeText(text);
        setCopied(key);
        setTimeout(() => setCopied(null), 1400);
    }

    function handleDownload(rel) {
        trackEvent("download", "/downloads", {
            version: rel.version,
            channel: rel.channel,
        });
    }

    return (
        <div>
            <section className="border-b border-neutral-900">
                <div className="max-w-7xl mx-auto px-6 lg:px-8 py-16 grid-bg relative">
                    <div className="font-mono text-cyan-400 text-xs uppercase tracking-[0.3em] mb-3">
                        // /var/aetherxos/dist
                    </div>
                    <h1 className="font-mono text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight">
                        Download Center
                    </h1>
                    <p className="text-neutral-400 mt-4 max-w-2xl">
                        Stable, Beta, and Nightly builds — signed, hashed, and
                        ready to flash. Every artifact is reproducible from the
                        commit hash listed in the changelog.
                    </p>
                </div>
            </section>

            {/* Channel tabs */}
            <div className="max-w-7xl mx-auto px-6 lg:px-8 pt-10">
                <div className="flex border border-neutral-900 mb-6 overflow-hidden">
                    {TABS.map((t) => (
                        <button
                            key={t.key}
                            data-testid={`channel-tab-${t.key}`}
                            onClick={() => setTab(t.key)}
                            className={`flex-1 px-5 py-4 font-mono text-sm uppercase tracking-wider transition-colors text-left border-r border-neutral-900 last:border-r-0 ${
                                tab === t.key
                                    ? "bg-cyan-400/5 text-cyan-400 border-b-2 border-b-cyan-400"
                                    : "text-neutral-400 hover:text-white hover:bg-neutral-950"
                            }`}
                        >
                            <div className="flex items-center justify-between">
                                <span>{t.label}</span>
                                <span className="text-[10px] text-neutral-500">
                                    {grouped[t.key]?.length || 0} builds
                                </span>
                            </div>
                            <div className="text-[11px] text-neutral-500 mt-1 normal-case font-sans tracking-normal max-w-md">
                                {t.desc}
                            </div>
                        </button>
                    ))}
                </div>

                <div className="space-y-5 pb-20">
                    {(grouped[tab] || []).length === 0 && (
                        <div className="border border-dashed border-neutral-800 p-12 text-center text-neutral-500 font-mono text-sm">
                            no builds available in this channel yet.
                        </div>
                    )}
                    {(grouped[tab] || []).map((r) => (
                        <article
                            key={r.id}
                            data-testid={`release-${r.id}`}
                            className="border border-neutral-900 bg-[#070707] hover:border-cyan-400/40 transition-colors p-6 lg:p-8"
                        >
                            <div className="flex flex-wrap items-start gap-6 justify-between">
                                <div className="space-y-3 min-w-0">
                                    <div className="flex items-center gap-3 flex-wrap">
                                        <span
                                            className={`font-mono text-[11px] uppercase tracking-widest px-2 py-1 border ${
                                                r.channel === "stable"
                                                    ? "text-cyan-400 border-cyan-400/50"
                                                    : r.channel === "beta"
                                                      ? "text-yellow-400 border-yellow-400/50"
                                                      : "text-red-400 border-red-400/50"
                                            }`}
                                        >
                                            {r.channel}
                                        </span>
                                        <h2 className="font-mono text-2xl font-bold tracking-tight">
                                            {r.title}
                                        </h2>
                                        <span className="font-mono text-sm text-neutral-500">
                                            {r.version}
                                        </span>
                                    </div>
                                    {r.notes && (
                                        <p className="text-neutral-400 max-w-3xl">
                                            {r.notes}
                                        </p>
                                    )}
                                    <div className="grid sm:grid-cols-4 gap-3 font-mono text-xs pt-3 border-t border-neutral-900">
                                        <div className="flex items-center gap-2 text-neutral-400">
                                            <Calendar
                                                size={14}
                                                className="text-cyan-400"
                                            />
                                            <span>{fmtDate(r.created_at)}</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-neutral-400">
                                            <HardDrive
                                                size={14}
                                                className="text-cyan-400"
                                            />
                                            <span>{fmtBytes(r.file_size)}</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-neutral-400">
                                            <CpuIcon
                                                size={14}
                                                className="text-cyan-400"
                                            />
                                            <span>arch: {r.arch}</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-neutral-400">
                                            <Shield
                                                size={14}
                                                className="text-cyan-400"
                                            />
                                            <span>
                                                req: {r.min_ram_gb}GB RAM ·{" "}
                                                {r.min_disk_gb}GB disk
                                            </span>
                                        </div>
                                    </div>
                                    {r.sha256 && (
                                        <div className="flex items-center gap-2 mt-3 max-w-full w-full min-w-0 overflow-hidden">
                                            <Hash
                                                size={14}
                                                className="text-cyan-400 shrink-0"
                                            />
                                            <code className="font-mono text-[11px] text-neutral-400 truncate min-w-0 flex-1 break-all">
                                                sha256: {r.sha256}
                                            </code>
                                            <button
                                                data-testid={`copy-sha-${r.id}`}
                                                onClick={() =>
                                                    copy(r.sha256, r.id)
                                                }
                                                className="p-1.5 border border-neutral-800 hover:border-cyan-400/60 hover:text-cyan-400 shrink-0"
                                                title="Copy SHA256"
                                            >
                                                {copied === r.id ? (
                                                    <Check size={12} />
                                                ) : (
                                                    <Copy size={12} />
                                                )}
                                            </button>
                                        </div>
                                    )}
                                </div>
                                <div className="flex flex-col items-end gap-2 shrink-0">
                                    {r.storage_kind === "local" ? (
                                        <a
                                            href={`${API_BASE}/releases/${r.id}/download`}
                                            target="_blank"
                                            rel="noreferrer"
                                            onClick={() => handleDownload(r)}
                                            data-testid={`download-btn-${r.id}`}
                                            className="inline-flex items-center gap-2 px-5 py-3 bg-cyan-400 text-black font-mono text-sm font-bold uppercase tracking-wider hover:bg-cyan-300"
                                        >
                                            <Download size={16} /> Download ISO
                                        </a>
                                    ) : (
                                        <a
                                            href={r.file_url || "#"}
                                            target="_blank"
                                            rel="noreferrer"
                                            onClick={() => handleDownload(r)}
                                            data-testid={`download-btn-${r.id}`}
                                            className="inline-flex items-center gap-2 px-5 py-3 bg-cyan-400 text-black font-mono text-sm font-bold uppercase tracking-wider hover:bg-cyan-300"
                                        >
                                            <Download size={16} /> Download ISO
                                        </a>
                                    )}
                                    <span className="font-mono text-[10px] uppercase tracking-widest text-neutral-500">
                                        {(r.downloads || 0).toLocaleString()}{" "}
                                        downloads
                                    </span>
                                </div>
                            </div>
                        </article>
                    ))}
                </div>
            </div>

            {/* CUSTOM ISO BUILDERS & ALTERNATIVE DISTROS */}
            <div className="max-w-7xl mx-auto px-6 lg:px-8 pb-24 border-t border-neutral-900 pt-16">
                <div className="grid md:grid-cols-2 gap-12">
                    <div className="space-y-6">
                        <div className="font-mono text-cyan-400 text-xs uppercase tracking-[0.3em]">
                            // exokernel virtualization & multi-distro
                        </div>
                        <h2 className="font-mono text-3xl font-bold tracking-tight">
                            Alternative OS Environments
                        </h2>
                        <p className="text-neutral-400 text-sm leading-relaxed">
                            Because AetherXOS is an exokernel + Library OS rather than a monolithic kernel, it does not lock you into a single distribution environment. You can bind third-party OS userlands (like Ubuntu or raw Debian) to run on top of our hardened bare-metal capabilities.
                        </p>
                        <div className="border border-neutral-900 bg-[#050505] p-5 space-y-4 font-mono text-xs">
                            <h4 className="text-white font-bold uppercase tracking-wider flex items-center gap-2">
                                <span className="w-1.5 h-1.5 bg-cyan-400" />
                                Available Distro Templates
                            </h4>
                            <p className="text-neutral-500 text-xs font-sans">
                                Select and download pre-configured distro wrappers bundled with the AetherX core kernel directly from our Releases register:
                            </p>
                            <ul className="space-y-3">
                                {distros.map((d) => (
                                    <li key={d.id} className="flex flex-col gap-1 border-b border-neutral-900 pb-3 last:border-b-0 last:pb-0">
                                        <div className="flex items-center justify-between">
                                            <span className="text-neutral-300 font-mono font-bold">{d.name}</span>
                                            <span className={`text-[9px] uppercase tracking-widest border px-1.5 py-0.5 font-mono ${
                                                d.status_color === "cyan" 
                                                    ? "text-cyan-400 border-cyan-400/20" 
                                                    : d.status_color === "yellow" 
                                                        ? "text-yellow-400 border-yellow-400/20" 
                                                        : "text-red-400 border-red-400/20"
                                            }`}>
                                                {d.status}
                                            </span>
                                        </div>
                                        <p className="text-neutral-500 font-sans text-[11px] normal-case tracking-normal">
                                            {d.description}
                                        </p>
                                        <code className="text-[10px] text-cyan-400/80 mt-1 select-all bg-black px-1.5 py-1 border border-neutral-900 block truncate font-mono">
                                            $ {d.command}
                                        </code>
                                    </li>
                                ))}
                                {distros.length === 0 && (
                                    <li className="text-neutral-500 text-center py-2 font-mono text-xs">No active distro templates registered.</li>
                                )}
                            </ul>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div className="font-mono text-cyan-400 text-xs uppercase tracking-[0.3em]">
                            // build it yourself
                        </div>
                        <h2 className="font-mono text-3xl font-bold tracking-tight">
                            Local Custom ISO Builder
                        </h2>
                        <p className="text-neutral-400 text-sm leading-relaxed">
                            Want to customize scheduler algorithms, load app-specific paging systems, or build your own custom OS installer ISO? You can compile the full exokernel system directly using our interactive rust-powered toolchain helper.
                        </p>
                        <div className="bg-[#030303] border border-neutral-900 p-6 space-y-4">
                            <h4 className="font-mono text-white text-xs uppercase tracking-wider">
                                Quick Compile Guide
                            </h4>
                            <div className="space-y-3 font-mono text-[11px] text-neutral-400">
                                <div className="flex gap-2">
                                    <span className="text-cyan-400 select-none">1.</span>
                                    <span>Clone the core repository:<br/>
                                        <code className="text-white block mt-1 bg-black p-2 border border-neutral-900">git clone https://github.com/AetherXOS/AetherXOS.git</code>
                                    </span>
                                </div>
                                <div className="flex gap-2">
                                    <span className="text-cyan-400 select-none">2.</span>
                                    <span>Ensure Rust toolchain is installed:<br/>
                                        <code className="text-white block mt-1 bg-black p-2 border border-neutral-900">rustup target add x86_64-unknown-none</code>
                                    </span>
                                </div>
                                <div className="flex gap-2">
                                    <span className="text-cyan-400 select-none">3.</span>
                                    <span>Run the interactive xtask ISO builder:<br/>
                                        <code className="text-white block mt-1 bg-black p-2 border border-neutral-900">cargo xtask distro-iso</code>
                                    </span>
                                </div>
                            </div>
                            <p className="text-[10px] text-neutral-500 font-mono italic">
                                * The xtask script will guide you step-by-step to inject your application payload and compile the bootable ISO automatically.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
