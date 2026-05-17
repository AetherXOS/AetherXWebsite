import React, { useRef } from "react";
import {
    Bold,
    Italic,
    Heading1,
    Heading2,
    List,
    ListOrdered,
    Code,
    Link as LinkIcon,
    Quote,
    Undo2,
    Redo2,
} from "lucide-react";

export default function WysiwygEditor({ value, onChange }) {
    const ref = useRef(null);

    function exec(cmd, arg = null) {
        document.execCommand(cmd, false, arg);
        if (ref.current) onChange(ref.current.innerHTML);
        ref.current?.focus();
    }

    function handleInput(e) {
        onChange(e.currentTarget.innerHTML);
    }

    function applyHeading(tag) {
        document.execCommand("formatBlock", false, tag);
        if (ref.current) onChange(ref.current.innerHTML);
        ref.current?.focus();
    }

    function insertLink() {
        const url = window.prompt("URL");
        if (url) exec("createLink", url);
    }

    const btn =
        "p-2 border border-neutral-800 hover:border-cyan-400/60 hover:text-cyan-400 transition-colors";

    return (
        <div
            className="border border-neutral-800 bg-[#0a0a0a]"
            data-testid="wysiwyg-editor"
        >
            <div className="flex flex-wrap gap-1 p-2 border-b border-neutral-800 bg-black">
                <button
                    type="button"
                    title="Bold"
                    onClick={() => exec("bold")}
                    className={btn}
                    data-testid="wysiwyg-bold"
                >
                    <Bold size={14} />
                </button>
                <button
                    type="button"
                    title="Italic"
                    onClick={() => exec("italic")}
                    className={btn}
                >
                    <Italic size={14} />
                </button>
                <button
                    type="button"
                    title="H1"
                    onClick={() => applyHeading("h1")}
                    className={btn}
                >
                    <Heading1 size={14} />
                </button>
                <button
                    type="button"
                    title="H2"
                    onClick={() => applyHeading("h2")}
                    className={btn}
                >
                    <Heading2 size={14} />
                </button>
                <button
                    type="button"
                    title="Bullet list"
                    onClick={() => exec("insertUnorderedList")}
                    className={btn}
                >
                    <List size={14} />
                </button>
                <button
                    type="button"
                    title="Ordered list"
                    onClick={() => exec("insertOrderedList")}
                    className={btn}
                >
                    <ListOrdered size={14} />
                </button>
                <button
                    type="button"
                    title="Code"
                    onClick={() => exec("formatBlock", "pre")}
                    className={btn}
                >
                    <Code size={14} />
                </button>
                <button
                    type="button"
                    title="Quote"
                    onClick={() => exec("formatBlock", "blockquote")}
                    className={btn}
                >
                    <Quote size={14} />
                </button>
                <button
                    type="button"
                    title="Link"
                    onClick={insertLink}
                    className={btn}
                >
                    <LinkIcon size={14} />
                </button>
                <button
                    type="button"
                    title="Undo"
                    onClick={() => exec("undo")}
                    className={btn}
                >
                    <Undo2 size={14} />
                </button>
                <button
                    type="button"
                    title="Redo"
                    onClick={() => exec("redo")}
                    className={btn}
                >
                    <Redo2 size={14} />
                </button>
                <span className="ml-auto font-mono text-[10px] uppercase tracking-widest text-neutral-600 self-center px-2">
                    WYSIWYG · HTML
                </span>
            </div>
            <div
                ref={ref}
                contentEditable
                onInput={handleInput}
                suppressContentEditableWarning
                data-placeholder="Write your content here…"
                className="prose-aether min-h-[280px] px-5 py-4 outline-none focus:ring-1 focus:ring-cyan-400/40"
                dangerouslySetInnerHTML={{ __html: value || "" }}
                data-testid="wysiwyg-content"
            />
        </div>
    );
}
