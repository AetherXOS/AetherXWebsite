import React, { useEffect, useState } from "react";
import { Link } from "react-router";
import TerminalBoot from "../components/TerminalBoot";
import { api, trackEvent } from "../lib/api";
import { normalizeSettings } from "../lib/settings";
import {
    Cpu,
    Layers3,
    SlidersHorizontal,
    Shield,
    Zap,
    Network,
    ArrowRight,
    Download,
    Github,
} from "lucide-react";

const FEATURES = [
    {
        icon: Cpu,
        title: "Exokernel Core",
        desc: "Bypass the monolithic abstraction tax. Applications talk to hardware directly through capabilities — securely.",
        meta: "syscall_latency: live",
    },
    {
        icon: Layers3,
        title: "Library OS Abstractions",
        desc: "Compose your runtime target: POSIX-like capabilities, UNIX-like signals, real-time loops, or unikernels. Swap the entire OS stack on a per-process basis.",
        meta: "libos_layers: modular",
    },
    {
        icon: SlidersHorizontal,
        title: "Extreme Configurability",
        desc: "Kernel-free scheduling, custom paging, application-specific IPC. Tune the OS to your workload.",
        meta: "config_knobs: extensible",
    },
    {
        icon: Shield,
        title: "Memory Safety",
        desc: "Capability-table protection plus W^X enforcement. Rustified core, isolated drivers, zero ambient authority.",
        meta: "CVE_score: audited",
    },
    {
        icon: Zap,
        title: "Bare-metal Speed",
        desc: "Zero-copy I/O, direct page-table control, user-level interrupts. Faster than your hypervisor.",
        meta: "throughput: hardware-bound",
    },
    {
        icon: Network,
        title: "Built for the network era",
        desc: "100 GbE userland stack, io_uring-style queues, NIC offload primitives baked into the ABI.",
        meta: "rps: workload-dependent",
    },
];

export default function Home() {
    const [featuredPosts, setFeaturedPosts] = useState([]);
    const [activeIndex, setActiveIndex] = useState(0);
    const [starsCount, setStarsCount] = useState("—");
    const [siteSettings, setSiteSettings] = useState(normalizeSettings());
    const [metrics, setMetrics] = useState({
        syscall: "",
        throughput: "",
        bootstrap: "",
    });

    useEffect(() => {
        api.get("/posts?page_size=4")
            .then((res) => {
                setFeaturedPosts(res.data.items || []);
            })
            .catch((err) => console.error("Error loading homepage featured posts:", err));

        api.get("/settings")
            .then((res) => {
                if (res.data) {
                    setSiteSettings(normalizeSettings(res.data));
                }
            })
            .catch((err) => console.error("Error loading site settings:", err));

        api.get("/github/stars")
            .then((res) => {
                if (res.data && typeof res.data.stars === "number") {
                    const s = res.data.stars;
                    if (s >= 1000) {
                        setStarsCount(`${(s / 1000).toFixed(1)}k`);
                    } else {
                        setStarsCount(s.toString());
                    }
                }
            })
            .catch((err) => console.error("Error loading github stars:", err));

        api.get("/system/metrics")
            .then((res) => {
                if (res.data) {
                    setMetrics({
                        syscall: res.data.syscall || "",
                        throughput: res.data.throughput || "",
                        bootstrap: res.data.bootstrap || "",
                    });
                }
            })
            .catch((err) => console.error("Error loading system metrics:", err));

        trackEvent("pageview", "/");
    }, []);

    useEffect(() => {
        if (featuredPosts.length <= 1) return;
        const interval = setInterval(() => {
            setActiveIndex((idx) => (idx + 1) % featuredPosts.length);
        }, 5000);
        return () => clearInterval(interval);
    }, [featuredPosts]);

    return (
        <div className="relative">
            {/* HERO */}
            <section className="relative overflow-hidden border-b border-neutral-900">
                <div
                    className="absolute inset-0 grid-bg opacity-60 pointer-events-none"
                    aria-hidden
                />
                <div
                    className="absolute inset-0 radial-glow pointer-events-none"
                    aria-hidden
                />
                <div className="relative max-w-7xl mx-auto px-6 lg:px-8 pt-20 pb-24 grid lg:grid-cols-[1.05fr_1fr] gap-12 items-center">
                    <div className="space-y-7">
                        {(siteSettings.version || siteSettings.version_status) && (
                            <div className="inline-flex items-center gap-2 px-2.5 py-1 border border-cyan-400/40 text-cyan-400 font-mono text-[11px] uppercase tracking-[0.25em]">
                                <span className="w-1.5 h-1.5 bg-cyan-400 cyan-glow" />
                                {siteSettings.version || siteSettings.version_status}
                                {siteSettings.version && siteSettings.version_status ? ` · ${siteSettings.version_status}` : ""}
                            </div>
                        )}
                        <h1 className="font-mono text-4xl sm:text-5xl lg:text-6xl font-bold leading-[1.05] tracking-tight">
                            The kernel
                            <br />
                            should{" "}
                            <span className="text-cyan-400 cyan-text-glow">
                                get out of the way.
                            </span>
                        </h1>
                        <p className="text-neutral-400 text-base sm:text-lg max-w-xl leading-relaxed">
                            AetherXOS is an exokernel + Library OS featuring standard POSIX-like, UNIX-like, and Linux-compatible system call/API targets. By exposing raw hardware resources safely, AetherXOS eliminates monolithic abstraction taxes to deliver unparalleled bare-metal performance.
                        </p>
                        <div className="flex flex-wrap gap-3">
                            <Link
                                to="/downloads"
                                data-testid="hero-cta-download"
                                className="inline-flex items-center gap-2 px-5 py-3 bg-cyan-400 text-black font-mono text-sm font-bold uppercase tracking-wider hover:bg-cyan-300 transition-colors"
                            >
                                <Download size={16} /> Download release
                            </Link>
                            <Link
                                to="/architecture"
                                data-testid="hero-cta-arch"
                                className="inline-flex items-center gap-2 px-5 py-3 border border-neutral-700 hover:border-cyan-400/60 hover:text-cyan-400 font-mono text-sm uppercase tracking-wider transition-colors"
                            >
                                Read the architecture <ArrowRight size={16} />
                            </Link>
                            <a
                                href="https://github.com/AetherXOS/AetherXOS"
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-2 px-5 py-3 border border-neutral-800 hover:border-cyan-400/60 font-mono text-sm uppercase tracking-wider text-neutral-400 hover:text-cyan-400"
                            >
                                <Github size={16} /> {starsCount} ★
                            </a>
                        </div>
                        <dl className="grid grid-cols-3 gap-4 max-w-lg pt-6 border-t border-neutral-900">
                            {[
                                ["syscall", metrics.syscall],
                                ["throughput", metrics.throughput],
                                ["bootstrap", metrics.bootstrap],
                            ].map(([k, v]) => (
                                <div key={k}>
                                    <dt className="font-mono text-[10px] uppercase tracking-widest text-neutral-500">
                                        {k}
                                    </dt>
                                    <dd className="font-mono text-cyan-400 text-xl font-bold mt-1">
                                        {v || "—"}
                                    </dd>
                                </div>
                            ))}
                        </dl>
                    </div>
                    <div className="lg:pl-6">
                        <TerminalBoot />
                    </div>
                </div>
            </section>

            {/* FEATURED ARTICLES CAROUSEL */}
            {featuredPosts.length > 0 && (
                <section className="max-w-7xl mx-auto px-6 lg:px-8 pt-10 pb-4">
                    <div className="border border-cyan-400/20 bg-cyan-400/5 p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden">
                        {/* Neon accent grid details */}
                        <div className="absolute right-0 top-0 bottom-0 w-32 grid-bg opacity-10 pointer-events-none" />
                        
                        <div className="flex-1 space-y-3 z-10">
                            <div className="inline-flex items-center gap-2 px-2 py-0.5 border border-cyan-400/30 text-cyan-400 font-mono text-[9px] uppercase tracking-wider">
                                <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-ping" />
                                FEATURED ANNOUNCEMENT
                            </div>
                            <h3 className="font-mono text-xl sm:text-2xl font-bold text-white leading-tight">
                                {featuredPosts[activeIndex].title}
                            </h3>
                            <p className="text-neutral-400 text-xs sm:text-sm max-w-2xl leading-relaxed line-clamp-2">
                                {featuredPosts[activeIndex].excerpt}
                            </p>
                            <div className="flex items-center gap-4 text-[10px] text-neutral-500 font-mono">
                                <span>{new Date(featuredPosts[activeIndex].created_at).toLocaleDateString()}</span>
                                <span>·</span>
                                <span className="text-cyan-400/70">#{featuredPosts[activeIndex].category}</span>
                            </div>
                        </div>

                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 self-stretch md:self-auto z-10 whitespace-nowrap justify-center">
                            <Link
                                to={`/news/${featuredPosts[activeIndex].slug}`}
                                className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-cyan-400 text-black font-mono text-xs font-bold uppercase tracking-wider hover:bg-cyan-300 transition-colors"
                            >
                                Read Article <ArrowRight size={13} />
                            </Link>
                            
                            {/* Slide dot indicator buttons */}
                            {featuredPosts.length > 1 && (
                                <div className="flex items-center justify-center gap-1.5 px-2">
                                    {featuredPosts.map((_, idx) => (
                                        <button
                                            key={idx}
                                            onClick={() => setActiveIndex(idx)}
                                            className={`w-2 h-2 transition-all ${idx === activeIndex ? "bg-cyan-400 w-4" : "bg-neutral-800 hover:bg-neutral-600"}`}
                                            aria-label={`Go to slide ${idx + 1}`}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </section>
            )}

            {/* FEATURES BENTO */}
            <section className="max-w-7xl mx-auto px-6 lg:px-8 py-24">
                <div className="flex items-end justify-between flex-wrap gap-4 mb-12">
                    <div>
                        <div className="font-mono text-cyan-400 text-xs uppercase tracking-[0.3em] mb-3">
                            // capabilities
                        </div>
                        <h2 className="font-mono text-3xl sm:text-4xl font-bold tracking-tight max-w-xl">
                            One kernel. Many shapes. Zero compromises.
                        </h2>
                    </div>
                    <p className="text-neutral-400 max-w-md text-sm">
                        Built from scratch in Rust. Designed for compute,
                        networking, and storage workloads where every cycle
                        matters.
                    </p>
                </div>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 border border-neutral-900">
                    {FEATURES.map((f, i) => {
                        const Icon = f.icon;
                        return (
                            <div
                                key={f.title}
                                className={`p-8 border-neutral-900 group hover:bg-[#080808] transition-colors ${i % 3 !== 2 ? "lg:border-r" : ""} ${Math.floor(i / 3) === 0 ? "lg:border-b" : ""} ${i % 2 === 0 ? "md:border-r" : ""} ${i < FEATURES.length - 2 ? "md:border-b lg:border-b-0" : ""} ${Math.floor(i / 3) === 0 ? "lg:border-b" : ""}`}
                            >
                                <div className="inline-flex items-center justify-center w-10 h-10 border border-neutral-800 group-hover:border-cyan-400/60 group-hover:text-cyan-400 transition-colors mb-5">
                                    <Icon size={18} />
                                </div>
                                <h3 className="font-mono font-bold text-lg mb-2 tracking-tight">
                                    {f.title}
                                </h3>
                                <p className="text-neutral-400 text-sm leading-relaxed">
                                    {f.desc}
                                </p>
                                <div className="mt-5 font-mono text-[11px] uppercase tracking-widest text-cyan-400/80">
                                    {f.meta}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </section>

            {/* CODE TEASER */}
            <section className="border-y border-neutral-900 bg-[#040404]">
                <div className="max-w-7xl mx-auto px-6 lg:px-8 py-20 grid lg:grid-cols-2 gap-12 items-center">
                    <div>
                        <div className="font-mono text-cyan-400 text-xs uppercase tracking-[0.3em] mb-3">
                            // build your own LibOS
                        </div>
                        <h2 className="font-mono text-3xl sm:text-4xl font-bold tracking-tight">
                            A 6-line userland kernel.
                        </h2>
                        <p className="text-neutral-400 mt-4 max-w-md">
                            Compose the exact runtime your application needs.
                            Drop the POSIX layer, drop the scheduler, drop
                            anything. The exokernel just gives you the metal —
                            you decide the shape.
                        </p>
                        <Link
                            to="/docs"
                            className="inline-flex items-center gap-2 mt-6 px-4 py-2 border border-neutral-700 hover:border-cyan-400/60 hover:text-cyan-400 font-mono text-xs uppercase tracking-wider"
                        >
                            Read the developer guide <ArrowRight size={14} />
                        </Link>
                    </div>
                    <pre className="border border-neutral-800 bg-black p-6 overflow-x-auto font-mono text-[13px] leading-relaxed text-neutral-300">
                        <span className="text-neutral-600">
                            // aether/libos/echo.rs
                        </span>
                        {"\n"}
                        <span className="text-cyan-400">use</span> aether::cap::
                        {"{"}Nic, Sched{"}"};{"\n"}
                        {"\n"}
                        <span className="text-cyan-400">fn</span>{" "}
                        <span className="text-white">main</span>(nic: Nic,
                        sched: Sched) {"{"}
                        {"\n"}    <span className="text-cyan-400">loop</span>{" "}
                        {"{"}
                        {"\n"}        <span className="text-cyan-400">let</span>{" "}
                        pkt = nic.recv_zerocopy();{"\n"}        nic.send(pkt);
                        {"\n"}    {"}"}
                        {"\n"}
                        {"}"}
                    </pre>
                </div>
            </section>

            {/* FINAL CTA */}
            <section className="max-w-7xl mx-auto px-6 lg:px-8 py-24 text-center">
                <h2 className="font-mono text-3xl sm:text-5xl font-bold tracking-tight">
                    Boot it.{" "}
                    <span className="text-cyan-400">Benchmark it.</span>{" "}
                    Believe it.
                </h2>
                <p className="text-neutral-400 max-w-xl mx-auto mt-4">
                    AetherXOS runs today on x86_64, arm64, and RISC-V. Grab the
                    beta preview ISO, flash a USB stick, and rediscover what your
                    hardware can do.
                </p>
                <Link
                    to="/downloads"
                    data-testid="final-cta-download"
                    className="inline-flex items-center gap-2 mt-8 px-6 py-3 bg-cyan-400 text-black hover:bg-cyan-300 font-mono text-sm font-bold uppercase tracking-wider"
                >
                    <Download size={16} /> Open Download Center
                </Link>
            </section>
        </div>
    );
}
