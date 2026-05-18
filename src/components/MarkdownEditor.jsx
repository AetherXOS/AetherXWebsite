import React, { useEffect, useRef, useState } from "react";
import { api } from "../lib/api";
import { Eye, FileCode } from "lucide-react";

export default function MarkdownEditor({ value, onChange }) {
    const [tab, setTab] = useState("write");
    const [html, setHtml] = useState("");
    const t = useRef(null);

    useEffect(() => {
        if (tab !== "preview") return;
        clearTimeout(t.current);
        t.current = setTimeout(() => {
            api.post("/markdown/render", { text: value || "" })
                .then((r) => setHtml(r.data.html))
                .catch(() => setHtml("<em>render failed</em>"));
        }, 250);
        return () => clearTimeout(t.current);
    }, [value, tab]);

    return (
        <div
            className="border border-neutral-800 bg-[#0a0a0a]"
            data-testid="markdown-editor"
        >
            <div className="flex border-b border-neutral-800 bg-black">
                <button
                    type="button"
                    onClick={() => setTab("write")}
                    className={`px-4 py-2 font-mono text-[11px] uppercase tracking-widest border-r border-neutral-800 inline-flex items-center gap-2 ${tab === "write" ? "text-cyan-400 bg-cyan-400/5" : "text-neutral-400"}`}
                >
                    <FileCode size={12} /> Write
                </button>
                <button
                    type="button"
                    onClick={() => setTab("preview")}
                    className={`px-4 py-2 font-mono text-[11px] uppercase tracking-widest border-r border-neutral-800 inline-flex items-center gap-2 ${tab === "preview" ? "text-cyan-400 bg-cyan-400/5" : "text-neutral-400"}`}
                >
                    <Eye size={12} /> Preview
                </button>
                <span className="ml-auto self-center px-3 font-mono text-[10px] uppercase tracking-widest text-neutral-600">
                    markdown · cmark
                </span>
            </div>
            {tab === "write" ? (
                <textarea
                    value={value || ""}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder={"# Heading\n\nWrite **markdown** here…"}
                    spellCheck={false}
                    className="block w-full min-h-[360px] bg-transparent px-5 py-4 font-mono text-sm leading-relaxed outline-none text-neutral-200"
                    data-testid="markdown-textarea"
                />
            ) : (
                <div
                    className="prose-aether px-5 py-4 min-h-[360px]"
                    dangerouslySetInnerHTML={{ __html: html }}
                />
            )}
        </div>
    );
}
