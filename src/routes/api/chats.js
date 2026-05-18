import { apiRouter } from "./apiRouter.js";
import { requireStaffMiddleware } from "./helpers.js";
import { withDb } from "../../lib/dbAdapter.js";
import { createRequire } from "module";

let crypto = null;
if (typeof window === "undefined") {
  const require = createRequire(import.meta.url);
  crypto = require("crypto");
}

export let sseClients = [];

export function broadcastToChat(sessionId, eventType, data) {
  const targets = sseClients.filter(c => c.sessionId === sessionId || c.sessionId === "admin");
  const payload = `event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`;
  targets.forEach(client => {
    try {
      client.controller.enqueue(new TextEncoder().encode(payload));
    } catch (e) {
      // Clean up closed stream
    }
  });
}

apiRouter.get("/chats/stream", (ctx) => {
  const sessionId = ctx.query.session_id;
  if (!sessionId) {
    throw new Response(JSON.stringify({ detail: "session_id is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  let controller;
  const stream = new ReadableStream({
    start(c) {
      controller = c;
      sseClients.push({ sessionId, controller });
      
      const handshake = `event: handshake\ndata: ${JSON.stringify({ ok: true, active_users: sseClients.length })}\n\n`;
      c.enqueue(new TextEncoder().encode(handshake));
    },
    cancel() {
      sseClients = sseClients.filter(client => client.controller !== controller);
    }
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    }
  });
}, {
  summary: "Open a Server-Sent Events (SSE) telemetry chat stream",
  tags: ["Support"],
  query: {
    session_id: "Unique client session token"
  }
});

apiRouter.post("/chats/typing", (ctx) => {
  const body = ctx.body || {};
  const { session_id, is_typing, sender } = body;
  if (!session_id) {
    throw new Response(JSON.stringify({ detail: "session_id is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
  broadcastToChat(session_id, "typing", { is_typing, sender });
  return { ok: true };
}, {
  summary: "Send support chat typing telemetry indicators",
  tags: ["Support"],
  body: {
    session_id: { type: "string" },
    is_typing: { type: "boolean" },
    sender: { type: "string" }
  }
});

apiRouter.get("/chats/messages", async (ctx) => {
  const sessionId = ctx.query.session_id;
  if (!sessionId) {
    throw new Response(JSON.stringify({ detail: "session_id is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
  
  ctx.db.chats = ctx.db.chats || [];
  let chat = ctx.db.chats.find(c => c.session_id === sessionId);
  if (!chat) {
    chat = {
      id: crypto ? crypto.randomUUID().substring(0, 8) : "chat-" + Date.now(),
      session_id: sessionId,
      status: "active",
      messages: [
        {
          sender: "admin",
          text: "Welcome to AetherXOS Live Support. An exokernel engineer will assist you shortly.",
          ts: new Date().toISOString(),
          author: "System Core"
        }
      ],
      created_at: new Date().toISOString()
    };
    const db = withDb(ctx.db);
    await db.insert("chats", chat);
    broadcastToChat("admin", "new_chat", chat);
  }
  return chat;
}, {
  summary: "Get chat transcripts for a customer support session",
  tags: ["Support"],
  query: {
    session_id: "Unique client session token"
  }
});

apiRouter.post("/chats/messages", async (ctx) => {
  const body = ctx.body || {};
  const { session_id, text, sender } = body;
  if (!session_id || !text) {
    throw new Response(JSON.stringify({ detail: "session_id and text are required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  ctx.db.chats = ctx.db.chats || [];
  let chat = ctx.db.chats.find(c => c.session_id === session_id);
  if (!chat) {
    throw new Response(JSON.stringify({ detail: "Session not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  chat.messages.push({
    sender: sender || "user",
    text,
    ts: new Date().toISOString()
  });
  chat.status = "active";
  const db = withDb(ctx.db);
  // find index and update
  const idx = ctx.db.chats.findIndex(c => c.session_id === session_id);
  if (idx !== -1) await db.updateAt("chats", idx, chat);

  broadcastToChat(session_id, "message", chat);
  broadcastToChat("admin", "message", chat);
  return chat;
}, {
  summary: "Publish a support chat message",
  tags: ["Support"],
  body: {
    session_id: { type: "string" },
    text: { type: "string" },
    sender: { type: "string" }
  }
});

apiRouter.get("/admin/chats", requireStaffMiddleware, (ctx) => {
  return ctx.db.chats || [];
}, {
  summary: "List all support chat transcripts (Staff only)",
  tags: ["Support"],
  secured: true
});

apiRouter.post("/admin/chats/reply", requireStaffMiddleware, async (ctx) => {
  const staff = ctx.user;
  const body = ctx.body || {};
  const { chat_id, text } = body;
  if (!chat_id || !text) {
    throw new Response(JSON.stringify({ detail: "chat_id and text are required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
  
  ctx.db.chats = ctx.db.chats || [];
  const chat = ctx.db.chats.find(c => c.id === chat_id);
  if (!chat) {
    throw new Response(JSON.stringify({ detail: "Chat session not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }
  
  chat.messages.push({
    sender: "admin",
    text,
    ts: new Date().toISOString(),
    author: staff.name
  });
  const db = withDb(ctx.db);
  const idx = ctx.db.chats.findIndex(c => c.id === chat_id);
  if (idx !== -1) await db.updateAt("chats", idx, chat);
  broadcastToChat(chat.session_id, "message", chat);
  return chat;
}, {
  summary: "Post staff reply to a support chat session (Staff only)",
  tags: ["Support"],
  secured: true,
  body: {
    chat_id: { type: "string" },
    text: { type: "string" }
  }
});

apiRouter.post("/admin/chats/resolve", requireStaffMiddleware, async (ctx) => {
  const body = ctx.body || {};
  const { chat_id } = body;
  
  ctx.db.chats = ctx.db.chats || [];
  const chat = ctx.db.chats.find(c => c.id === chat_id);
  if (!chat) {
    throw new Response(JSON.stringify({ detail: "Chat session not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }
  
  chat.status = chat.status === "active" ? "resolved" : "active";
  const db = withDb(ctx.db);
  const idx = ctx.db.chats.findIndex(c => c.id === chat_id);
  if (idx !== -1) await db.updateAt("chats", idx, chat);
  broadcastToChat(chat.session_id, "message", chat);
  return chat;
}, {
  summary: "Resolve or reopen a customer support chat (Staff only)",
  tags: ["Support"],
  secured: true,
  body: {
    chat_id: { type: "string" }
  }
});
