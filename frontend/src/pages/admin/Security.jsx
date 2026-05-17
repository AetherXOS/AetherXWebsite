import React, { useEffect, useState } from "react";
import AdminLayout from "../../components/AdminLayout";
import { api, formatApiError } from "../../lib/api";
import { KeyRound, Save } from "lucide-react";

export default function AdminSecurity() {
    const [data, setData] = useState({ fingerprint: "", public_key: "", notes: "" });
    const [err, setErr] = useState(null);
    const [msg, setMsg] = useState(null);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        api.get("/security/key").then((r) => setData(r.data || data));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    async function save() {
        setSaving(true);
        setErr(null);
        setMsg(null);
        try {
            await api.put("/security/key", data);
            setMsg("Signing key updated.");
        } catch (e) {
            setErr(formatApiError(e.response?.data?.detail) || e.message);
        } finally {
            setSaving(false);
        }
    }

    return (
        <AdminLayout title="Signing Key">
            <p className="text-neutral-400 font-mono text-sm mb-6">
                Publish the public GPG key + fingerprint used to sign AetherXOS
                release artifacts. Shown publicly at <code>/security</code>.
            </p>
            <div className="border border-neutral-900 bg-[#070707] p-6 space-y-4 max-w-3xl">
                <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-cyan-400">
                    <KeyRound size={14} /> GPG public key
                </div>
                <input
                    placeholder="Fingerprint (e.g. 4F2A 8C19 …)"
                    value={data.fingerprint || ""}
                    onChange={(e) => setData((s) => ({ ...s, fingerprint: e.target.value }))}
                    data-testid="gpg-fingerprint-input"
                    className="w-full bg-black border border-neutral-800 focus:border-cyan-400 outline-none px-3 py-2 font-mono text-sm"
                />
                <textarea
                    placeholder={"-----BEGIN PGP PUBLIC KEY BLOCK-----\n...\n-----END PGP PUBLIC KEY BLOCK-----"}
                    rows={14}
                    value={data.public_key || ""}
                    onChange={(e) => setData((s) => ({ ...s, public_key: e.target.value }))}
                    spellCheck={false}
                    data-testid="gpg-public-key-input"
                    className="w-full bg-black border border-neutral-800 focus:border-cyan-400 outline-none px-3 py-2 font-mono text-xs whitespace-pre"
                />
                <input
                    placeholder="Notes (e.g. rotated 2026-01-01, valid until 2028)"
                    value={data.notes || ""}
                    onChange={(e) => setData((s) => ({ ...s, notes: e.target.value }))}
                    className="w-full bg-black border border-neutral-800 focus:border-cyan-400 outline-none px-3 py-2 font-mono text-sm"
                />
                {err && (
                    <div className="border border-red-500/40 bg-red-500/10 text-red-300 px-3 py-2 font-mono text-xs">
                        [ERR] {err}
                    </div>
                )}
                {msg && (
                    <div className="border border-cyan-500/40 bg-cyan-500/10 text-cyan-300 px-3 py-2 font-mono text-xs">
                        [OK] {msg}
                    </div>
                )}
                <div className="flex justify-end">
                    <button
                        onClick={save}
                        disabled={saving}
                        data-testid="save-gpg-key-btn"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-400 text-black font-mono text-xs uppercase tracking-widest font-bold hover:bg-cyan-300 disabled:opacity-50"
                    >
                        <Save size={14} /> {saving ? "saving…" : "publish key"}
                    </button>
                </div>
            </div>
        </AdminLayout>
    );
}
