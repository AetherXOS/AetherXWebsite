import { apiRouter } from "./apiRouter.js";
import { getAuthenticatedUser, logAdminAction, authenticateMiddleware } from "./helpers.js";
import { verifyPassword, saveDb } from "../../lib/serverDb.js";

apiRouter.use(authenticateMiddleware);

apiRouter.get("/auth/me", (ctx) => {
  if (!ctx.user) {
    throw new Response(JSON.stringify({ detail: "Not authenticated" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
  const copy = { ...ctx.user };
  delete copy.password_hash;
  return copy;
}, {
  summary: "Get Current Authenticated User",
  tags: ["Authentication"],
  secured: true,
  responses: {
    200: { description: "Returns the authenticated user details." },
    401: { description: "User session is invalid or not active." }
  }
});

apiRouter.post("/auth/login", (ctx) => {
  const body = ctx.body || {};
  const email = (body.email || "").toLowerCase();
  const password = body.password || "";

  const user = ctx.db.users.find((u) => u.email.toLowerCase() === email);
  if (!user || !verifyPassword(password, user.password_hash)) {
    throw new Response(JSON.stringify({ detail: "Invalid credentials" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const token = user.id;
  logAdminAction(ctx.db, "login", user.email, { ip: "127.0.0.1" });

  const userResponse = { id: user.id, email: user.email, name: user.name, role: user.role };
  return new Response(
    JSON.stringify({ user: userResponse, access_token: token }),
    {
      headers: {
        "Content-Type": "application/json",
        "Set-Cookie": `access_token=${token}; Path=/; HttpOnly; Max-Age=${12 * 3600}; SameSite=Lax`,
      },
    }
  );
}, {
  summary: "Admin & Editor Authentication",
  tags: ["Authentication"],
  body: {
    email: { type: "string", description: "Registered email address." },
    password: { type: "string", description: "Password." }
  },
  responses: {
    200: { description: "Login successful; issues an access token and sets cookie." },
    401: { description: "Invalid email or password." }
  }
});

apiRouter.post("/auth/logout", (ctx) => {
  if (ctx.user) {
    logAdminAction(ctx.db, "logout", ctx.user.email);
  }
  return new Response(
    JSON.stringify({ ok: true }),
    {
      headers: {
        "Content-Type": "application/json",
        "Set-Cookie": "access_token=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax",
      },
    }
  );
}, {
  summary: "Clear Authentication Session",
  tags: ["Authentication"],
  responses: {
    200: { description: "Session cleared successfully." }
  }
});
