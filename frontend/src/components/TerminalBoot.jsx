import React, { useEffect, useRef, useState } from "react";

const SEQUENCE = [
    { t: "[ OK ] aether-boot v1.0.0 loaded into 0x0000_0000_FFFF_0000", d: 60 },
    { t: "[ OK ] cpu: detected 16 cores · AVX-512 · CET enabled", d: 70 },
    { t: "[ OK ] mem: 64 GiB DDR5-6400 · ECC verified", d: 60 },
    { t: "[INFO] exokernel: exposing raw resource capabilities", d: 80 },
    { t: "[INFO] libos: mounting POSIX layer at /lib/os/posix", d: 80 },
    { t: "[INFO] libos: mounting realtime layer at /lib/os/rt", d: 80 },
    { t: "[ OK ] capability-table initialized · 4096 entries", d: 70 },
    { t: "[ OK ] zero-copy nic driver attached · 100 GbE", d: 70 },
    { t: "[ OK ] page-table protection enforced (W^X)", d: 70 },
    { t: "[ OK ] memory-safe scheduler online", d: 70 },
    { t: "[INFO] dispatching init → /lib/os/posix/init", d: 90 },
    { t: ">> AetherXOS ready. love your hardware again.", d: 120 },
];

export default function TerminalBoot() {
    const [lines, setLines] = useState([]);
    const [typed, setTyped] = useState("");
    const [done, setDone] = useState(false);
    const idx = useRef(0);
    const charIdx = useRef(0);
    const containerRef = useRef(null);

    useEffect(() => {
        let timer;
        function step() {
            if (idx.current >= SEQUENCE.length) {
                setDone(true);
                return;
            }
            const cur = SEQUENCE[idx.current];
            const slice = cur.t.slice(0, charIdx.current + 1);
            setTyped(slice);
            if (charIdx.current >= cur.t.length - 1) {
                setLines((prev) => [...prev, cur.t]);
                setTyped("");
                idx.current += 1;
                charIdx.current = 0;
                timer = setTimeout(step, cur.d);
            } else {
                charIdx.current += 1;
                timer = setTimeout(step, 16);
            }
        }
        timer = setTimeout(step, 400);
        return () => clearTimeout(timer);
    }, []);

    useEffect(() => {
        if (containerRef.current) {
            containerRef.current.scrollTop =
                containerRef.current.scrollHeight;
        }
    }, [lines, typed]);

    return (
        <div
            className="relative border border-neutral-800 bg-black overflow-hidden"
            data-testid="terminal-boot"
        >
            {/* Title bar */}
            <div className="flex items-center gap-2 px-4 py-2 border-b border-neutral-800 bg-[#0a0a0a]">
                <span className="w-3 h-3 border border-neutral-700" />
                <span className="w-3 h-3 border border-neutral-700" />
                <span className="w-3 h-3 bg-cyan-400/80" />
                <span className="ml-3 font-mono text-xs text-neutral-500">
                    aetherxos@bootloader:~ — /boot/serial0
                </span>
            </div>
            <div className="relative scanlines">
                <div
                    className="absolute inset-0 pointer-events-none z-10"
                    aria-hidden
                >
                    <div className="absolute left-0 right-0 h-px bg-cyan-400/40 scan-line" />
                </div>
                <div
                    ref={containerRef}
                    className="h-72 sm:h-80 overflow-y-auto px-5 py-4 font-mono text-[13px] leading-relaxed text-cyan-300/90"
                >
                    {lines.map((l, i) => (
                        <div key={i} className="whitespace-pre">
                            {colorize(l)}
                        </div>
                    ))}
                    {!done && (
                        <div className="whitespace-pre">
                            {colorize(typed)}
                            <span className="cursor-blink text-cyan-400">
                                █
                            </span>
                        </div>
                    )}
                    {done && (
                        <div className="mt-3 text-cyan-400 cyan-text-glow">
                            $ <span className="cursor-blink">█</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function colorize(line) {
    if (line.startsWith("[ OK ]"))
        return (
            <>
                <span className="text-cyan-400">[ OK ]</span>
                {line.slice(6)}
            </>
        );
    if (line.startsWith("[INFO]"))
        return (
            <>
                <span className="text-neutral-500">[INFO]</span>
                {line.slice(6)}
            </>
        );
    if (line.startsWith(">>"))
        return <span className="text-cyan-400 cyan-text-glow">{line}</span>;
    return line;
}
