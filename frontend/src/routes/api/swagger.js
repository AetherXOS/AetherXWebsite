import { apiRouter } from "./apiRouter.js";

function xmlEscape(unsafe) {
  if (!unsafe) return "";
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case "<": return "&lt;";
      case ">": return "&gt;";
      case "&": return "&amp;";
      case "'": return "&apos;";
      case '"': return "&quot;";
      default: return c;
    }
  });
}

apiRouter.get("/feed/news.xml", (ctx) => {
  const posts = (ctx.db.posts || []).filter((p) => p.published).slice(0, 30);
  const base = ctx.url.origin;

  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">\n<channel>\n<title>AetherXOS News</title>\n<link>${base}/news</link>\n<description>Releases, deep-dives, and announcements.</description>\n<atom:link href="${base}/api/feed/news.xml" rel="self" type="application/rss+xml" />\n<lastBuildDate>${new Date().toUTCString()}</lastBuildDate>`;

  posts.forEach((p) => {
    xml += `\n<item>\n<title>${xmlEscape(p.title)}</title>\n<link>${base}/news/${p.slug}</link>\n<guid isPermaLink="false">${p.id}</guid>\n<pubDate>${new Date(p.created_at).toUTCString()}</pubDate>\n<description><![CDATA[${p.excerpt || p.content}]]></description>\n</item>`;
  });

  xml += `\n</channel>\n</rss>`;

  return new Response(xml, {
    headers: { "Content-Type": "text/xml" },
  });
}, {
  summary: "Get RSS XML feed for all news articles",
  tags: ["Feeds"]
});

apiRouter.get("/feed/changelog.xml", (ctx) => {
  const changelogs = ctx.db.changelogs || [];
  const base = ctx.url.origin;

  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">\n<channel>\n<title>AetherXOS Changelog</title>\n<link>${base}/changelog</link>\n<description>Architectural changes, fixes, and security advisories.</description>\n<atom:link href="${base}/api/feed/changelog.xml" rel="self" type="application/rss+xml" />\n<lastBuildDate>${new Date().toUTCString()}</lastBuildDate>`;

  changelogs.forEach((c) => {
    xml += `\n<item>\n<title>v${c.version} — ${xmlEscape(c.title)}</title>\n<link>${base}/changelog</link>\n<guid isPermaLink="false">${c.id}</guid>\n<pubDate>${new Date(c.released_at || c.created_at).toUTCString()}</pubDate>\n<description><![CDATA[${c.content}]]></description>\n</item>`;
  });

  xml += `\n</channel>\n</rss>`;

  return new Response(xml, {
    headers: { "Content-Type": "text/xml" },
  });
}, {
  summary: "Get RSS XML feed for all changelog releases",
  tags: ["Feeds"]
});

apiRouter.get("/openapi.json", (ctx) => {
  return apiRouter.generateOpenApiSpec();
}, {
  summary: "Get autonomously compiled exokernel OpenAPI 3.0 specification",
  tags: ["Documentation"]
});

apiRouter.get("/docs/swagger", (ctx) => {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>AetherXOS Portal API Sandbox</title>
  <link rel="stylesheet" type="text/css" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css" />
  <style>
    html { box-sizing: border-box; overflow-y: scroll; }
    *, *:before, *:after { box-sizing: inherit; }
    body { margin: 0; background: #ffffff; font-family: 'JetBrains Mono', monospace; }
    .swagger-ui { 
      padding: 24px;
      max-width: 1200px;
      margin: 0 auto;
      background: #fff !important;
      color: #111 !important;
    }
    .swagger-ui .topbar { display: none !important; }
    .swagger-ui .info .title { color: #000000 !important; font-family: 'JetBrains Mono', monospace; font-weight: bold; }
    .swagger-ui .scheme-container { background: #f7f7f7 !important; box-shadow: none !important; border: 1px solid #ddd; }
  </style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
  <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-standalone-preset.js"></script>
  <script>
    window.onload = function() {
      window.ui = SwaggerUIBundle({
        url: "/api/openapi.json",
        dom_id: '#swagger-ui',
        deepLinking: true,
        presets: [
          SwaggerUIBundle.presets.apis,
          SwaggerUIStandalonePreset
        ],
        plugins: [
          SwaggerUIBundle.plugins.DownloadUrl
        ],
        layout: "StandaloneLayout"
      });
    };
  </script>
</body>
</html>`;

  return new Response(html, {
    headers: { "Content-Type": "text/html" },
  });
}, {
  summary: "Open exokernel REST API sandbox explorer (Swagger UI)",
  tags: ["Documentation"]
});

apiRouter.get("/docs/redoc", (ctx) => {
  const html = `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>AetherXOS API Reference (ReDoc)</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>body { margin: 0; padding: 0; } redoc { display: block; height: 100vh; }</style>
  </head>
  <body>
    <redoc spec-url="/api/openapi.json"></redoc>
    <script src="https://cdn.redoc.ly/redoc/latest/bundles/redoc.standalone.js"></script>
  </body>
</html>`;

  return new Response(html, { headers: { "Content-Type": "text/html" } });
}, {
  summary: "Open exokernel API Reference (ReDoc)",
  tags: ["Documentation"]
});

apiRouter.get("/docs/scalar", (ctx) => {
  const html = `<!DOCTYPE html>
<html>
  <head>
    <title>AetherXOS API Reference (Scalar)</title>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      body { margin: 0; }
    </style>
  </head>
  <body>
    <script
      id="api-reference"
      data-url="/api/openapi.json"
      data-theme="dark"
    ></script>
    <script src="https://cdn.jsdelivr.net/npm/@scalar/api-reference"></script>
  </body>
</html>`;

  return new Response(html, {
    headers: { "Content-Type": "text/html" },
  });
}, {
  summary: "Open interactive exokernel REST API sandbox explorer (Scalar)",
  tags: ["Documentation"]
});
