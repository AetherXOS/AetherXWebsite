# AetherXOS — PRD

## Problem Statement
Build the official website and admin portal for **AetherXOS** — a next-generation, high-performance, secure Exokernel + Library OS. Must feel blazingly fast, highly technical, developer-centric. Deep dark mode (pure black), Electric Cyan (#00E5FF) neon accents.

## Stack
- **Frontend:** React 19 + Tailwind + shadcn/ui + recharts + react-router-dom. Fonts: JetBrains Mono (headings/code) + IBM Plex Sans (body).
- **Backend:** FastAPI + Motor (async MongoDB) + PyJWT + bcrypt.
- **Storage:** Local disk at `/app/backend/storage/releases` for ISO uploads (SHA256 auto-computed).
- **DB:** MongoDB collections — `users`, `posts`, `changelogs`, `releases`, `analytics_events`, `admin_logs`, `login_attempts`.

## User Personas
1. **Visitor / Developer** — wants to learn what AetherXOS is, download builds, read changelog/news/architecture/docs.
2. **Admin / Core team** — manages content (News, Changelogs), publishes releases (upload or external URL), monitors traffic + downloads.

## Core Requirements
- Multi-page public site: Home, Downloads, News (+detail), Changelog, Architecture, Docs.
- CLI/Terminal boot animation on homepage hero.
- Download Center with Stable / Beta / Nightly channels, SHA256, sizes, hardware requirements.
- Blog with categories, tags, search, pagination.
- Git-style changelog timeline.
- Architecture page (Exokernel vs Monolithic) with diagram.
- Documentation portal with sidebar nav.
- JWT-auth admin portal: Analytics (real custom tracking with charts), CMS (WYSIWYG), Release Manager (upload-to-disk + URL+checksum), System Health + Activity Log.

## Implemented (2026-02-17)
- ✅ Full backend: auth (JWT + bcrypt + brute-force lockout + admin seed), posts/changelogs/releases CRUD, multipart ISO upload with auto SHA256, public analytics tracker, admin analytics aggregation, health, logs.
- ✅ All public pages with terminal boot animation, bento features, theme.
- ✅ All admin pages with WYSIWYG editor (contentEditable + toolbar), recharts dashboard, release uploader (file or URL+checksum), system health auto-refresh.
- ✅ Seeded demo data: 3 posts, 4 changelogs, 3 releases, ~30 days of analytics events.
- ✅ 23/23 backend pytest cases passing.

## Prioritized Backlog
- **P1** Tighten CORS to explicit origins (currently `*` works behind ingress).
- **P1** Per-IP rate limiting on `/api/analytics/track`.
- **P2** Real GeoIP integration (MaxMind / ip-api) instead of hash-bucketed countries.
- **P2** Public analytics opt-out / DNT respect.
- **P2** RSS feed for news + changelog.
- **P2** Documentation Markdown loader (load .md files from repo instead of inline content map).
- **P3** Multi-admin user management UI.
- **P3** Comments / reactions on news posts.
- **P3** Detached signing of release artifacts (GPG signatures + verification instructions).

## Test Credentials
See `/app/memory/test_credentials.md` — `admin@aetherxos.com` / `aether123`.
