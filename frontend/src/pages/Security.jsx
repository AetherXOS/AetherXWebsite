import React, { useEffect, useState } from "react";
import { api, trackEvent } from "../lib/api";
import { ShieldCheck, KeyRound, Copy, Check } from "lucide-react";

export default function Security() {
    const [data, setData] = useState({ fingerprint: "", public_key: "", notes: "" });
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        trackEvent("pageview", "/security");
        api.get("/security/key").then((r) => setData(r.data || {}));
    }, []);

    function copy(text) {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
    }

    return (
        <div>
            <section className="border-b border-neutral-900">
                <div className="max-w-7xl mx-auto px-6 lg:px-8 py-16">
                    <div className="font-mono text-cyan-400 text-xs uppercase tracking-[0.3em] mb-3">
                        // /etc/aether/keys
                    </div>
                    <h1 className="font-mono text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight">
                        Security &amp; Signing
                    </h1>
                    <p className="text-neutral-400 mt-4 max-w-2xl">
                        Every AetherXOS release artifact is published with a
                        detached GPG signature. Verify before you boot.
                    </p>
                </div>
            </section>

            <div className="max-w-4xl mx-auto px-6 lg:px-8 py-12 space-y-10">
                <section className="border border-neutral-900 bg-[#070707] p-6">
                    <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-cyan-400 mb-4">
                        <ShieldCheck size={14} /> Verification
                    </div>
                    <p className="text-neutral-400 mb-4">
                        Import the AetherXOS signing key, then verify the ISO
                        with its detached <code>.asc</code> signature:
                    </p>
                    <pre className="border border-neutral-800 bg-black p-4 overflow-x-auto font-mono text-xs leading-relaxed">
{`# 1. Import the signing key
curl -sSL https://aetherxos.dev/api/security/key | jq -r .public_key | gpg --import

# 2. Verify the ISO
gpg --verify aetherxos-1.0.0-x86_64.iso.asc aetherxos-1.0.0-x86_64.iso

# 3. Verify SHA256 (also shown on each Download Center card)
sha256sum -c aetherxos-1.0.0-x86_64.iso.sha256`}
                    </pre>
                </section>

                <section className="border border-neutral-900 bg-[#070707] p-6">
                    <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-cyan-400 mb-4">
                        <KeyRound size={14} /> Signing Key
                    </div>
                    {data.fingerprint ? (
                        <>
                            <div className="flex items-center gap-3 mb-3">
                                <code
                                    className="font-mono text-sm text-cyan-400 break-all"
                                    data-testid="gpg-fingerprint"
                                >
                                    {data.fingerprint}
                                </code>
                                <button
                                    onClick={() => copy(data.fingerprint)}
                                    className="p-1.5 border border-neutral-800 hover:border-cyan-400/60 hover:text-cyan-400"
                                    title="Copy fingerprint"
                                >
                                    {copied ? <Check size={12} /> : <Copy size={12} />}
                                </button>
                            </div>
                            {data.public_key && (
                                <pre className="border border-neutral-800 bg-black p-4 max-h-[420px] overflow-auto font-mono text-[11px] leading-relaxed text-neutral-400 whitespace-pre">
{data.public_key}
                                </pre>
                            )}
                            {data.notes && (
                                <p className="font-mono text-xs text-neutral-500 mt-4">
                                    {data.notes}
                                </p>
                            )}
                        </>
                    ) : (
                        <p className="font-mono text-sm text-neutral-500">
                            No signing key registered yet. Admins can publish
                            one from the admin panel.
                        </p>
                    )}
                </section>
            </div>
        </div>
    );
}
