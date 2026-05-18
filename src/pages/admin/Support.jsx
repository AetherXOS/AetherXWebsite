import React, { useEffect, useState, useRef } from "react";
import AdminLayout from "../../components/AdminLayout";
import { api } from "../../lib/api";
import { MessageSquare, Send, CheckCircle2, AlertCircle, RefreshCw, User, Terminal, Download } from "lucide-react";
import { toast } from "sonner";

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

export default function Support() {
    const [chats, setChats] = useState([]);
    const [selectedChatId, setSelectedChatId] = useState(null);
    const [replyText, setReplyText] = useState("");
    const [isSending, setIsSending] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [visitorTyping, setVisitorTyping] = useState(false);
    const messagesEndRef = useRef(null);
    const typingTimeoutRef = useRef(null);

    const exportCurrentTranscript = () => {
        const selectedChat = chats.find((c) => c.id === selectedChatId);
        if (!selectedChat) return;
        
        let logText = `=========================================
AETHERXOS LIVE SUPPORT CHAT LOG
Visitor Session: ${selectedChat.visitor_name}
Session ID: ${selectedChat.session_id}
Generated At: ${new Date().toLocaleString()}
=========================================\n\n`;

        selectedChat.messages.forEach((msg) => {
            const time = new Date(msg.ts).toLocaleTimeString();
            const senderLabel = msg.sender === "admin" ? `[STAFF - ${msg.author || "Agent"}]` : "[VISITOR]";
            logText += `[${time}] ${senderLabel}: ${msg.text}\n`;
        });

        logText += `\n=========================================\nEND OF TRANSCRIPT\n=========================================`;

        const blob = new Blob([logText], { type: "text/plain;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `aetherx_chat_transcript_${selectedChat.visitor_name.replace(/\s+/g, "_")}_${Date.now()}.txt`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        toast.success("Chat session transcript saved successfully!");
    };

    // Load initial chats list
    const loadChats = async (silent = true) => {
        if (!silent) setIsLoading(true);
        try {
            const res = await api.get("/admin/chats");
            const d = res.data;
            const list = Array.isArray(d) ? d : (d && d.items) ? d.items : [];
            setChats(list || []);
        } catch (err) {
            console.error("Error loading support chats:", err);
            if (!silent) toast.error("Failed to load chat sessions");
        } finally {
            if (!silent) setIsLoading(false);
        }
    };

    useEffect(() => {
        loadChats(false);

        // Connect to SSE stream for all admin actions
        const source = new EventSource("/api/chats/stream?session_id=admin");

        source.addEventListener("message", (event) => {
            try {
                const data = JSON.parse(event.data);
                const incoming = data.messages || [];
                const lastMsg = incoming[incoming.length - 1];
                if (lastMsg && lastMsg.sender === "visitor") {
                    playChime();
                }
            } catch (e) {}
            // Hot reload chat list
            loadChats(true);
        });

        source.addEventListener("session_update", (event) => {
            loadChats(true);
        });

        source.onerror = (err) => {
            console.error("Admin SSE stream disconnect, reconnecting...", err);
        };

        return () => {
            source.close();
        };
    }, []);

    const selectedChat = chats.find((c) => c.id === selectedChatId);

    // Watch for typing events belonging to the selected visitor session
    useEffect(() => {
        if (!selectedChat) {
            setVisitorTyping(false);
            return;
        }

        const source = new EventSource(`/api/chats/stream?session_id=${selectedChat.session_id}`);

        source.addEventListener("typing", (event) => {
            const data = JSON.parse(event.data);
            if (data.sender === "visitor") {
                setVisitorTyping(data.is_typing);
            }
        });

        return () => {
            source.close();
        };
    }, [selectedChatId, selectedChat?.session_id]);

    const handleAdminTyping = () => {
        if (!selectedChat) return;
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        
        api.post("/chats/typing", {
            session_id: selectedChat.session_id,
            is_typing: true,
            sender: "admin"
        }).catch(() => {});

        typingTimeoutRef.current = setTimeout(() => {
            api.post("/chats/typing", {
                session_id: selectedChat.session_id,
                is_typing: false,
                sender: "admin"
            }).catch(() => {});
        }, 2500);
    };

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [selectedChat?.messages?.length, visitorTyping]);

    const handleSendReply = async (e) => {
        e.preventDefault();
        if (!replyText.trim() || !selectedChatId || isSending) return;

        const text = replyText.trim();
        setReplyText("");
        setIsSending(true);

        try {
            const res = await api.post("/admin/chats/reply", {
                chat_id: selectedChatId,
                text,
            });
            // Update selected chat immediately
            const updated = res.data;
            setChats((prev) => prev.map((c) => (c.id === selectedChatId ? updated : c)));
        } catch (err) {
            console.error("Error sending reply:", err);
            toast.error("Failed to send reply message");
        } finally {
            setIsSending(false);
        }
    };

    const toggleResolve = async (chatId) => {
        try {
            const res = await api.post("/admin/chats/resolve", { chat_id: chatId });
            toast.success(`Session status toggled: ${res.data.status}`);
            const updated = res.data;
            setChats((prev) => prev.map((c) => (c.id === chatId ? updated : c)));
        } catch (err) {
            console.error("Error toggling resolve:", err);
            toast.error("Failed to update session status");
        }
    };

    return (
        <AdminLayout title="Live Support Hub">
            <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] border border-neutral-900 bg-[#050505] min-h-[550px] font-mono text-sm">
                {/* Left panel: Active Chat Sessions list */}
                <div className="border-r border-neutral-900 flex flex-col h-[550px] overflow-hidden">
                    <div className="p-4 border-b border-neutral-900 flex items-center justify-between bg-black">
                        <span className="font-bold text-xs uppercase tracking-wider text-cyan-400">
                            Active Chats ({chats.filter((c) => c.status === "active").length})
                        </span>
                        <button
                            onClick={() => loadChats(false)}
                            className="text-neutral-500 hover:text-cyan-400 p-1"
                            title="Refresh sessions"
                        >
                            <RefreshCw size={12} />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto divide-y divide-neutral-950">
                        {chats.length === 0 ? (
                            <div className="p-8 text-center text-neutral-600 text-xs">
                                No visitor sessions detected.
                            </div>
                        ) : (
                            chats.map((chat) => {
                                const isSelected = chat.id === selectedChatId;
                                const lastMsg = chat.messages[chat.messages.length - 1];
                                return (
                                    <div
                                        key={chat.id}
                                        onClick={() => setSelectedChatId(chat.id)}
                                        className={`p-4 cursor-pointer transition-colors ${
                                            isSelected
                                                ? "bg-cyan-400/5 text-cyan-400 border-l-2 border-cyan-400"
                                                : "hover:bg-neutral-900 text-neutral-400"
                                        }`}
                                    >
                                        <div className="flex justify-between items-start gap-2">
                                            <div className="flex items-center gap-1.5 font-bold text-xs text-white">
                                                <User size={12} className="text-cyan-400" />
                                                {chat.visitor_name}
                                            </div>
                                            <span
                                                className={`w-1.5 h-1.5 rounded-full inline-block ${
                                                    chat.status === "active"
                                                        ? "bg-emerald-400 animate-pulse cyan-glow"
                                                        : "bg-neutral-600"
                                                }`}
                                            />
                                        </div>
                                        <div className="text-[10px] text-neutral-500 mt-1 truncate">
                                            {lastMsg ? lastMsg.text : "No messages yet"}
                                        </div>
                                        <div className="text-[9px] text-neutral-600 text-right mt-1.5">
                                            {new Date(chat.created_at).toLocaleTimeString([], {
                                                hour: "2-digit",
                                                minute: "2-digit",
                                            })}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* Right panel: Main message history and response console */}
                <div className="flex flex-col h-[550px] overflow-hidden bg-black">
                    {selectedChat ? (
                        <>
                            {/* Chat Header */}
                            <div className="p-4 border-b border-neutral-900 bg-[#050505] flex items-center justify-between">
                                <div className="space-y-1">
                                    <div className="font-bold text-white flex items-center gap-2">
                                        <User size={14} className="text-cyan-400" />
                                        {selectedChat.visitor_name}
                                    </div>
                                    <div className="text-[10px] text-neutral-500 uppercase tracking-widest font-mono">
                                        Session: {selectedChat.session_id.substring(0, 15)}...
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    {selectedChat.messages.length > 0 && (
                                        <button
                                            onClick={exportCurrentTranscript}
                                            className="px-3 py-1.5 font-mono text-[10px] uppercase font-bold border border-cyan-400/20 text-cyan-400 hover:bg-cyan-400/5 transition-colors flex items-center gap-1.5"
                                            title="Export Chat Log"
                                        >
                                            <Download size={12} />
                                            Export Transcript
                                        </button>
                                    )}
                                    <button
                                        onClick={() => toggleResolve(selectedChat.id)}
                                        className={`px-3 py-1.5 font-mono text-[10px] uppercase font-bold border transition-colors flex items-center gap-1.5 ${
                                            selectedChat.status === "active"
                                                ? "border-emerald-500/30 text-emerald-400 bg-emerald-500/5 hover:bg-emerald-500/15"
                                                : "border-neutral-800 text-neutral-400 hover:text-white"
                                        }`}
                                    >
                                        <CheckCircle2 size={12} />
                                        {selectedChat.status === "active" ? "Mark Resolved" : "Re-Open Session"}
                                    </button>
                                </div>
                            </div>

                            {/* Messages History Scroller */}
                            <div className="flex-1 p-6 overflow-y-auto space-y-4 flex flex-col bg-black/60">
                                {selectedChat.messages.length === 0 ? (
                                    <div className="text-center py-20 text-neutral-600 text-xs">
                                        No messages in this chat session.
                                    </div>
                                ) : (
                                    selectedChat.messages.map((msg, index) => {
                                        const isVisitor = msg.sender === "visitor";
                                        return (
                                            <div
                                                key={index}
                                                className={`max-w-[70%] p-3 flex flex-col ${
                                                    isVisitor
                                                        ? "self-start bg-cyan-400/5 border border-cyan-400/15 text-neutral-200"
                                                        : "self-end bg-[#050505] border border-neutral-800 text-cyan-400"
                                                }`}
                                            >
                                                <div className="text-[9px] text-neutral-500 font-bold mb-1">
                                                    {isVisitor ? "Visitor" : `Support Agent (${msg.author || "You"})`}
                                                </div>
                                                <div className="text-xs break-words leading-relaxed">{msg.text}</div>
                                                <div className="text-[8px] text-neutral-600 text-right mt-1.5">
                                                    {new Date(msg.ts).toLocaleTimeString()}
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                                {visitorTyping && (
                                    <div className="self-start bg-cyan-400/5 border border-cyan-400/10 text-neutral-400 p-2 max-w-[70%] text-xs flex items-center gap-1.5 rounded-none font-mono">
                                        <span className="w-1 h-1 bg-cyan-400 rounded-full animate-bounce" />
                                        <span className="w-1 h-1 bg-cyan-400 rounded-full animate-bounce [animation-delay:0.2s]" />
                                        <span className="w-1 h-1 bg-cyan-400 rounded-full animate-bounce [animation-delay:0.4s]" />
                                        <span className="ml-1 text-[9px] text-neutral-500 font-bold uppercase tracking-wide">Visitor is typing...</span>
                                    </div>
                                )}
                                <div ref={messagesEndRef} />
                            </div>

                            {/* Reply Input Panel */}
                            <form
                                onSubmit={handleSendReply}
                                className="p-3 border-t border-neutral-900 bg-[#050505] flex gap-2"
                            >
                                <input
                                    type="text"
                                    value={replyText}
                                    onChange={(e) => {
                                        setReplyText(e.target.value);
                                        handleAdminTyping();
                                    }}
                                    placeholder={`Type reply to ${selectedChat.visitor_name}...`}
                                    disabled={isSending || selectedChat.status === "resolved"}
                                    className="flex-1 bg-black border border-neutral-900 focus:border-cyan-400 outline-none text-white px-3 py-2.5 text-xs disabled:opacity-50"
                                />
                                <button
                                    type="submit"
                                    disabled={isSending || !replyText.trim() || selectedChat.status === "resolved"}
                                    className="px-4 bg-cyan-400 text-black hover:bg-cyan-300 font-bold flex items-center justify-center gap-1.5 disabled:opacity-50 transition-colors uppercase text-xs"
                                >
                                    <Send size={12} /> Send Reply
                                </button>
                            </form>
                        </>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-center p-8 space-y-4">
                            <div className="w-12 h-12 border border-neutral-800 text-neutral-600 flex items-center justify-center rounded-none animate-pulse">
                                <Terminal size={24} />
                            </div>
                            <div>
                                <h3 className="font-bold text-white text-base">Select Dev Chat Session</h3>
                                <p className="text-neutral-500 text-xs mt-1 max-w-xs mx-auto leading-relaxed">
                                    Click any active visitor chat session from the list on the left to monitor diagnostics and send replies.
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </AdminLayout>
    );
}
