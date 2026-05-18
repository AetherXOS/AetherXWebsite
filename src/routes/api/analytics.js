import { apiRouter } from "./apiRouter.js";
import { requireAdminMiddleware } from "./helpers.js";
import { withDb } from "../../lib/dbAdapter.js";
import { createRequire } from "module";

let crypto = null;
if (typeof window === "undefined") {
  const require = createRequire(import.meta.url);
  crypto = require("crypto");
}

export let analyticsSseClients = [];

function buildWindowSummary(events, days) {
  const since = Date.now() - days * 24 * 60 * 60 * 1000;
  const windowEvents = events.filter((e) => new Date(e.ts).getTime() >= since);

  return {
    days,
    pageviews: windowEvents.filter((e) => e.type === "pageview").length,
    downloads: windowEvents.filter((e) => e.type === "download").length,
    unique_visitors: new Set(windowEvents.filter((e) => e.type === "pageview").map((e) => e.ip)).size,
  };
}

function broadcastAnalyticsUpdate(payload) {
  const message = `event: analytics\ndata: ${JSON.stringify(payload)}\n\n`;
  const bytes = new TextEncoder().encode(message);
  analyticsSseClients.forEach((client) => {
    try {
      client.controller.enqueue(bytes);
    } catch (_) {
      // drop stale client
    }
  });
}

apiRouter.get("/admin/analytics/stream", requireAdminMiddleware, (ctx) => {
  let controller;
  const stream = new ReadableStream({
    start(c) {
      controller = c;
      analyticsSseClients.push({ controller });
      const handshake = `event: handshake\ndata: ${JSON.stringify({ ok: true, connected: analyticsSseClients.length })}\n\n`;
      c.enqueue(new TextEncoder().encode(handshake));
    },
    cancel() {
      analyticsSseClients = analyticsSseClients.filter((client) => client.controller !== controller);
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
  summary: "Open live analytics update stream (Admin only)",
  tags: ["Analytics"],
  secured: true
});

// ---------------------------------------------------------------------------
// GITHUB STARS ENDPOINT
// ---------------------------------------------------------------------------
apiRouter.get("/github/stars", (ctx) => {
  ctx.db.github_stats = ctx.db.github_stats || {
    stars: null,
    updated_at: null,
  };

  const lastUpdated = ctx.db.github_stats.updated_at ? new Date(ctx.db.github_stats.updated_at).getTime() : 0;
  const oneDayMs = 24 * 60 * 60 * 1000;
  
  if (ctx.db.github_stats.stars == null || Date.now() - lastUpdated > oneDayMs) {
    // fire-and-forget background refresh using the adapter to persist
    (async () => {
      try {
        const res = await fetch("https://api.github.com/repos/AetherXOS/AetherXOS", {
          headers: { "User-Agent": "AetherXOS-Website-Portal" },
        });
        const data = await res.json();
        if (data && typeof data.stargazers_count === "number") {
          ctx.db.github_stats = ctx.db.github_stats || {};
          ctx.db.github_stats.stars = data.stargazers_count;
          ctx.db.github_stats.updated_at = new Date().toISOString();
          await withDb(ctx.db).save();
        }
      } catch (err) {
        console.error("Error fetching stargazers in background:", err);
      }
    })();
  }

  return { stars: ctx.db.github_stats.stars };
}, {
  summary: "Get cached exokernel GitHub stargazers count",
  tags: ["Analytics"]
});

// ---------------------------------------------------------------------------
// ANALYTICS & LOGGING ROUTES
// ---------------------------------------------------------------------------
apiRouter.post("/analytics/track", async (ctx) => {
  const body = ctx.body || {};
  const request = ctx.request;

  const ip = request.headers.get("x-forwarded-for") || "127.0.0.1";
  const countries = ["United States", "Germany", "Turkey", "India", "Brazil", "Japan", "United Kingdom", "Canada"];
  const h = ip.split(".").reduce((acc, val) => acc + parseInt(val || "0"), 0);
  const country = countries[h % countries.length];

  const newEvent = {
    id: crypto ? crypto.randomUUID().substring(0, 8) : "ev-" + Date.now(),
    type: body.type || "pageview",
    path: body.path || "",
    referrer: body.referrer || "",
    ip,
    country,
    ua: request.headers.get("user-agent") || "unknown",
    meta: body.meta || {},
    ts: new Date().toISOString(),
  };

  const db = withDb(ctx.db);
  await db.insert("analytics", newEvent);
  broadcastAnalyticsUpdate({ type: newEvent.type, path: newEvent.path, ts: newEvent.ts, ip: newEvent.ip });
  return { ok: true };
}, {
  summary: "Track telemetry events (Pageviews, Downloads)",
  tags: ["Analytics"],
  body: {
    type: { type: "string" },
    path: { type: "string" },
    referrer: { type: "string" },
    meta: { type: "object" }
  }
});

apiRouter.get("/admin/analytics", requireAdminMiddleware, (ctx) => {
  const days = parseInt(ctx.query.days || "7");

  const since = Date.now() - days * 24 * 60 * 60 * 1000;
  ctx.db.analytics = ctx.db.analytics || [];
  const events = ctx.db.analytics.filter((e) => new Date(e.ts).getTime() >= since);

  const total_pv = events.filter((e) => e.type === "pageview").length;
  const total_dl = events.filter((e) => e.type === "download").length;
  const unique_visitors = new Set(events.filter((e) => e.type === "pageview").map((e) => e.ip)).size;

  const daily = {};
  events.forEach((e) => {
    const day = e.ts.substring(0, 10);
    if (!daily[day]) {
      daily[day] = { date: day, pageviews: 0, downloads: 0, visitors: new Set() };
    }
    if (e.type === "pageview") {
      daily[day].pageviews++;
      daily[day].visitors.add(e.ip);
    } else if (e.type === "download") {
      daily[day].downloads++;
    }
  });

  const series = Object.values(daily)
    .map((v) => ({
      date: v.date,
      pageviews: v.pageviews,
      downloads: v.downloads,
      visitors: v.visitors.size,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const pageCounts = {};
  events.filter((e) => e.type === "pageview").forEach((e) => {
    const p = e.path || "/";
    pageCounts[p] = (pageCounts[p] || 0) + 1;
  });
  const top_pages = Object.entries(pageCounts)
    .map(([p, views]) => ({ path: p, views }))
    .sort((a, b) => b.views - a.views)
    .slice(0, 10);

  const geoCounts = {};
  events.forEach((e) => {
    const c = e.country || "Unknown";
    geoCounts[c] = (geoCounts[c] || 0) + 1;
  });
  const geography = Object.entries(geoCounts)
    .map(([c, count]) => ({ country: c, events: count }))
    .sort((a, b) => b.events - a.events);

  const refCounts = {};
  events.forEach((e) => {
    let r = e.referrer || "direct";
    if (r && r !== "direct") {
      try {
        const parsed = new URL(r);
        r = parsed.hostname || "direct";
      } catch {
        r = "direct";
      }
    }
    refCounts[r] = (refCounts[r] || 0) + 1;
  });
  const top_referrers = Object.entries(refCounts)
    .map(([source, count]) => ({ source, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  const dlCounts = {};
  events.filter((e) => e.type === "download").forEach((e) => {
    const key = `${e.meta?.version || "1.0.0"} (${e.meta?.channel || "stable"})`;
    dlCounts[key] = (dlCounts[key] || 0) + 1;
  });
  const top_downloads = Object.entries(dlCounts)
    .map(([version, count]) => ({ version, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  return {
    summary: {
      pageviews: total_pv,
      downloads: total_dl,
      unique_visitors,
      days,
    },
    windows: [7, 14, 30].map((windowDays) => buildWindowSummary(ctx.db.analytics || [], windowDays)),
    series,
    top_pages,
    geography,
    top_referrers,
    top_downloads,
  };
}, {
  summary: "Get telemetry analytics and source dashboards (Admin only)",
  tags: ["Analytics"],
  secured: true,
  query: {
    days: "Timespan filter in days (default 7)"
  }
});
