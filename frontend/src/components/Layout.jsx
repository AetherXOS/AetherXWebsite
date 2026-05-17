import React, { useEffect, useState, useRef } from "react";
import { Link, NavLink, useLocation, Outlet } from "react-router";
import { Terminal, Github, Cpu, X, MessageSquare, Send, Sparkles, Download, Instagram, Linkedin, Twitter } from "lucide-react";
import { api } from "../lib/api";
import { getVisibleSocialLinks, normalizeSettings } from "../lib/settings";

const NAV = [
    { to: "/", label: "Home" },
    { to: "/downloads", label: "Downloads" },
    { to: "/news", label: "News" },
    { to: "/changelog", label: "Changelog" },
    { to: "/architecture", label: "Architecture" },
    { to: "/docs", label: "Docs" },
];

const playChime = () => {
    try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;
        const ctx = new AudioContext();
        const now = ctx.currentTime;
        
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gainNode = ctx.createGain();
        
        osc1.type = "sine";
        osc1.frequency.setValueAtTime(587.33, now);
        osc1.frequency.exponentialRampToValueAtTime(880.00, now + 0.15);
        
        osc2.type = "triangle";
        osc2.frequency.setValueAtTime(293.66, now);
        osc2.frequency.exponentialRampToValueAtTime(440.00, now + 0.15);
        
        gainNode.gain.setValueAtTime(0.12, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
        
        osc1.connect(gainNode);
        osc2.connect(gainNode);
        gainNode.connect(ctx.destination);
        
        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + 0.4);
        osc2.stop(now + 0.4);
    } catch (e) {
        console.error("Audio Context playback blocked or not supported:", e);
    }
};

export default function Layout({ children }) {
    const location = useLocation();
    const socialIcons = {
        discord_url: (
            <svg width="14" height="14" viewBox="0 0 127.14 96.36" fill="currentColor" className="shrink-0"><path d="M107.7,8.07A105.15,105.15,0,0,0,77.26,0a77.19,77.19,0,0,0-3.3,6.83A96.67,96.67,0,0,0,53.22,6.83,77.19,77.19,0,0,0,49.88,0,105.15,105.15,0,0,0,19.44,8.07C3.66,31.58-1.86,54.65,1,77.53A105.73,105.73,0,0,0,32,96.36a77.7,77.7,0,0,0,6.63-10.85,68.43,68.43,0,0,1-10.5-5c.88-.65,1.72-1.34,2.51-2a75.58,75.58,0,0,0,73,0c.79.71,1.63,1.4,2.51,2a68.43,68.43,0,0,1-10.5,5,77.7,77.7,0,0,0,6.63,10.85,105.73,105.73,0,0,0,31-18.83C129.9,49.12,122.9,26.43,107.7,8.07ZM42.45,65.69C36.18,65.69,31,60,31,53S36.18,40.36,42.45,40.36,53.83,46,53.83,53,48.72,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.24,60,73.24,53S78.41,40.36,84.69,40.36,96.07,46,96.07,53,91,65.69,84.69,65.69Z"/></svg>
        ),
        instagram_url: <Instagram size={14} />,
        linkedin_url: <Linkedin size={14} />,
        twitter_url: <Twitter size={14} />,
    };
    
    // System Settings State
    const [settings, setSettings] = useState({
        ...normalizeSettings(),
    });

    // Announcements States
    const [activeBanner, setActiveBanner] = useState(null);
    const [activePopup, setActivePopup] = useState(null);
    
    // Live Support Chat States
    const [chatOpen, setChatOpen] = useState(false);
    const [sessionId, setSessionId] = useState("");
    const [messages, setMessages] = useState([]);
    const [chatInput, setChatInput] = useState("");
    const [isSending, setIsSending] = useState(false);
    const [isAgentTyping, setIsAgentTyping] = useState(false);
    const messagesEndRef = useRef(null);
    const typingTimeoutRef = useRef(null);

    const exportTranscript = () => {
        let logText = `=========================================
AETHERXOS LIVE SUPPORT LOG
Session ID: ${sessionId}
Generated At: ${new Date().toLocaleString()}
=========================================\n\n`;

        messages.forEach((msg) => {
            const time = new Date(msg.ts).toLocaleTimeString();
            const senderLabel = msg.sender === "admin" ? `[STAFF - ${msg.author || "Agent"}]` : "[YOU]";
            logText += `[${time}] ${senderLabel}: ${msg.text}\n`;
        });

        logText += `\n=========================================\nEND OF TRANSCRIPT\n=========================================`;

        const blob = new Blob([logText], { type: "text/plain;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `aetherx_chat_transcript_${sessionId.substring(0, 8)}.txt`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    // 1. Fetch system settings, announcements and initialize chat session on mount
    useEffect(() => {
        let sid = localStorage.getItem("aetherx_chat_session");
        if (!sid) {
            sid = "session-" + Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
            localStorage.setItem("aetherx_chat_session", sid);
        }
        setSessionId(sid);

        api.get("/settings")
            .then((res) => {
                if (res.data) {
                    setSettings(normalizeSettings(res.data));
                }
            })
            .catch((err) => console.error("Error loading system settings:", err));

        api.get("/announcements")
            .then((res) => {
                const anns = res.data || [];
                
                // Active Banner (not dismissed previously)
                const banner = anns.find(a => a.type === "banner" && !localStorage.getItem(`dismissed_ann_${a.id}`));
                setActiveBanner(banner || null);

                // Active Popup (not dismissed previously)
                const popup = anns.find(a => a.type === "popup" && !localStorage.getItem(`dismissed_ann_${a.id}`));
                setActivePopup(popup || null);
            })
            .catch((err) => console.error("Error loading announcements:", err));
    }, []);

    // 2. Setup Server-Sent Events (SSE) Stream when chat is open
    useEffect(() => {
        if (!chatOpen || !sessionId) return;

        // Fetch existing messages first
        api.get(`/chats/messages?session_id=${sessionId}`)
            .then((res) => {
                setMessages(res.data.messages || []);
            })
            .catch((err) => console.error("Error loading chat:", err));

        // Connect to SSE stream
        const source = new EventSource(`/api/chats/stream?session_id=${sessionId}`);
        
        source.addEventListener("message", (event) => {
            const data = JSON.parse(event.data);
            const incoming = data.messages || [];
            setMessages((prev) => {
                if (incoming.length > prev.length) {
                    const lastMsg = incoming[incoming.length - 1];
                    if (lastMsg && lastMsg.sender === "admin") {
                        playChime();
                    }
                }
                return incoming;
            });
        });

        source.addEventListener("typing", (event) => {
            const data = JSON.parse(event.data);
            if (data.sender === "admin") {
                setIsAgentTyping(data.is_typing);
            }
        });

        source.onerror = (err) => {
            console.error("SSE stream error, reconnecting:", err);
        };

        return () => {
            source.close();
        };
    }, [chatOpen, sessionId]);

    const handleTyping = () => {
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        
        api.post("/chats/typing", { session_id: sessionId, is_typing: true, sender: "visitor" })
            .catch(err => {});
        
        typingTimeoutRef.current = setTimeout(() => {
            api.post("/chats/typing", { session_id: sessionId, is_typing: false, sender: "visitor" })
                .catch(err => {});
        }, 2500);
    };

    // 3. Auto-scroll to bottom of chat
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, chatOpen]);

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!chatInput.trim() || isSending) return;

        const text = chatInput.trim();
        setChatInput("");
        setIsSending(true);

        try {
            const res = await api.post("/chats/messages", {
                session_id: sessionId,
                text
            });
            setMessages(res.data.messages || []);
        } catch (err) {
            console.error("Error sending chat message:", err);
        } finally {
            setIsSending(false);
        }
    };

    const dismissBanner = (id) => {
        localStorage.setItem(`dismissed_ann_${id}`, "true");
        setActiveBanner(null);
    };

    const dismissPopup = (id) => {
        localStorage.setItem(`dismissed_ann_${id}`, "true");
        setActivePopup(null);
    };

    const socialLinks = getVisibleSocialLinks(settings);

    return (
        <div className="min-h-screen flex flex-col bg-black text-white">
            {activeBanner && (
                <div className="bg-cyan-400 text-black py-2 px-8 font-mono text-[11px] sm:text-xs text-center relative flex justify-center items-center font-bold tracking-wide border-b border-cyan-500 z-50">
                    <span className="flex items-center gap-1.5 justify-center">
                        <Sparkles size={12} className="animate-pulse" /> {activeBanner.content}
                    </span>
                    <button 
                        onClick={() => dismissBanner(activeBanner.id)}
                        className="absolute right-4 hover:scale-110 text-black flex items-center justify-center"
                    >
                        <X size={14} />
                    </button>
                </div>
            )}
            <header className="sticky top-0 z-40 border-b border-neutral-900 bg-black/85 backdrop-blur">
                <div className="max-w-7xl mx-auto flex items-center justify-between px-6 lg:px-8 h-16">
                    <Link
                        to="/"
                        data-testid="nav-logo"
                        className="flex items-center gap-2 font-mono font-bold text-lg tracking-tight"
                    >
                        <span className="inline-flex items-center justify-center w-8 h-8 border border-cyan-400/60 text-cyan-400 cyan-glow">
                            <Cpu size={16} />
                        </span>
                        <span>
                            Aether<span className="text-cyan-400">XOS</span>
                        </span>
                        {settings.version && (
                            <span className="hidden sm:inline text-[10px] uppercase tracking-[0.2em] text-neutral-500 ml-2 border border-neutral-800 px-1.5 py-0.5">
                                v{settings.version}
                            </span>
                        )}
                    </Link>
                    <nav className="hidden md:flex items-center gap-1 font-mono text-sm">
                        {NAV.map((n) => (
                            <NavLink
                                key={n.to}
                                to={n.to}
                                data-testid={`nav-${n.label.toLowerCase()}`}
                                className={({ isActive }) =>
                                    `px-3 py-1.5 border border-transparent transition-colors hover:text-cyan-400 hover:border-cyan-400/40 ${isActive ? "text-cyan-400 border-cyan-400/40" : "text-neutral-300"}`
                                }
                                end={n.to === "/"}
                            >
                                {n.label}
                            </NavLink>
                        ))}
                    </nav>
                    <div className="flex items-center gap-2">
                        <a
                            href="https://github.com/AetherXOS/AetherXOS"
                            target="_blank"
                            rel="noreferrer"
                            data-testid="nav-github"
                            className="hidden sm:inline-flex items-center gap-2 px-3 py-1.5 border border-neutral-800 hover:border-cyan-400/60 hover:text-cyan-400 font-mono text-xs uppercase tracking-wider transition-colors"
                        >
                            <Github size={14} /> Source
                        </a>
                        {socialLinks.map((link) => {
                            const icon = socialIcons[link.key];
                            return (
                                <a
                                    key={link.key}
                                    href={link.href}
                                    target="_blank"
                                    rel="noreferrer"
                                    data-testid={`nav-${link.label.toLowerCase()}`}
                                    aria-label={link.label}
                                    title={link.label}
                                    className="hidden sm:inline-flex items-center gap-2 px-3 py-1.5 border border-neutral-800 hover:border-cyan-400/60 hover:text-cyan-400 font-mono text-xs uppercase tracking-wider transition-colors"
                                >
                                    {icon}
                                    {link.label}
                                </a>
                            );
                        })}
                        <Link
                            to="/downloads"
                            data-testid="nav-cta-download"
                            className="hidden sm:inline-flex items-center gap-2 px-3 py-1.5 bg-cyan-400 text-black hover:bg-cyan-300 font-mono text-xs font-bold uppercase tracking-wider transition-colors"
                        >
                            <Terminal size={14} /> Get Aether
                        </Link>
                    </div>
                </div>
                {/* Mobile nav strip */}
                <nav className="md:hidden border-t border-neutral-900 flex overflow-x-auto font-mono text-xs">
                    {NAV.map((n) => (
                        <NavLink
                            key={n.to}
                            to={n.to}
                            className={({ isActive }) =>
                                `px-4 py-2 whitespace-nowrap ${isActive ? "text-cyan-400" : "text-neutral-400"}`
                            }
                            end={n.to === "/"}
                        >
                            {n.label}
                        </NavLink>
                    ))}
                </nav>
            </header>

            <main key={location.pathname} className="flex-1">
                {children || <Outlet />}
            </main>

            <footer className="border-t border-neutral-900 bg-black mt-24">
                <div className="max-w-7xl mx-auto px-6 lg:px-8 py-12 grid md:grid-cols-4 gap-10 text-sm">
                    <div className="space-y-3">
                        <div className="font-mono font-bold text-lg">
                            Aether<span className="text-cyan-400">XOS</span>
                        </div>
                        <p className="text-neutral-500 leading-relaxed">
                            An exokernel + Library OS designed for bare-metal
                            performance, memory safety, and uncompromising
                            modularity.
                        </p>
                        <div className="flex items-center gap-3 pt-2">
                            <a href="https://github.com/AetherXOS/AetherXOS" target="_blank" rel="noreferrer" className="text-neutral-500 hover:text-cyan-400">
                                <Github size={16} />
                            </a>
                            {socialLinks.map((link) => {
                                const icon = socialIcons[link.key];
                                return (
                                    <a
                                        key={link.key}
                                        href={link.href}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="text-neutral-500 hover:text-cyan-400"
                                        aria-label={link.label}
                                        title={link.label}
                                    >
                                        {icon}
                                    </a>
                                );
                            })}
                        </div>
                        {settings.version && (
                            <p className="text-neutral-600 font-mono text-xs pt-1">
                                $ uname -r → aether-{settings.version}-exo
                            </p>
                        )}
                    </div>
                    <div>
                        <div className="font-mono text-xs uppercase tracking-widest text-neutral-400 mb-3">
                            Product
                        </div>
                        <ul className="space-y-2 text-neutral-400">
                            <li>
                                <Link
                                    to="/downloads"
                                    className="hover:text-cyan-400"
                                >
                                    Downloads
                                </Link>
                            </li>
                            <li>
                                <Link
                                    to="/changelog"
                                    className="hover:text-cyan-400"
                                >
                                    Changelog
                                </Link>
                            </li>
                            <li>
                                <Link
                                    to="/architecture"
                                    className="hover:text-cyan-400"
                                >
                                    Architecture
                                </Link>
                            </li>
                        </ul>
                    </div>
                    <div>
                        <div className="font-mono text-xs uppercase tracking-widest text-neutral-400 mb-3">
                            Developers
                        </div>
                        <ul className="space-y-2 text-neutral-400">
                            <li>
                                <Link to="/docs" className="hover:text-cyan-400">
                                    Documentation
                                </Link>
                            </li>
                            <li>
                                <Link to="/news" className="hover:text-cyan-400">
                                    News
                                </Link>
                            </li>
                            <li>
                                <Link to="/security" className="hover:text-cyan-400">
                                    Security &amp; GPG
                                </Link>
                            </li>
                            <li>
                                <Link
                                    to="/admin/login"
                                    className="hover:text-cyan-400"
                                >
                                    Admin
                                </Link>
                            </li>
                        </ul>
                    </div>
                    <div>
                        <div className="font-mono text-xs uppercase tracking-widest text-neutral-400 mb-3">
                            Feeds
                        </div>
                        <ul className="space-y-2 text-neutral-400 font-mono text-xs">
                            <li>
                                <a
                                    href="/api/feed/news.xml"
                                    target="_blank"
                                    rel="noreferrer"
                                    className="hover:text-cyan-400"
                                    data-testid="rss-news"
                                >
                                    /feed/news.xml
                                </a>
                            </li>
                            <li>
                                <a
                                    href="/api/feed/changelog.xml"
                                    target="_blank"
                                    rel="noreferrer"
                                    className="hover:text-cyan-400"
                                    data-testid="rss-changelog"
                                >
                                    /feed/changelog.xml
                                </a>
                            </li>
                            <li className="pt-2 text-neutral-500">
                                arch: x86_64 · arm64 · riscv
                            </li>
                            <li className="text-neutral-500">
                                © {new Date().getFullYear()} AetherXOS
                            </li>
                        </ul>
                    </div>
                </div>
            </footer>

            {activePopup && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
                    <div className="border border-neutral-900 bg-[#070707] p-6 max-w-sm w-full font-mono text-sm relative space-y-4">
                        <div className="flex justify-between items-center border-b border-neutral-900 pb-2">
                            <span className="text-[11px] uppercase tracking-widest text-cyan-400 font-bold flex items-center gap-1">
                                <Sparkles size={12} /> Special Announcement
                            </span>
                            <button onClick={() => dismissPopup(activePopup.id)} className="text-neutral-500 hover:text-white">
                                <X size={14} />
                            </button>
                        </div>
                        <h3 className="font-bold text-white text-base mt-2">{activePopup.title}</h3>
                        <p className="text-neutral-400 text-xs leading-relaxed">{activePopup.content}</p>
                        <button
                            onClick={() => dismissPopup(activePopup.id)}
                            className="w-full py-2 bg-cyan-400 text-black font-bold uppercase text-xs hover:bg-cyan-300 transition-colors"
                        >
                            Acknowledge
                        </button>
                    </div>
                </div>
            )}

            {/* LIVE SUPPORT FLOATING WIDGET */}
            {settings.live_chat_enabled && (
                <div className="fixed bottom-6 right-6 z-50 font-mono">
                {/* Chat Bubble Button */}
                <button
                    onClick={() => setChatOpen(!chatOpen)}
                    className="w-14 h-14 bg-cyan-400 text-black rounded-full flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-all duration-200 cyan-glow"
                >
                    {chatOpen ? <X size={20} /> : <MessageSquare size={20} />}
                </button>

                {/* Floating Chat Window */}
                {chatOpen && (
                    <div className="fixed bottom-24 right-6 w-[340px] sm:w-[360px] h-[450px] bg-black border border-neutral-900 shadow-2xl flex flex-col overflow-hidden">
                        {/* Header */}
                        <div className="bg-[#070707] border-b border-neutral-900 px-4 py-3 flex items-center justify-between text-cyan-400">
                            <div className="flex items-center gap-2">
                                <span className="w-2 h-2 bg-cyan-400 cyan-glow inline-block rounded-full animate-pulse" />
                                <span className="text-[11px] uppercase tracking-widest font-bold">AetherX Live Support</span>
                            </div>
                            <div className="flex items-center gap-2">
                                {messages.length > 0 && (
                                    <button 
                                        onClick={exportTranscript} 
                                        title="Export Chat Log" 
                                        className="text-neutral-500 hover:text-cyan-400 p-1"
                                    >
                                        <Download size={14} />
                                    </button>
                                )}
                                <button onClick={() => setChatOpen(false)} className="text-neutral-500 hover:text-cyan-400 p-1">
                                    <X size={14} />
                                </button>
                            </div>
                        </div>

                        {/* Messages Scroller */}
                        <div className="flex-1 p-4 overflow-y-auto space-y-3 flex flex-col bg-black">
                            <div className="self-start bg-neutral-900/50 border border-neutral-900 text-neutral-400 p-2 max-w-[85%] text-[11px] leading-relaxed">
                                Welcome to AetherXOS Assist! Ask us anything about the kernel build, architecture, or downloads.
                            </div>
                            
                            {messages.map((msg, index) => {
                                const isVisitor = msg.sender === "visitor";
                                return (
                                    <div
                                        key={index}
                                        className={`p-2 max-w-[85%] text-xs leading-relaxed ${
                                            isVisitor
                                                ? "self-end bg-cyan-400/10 border border-cyan-400/25 text-cyan-100"
                                                : "self-start bg-neutral-950 border border-neutral-900 text-neutral-300"
                                        }`}
                                    >
                                        <div className="font-bold text-[9px] text-neutral-500 mb-0.5">
                                            {isVisitor ? "You" : `Support (${msg.author || "Agent"})`}
                                        </div>
                                        {msg.text}
                                    </div>
                                );
                            })}
                            {isAgentTyping && (
                                <div className="self-start bg-neutral-950 border border-neutral-900 text-neutral-400 p-2 max-w-[85%] text-xs flex items-center gap-1.5 rounded-none font-mono">
                                    <span className="w-1 h-1 bg-cyan-400 rounded-full animate-bounce" />
                                    <span className="w-1 h-1 bg-cyan-400 rounded-full animate-bounce [animation-delay:0.2s]" />
                                    <span className="w-1 h-1 bg-cyan-400 rounded-full animate-bounce [animation-delay:0.4s]" />
                                    <span className="ml-1 text-[9px] text-neutral-500 font-bold uppercase tracking-wide">Support is typing...</span>
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Bottom Input Area */}
                        <form onSubmit={handleSendMessage} className="border-t border-neutral-900 p-2 bg-[#050505] flex gap-2">
                            <input
                                type="text"
                                value={chatInput}
                                onChange={(e) => {
                                    setChatInput(e.target.value);
                                    handleTyping();
                                }}
                                placeholder="Type a message..."
                                disabled={isSending}
                                className="flex-1 bg-black border border-neutral-800 focus:border-cyan-400 outline-none text-white px-3 py-2 text-xs"
                            />
                            <button
                                type="submit"
                                disabled={isSending || !chatInput.trim()}
                                className="px-3 bg-cyan-400 text-black hover:bg-cyan-300 font-bold flex items-center justify-center disabled:opacity-50 transition-colors"
                            >
                                <Send size={12} />
                            </button>
                        </form>
                    </div>
                )}
                </div>
            )}
        </div>
    );
}
