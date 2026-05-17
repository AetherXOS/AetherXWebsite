import React, { useEffect } from "react";
import { trackEvent } from "../lib/api";
import { Cpu, Layers3, Boxes, Lock, Gauge, Network } from "lucide-react";

const ARCH_DIAGRAM =
    "https://static.prod-images.emergentagent.com/jobs/517d1884-94a5-453f-a4b2-655a9a8ce7d2/images/527531bf35a0c05ca4b33674efedd4e3d4d7298c37e62a10815b3c21af55b5cc.png";

export default function Architecture() {
    useEffect(() => {
        trackEvent("pageview", "/architecture");
    }, []);
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
            <section className="max-w-7xl mx-auto px-6 lg:px-8 pb-24">
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
        </div>
    );
}
