import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { api, trackEvent } from "../lib/api";
import { ArrowLeft, Calendar, User } from "lucide-react";

export default function NewsDetail() {
    const { slug } = useParams();
    const [post, setPost] = useState(null);
    const [err, setErr] = useState(null);

    useEffect(() => {
        trackEvent("pageview", `/news/${slug}`);
        api.get(`/posts/${slug}`)
            .then((r) => setPost(r.data))
            .catch(() => setErr("not_found"));
    }, [slug]);

    if (err)
        return (
            <div className="max-w-3xl mx-auto px-6 py-20 font-mono">
                <p className="text-red-400">[ERROR] post not found.</p>
                <Link
                    to="/news"
                    className="text-cyan-400 mt-4 inline-block hover:underline"
                >
                    ← back to news
                </Link>
            </div>
        );
    if (!post)
        return (
            <div className="max-w-3xl mx-auto px-6 py-20 font-mono text-cyan-400">
                loading...
            </div>
        );

    return (
        <article className="max-w-3xl mx-auto px-6 lg:px-8 py-16">
            <Link
                to="/news"
                className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-neutral-400 hover:text-cyan-400"
            >
                <ArrowLeft size={14} /> back to news
            </Link>
            <div className="mt-8 mb-3 flex items-center gap-3 font-mono text-[11px] uppercase tracking-widest text-cyan-400">
                <span>{post.category}</span>
                <span className="text-neutral-700">·</span>
                <span className="text-neutral-500 flex items-center gap-1">
                    <Calendar size={11} />
                    {new Date(post.created_at).toLocaleDateString()}
                </span>
                <span className="text-neutral-700">·</span>
                <span className="text-neutral-500 flex items-center gap-1">
                    <User size={11} />
                    {post.author}
                </span>
            </div>
            <h1 className="font-mono text-3xl sm:text-5xl font-bold tracking-tight">
                {post.title}
            </h1>
            {post.excerpt && (
                <p className="text-neutral-400 mt-5 text-lg leading-relaxed">
                    {post.excerpt}
                </p>
            )}
            <div className="mt-10 border-t border-neutral-900 pt-10">
                <div
                    className="prose-aether"
                    data-testid="post-content"
                    dangerouslySetInnerHTML={{ __html: post.content }}
                />
            </div>
            {post.tags?.length > 0 && (
                <div className="mt-10 flex flex-wrap gap-2">
                    {post.tags.map((t) => (
                        <span
                            key={t}
                            className="font-mono text-[11px] text-neutral-500 border border-neutral-900 px-2 py-1"
                        >
                            #{t}
                        </span>
                    ))}
                </div>
            )}
        </article>
    );
}
