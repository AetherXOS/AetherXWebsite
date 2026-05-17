from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

import os
import re
import uuid
import hashlib
import logging
from datetime import datetime, timezone, timedelta
from typing import List, Optional

import bcrypt
import jwt
from fastapi import FastAPI, APIRouter, Request, Response, HTTPException, Depends, UploadFile, File, Form, Query
from fastapi.responses import FileResponse, JSONResponse
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, EmailStr

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------
JWT_ALGORITHM = "HS256"
ACCESS_TTL_MIN = 60 * 12  # 12h for admin convenience
MAX_LOGIN_ATTEMPTS = 5
LOCKOUT_MINUTES = 15

STORAGE_DIR = Path(os.environ.get("STORAGE_DIR", "/app/backend/storage/releases"))
STORAGE_DIR.mkdir(parents=True, exist_ok=True)

mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

app = FastAPI(title="AetherXOS API")
api = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s | %(message)s")
log = logging.getLogger("aetherxos")

APP_STARTED_AT = datetime.now(timezone.utc)

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def now_utc() -> datetime:
    return datetime.now(timezone.utc)


def hash_password(pw: str) -> str:
    return bcrypt.hashpw(pw.encode(), bcrypt.gensalt()).decode()


def verify_password(pw: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(pw.encode(), hashed.encode())
    except Exception:
        return False


def jwt_secret() -> str:
    return os.environ["JWT_SECRET"]


def create_access_token(user_id: str, email: str, role: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "role": role,
        "exp": now_utc() + timedelta(minutes=ACCESS_TTL_MIN),
        "type": "access",
    }
    return jwt.encode(payload, jwt_secret(), algorithm=JWT_ALGORITHM)


def slugify(text: str) -> str:
    s = re.sub(r"[^\w\s-]", "", text.lower()).strip()
    s = re.sub(r"[\s_-]+", "-", s)
    return s or uuid.uuid4().hex[:8]


def client_ip(request: Request) -> str:
    xff = request.headers.get("x-forwarded-for")
    if xff:
        return xff.split(",")[0].strip()
    return request.client.host if request.client else "0.0.0.0"


# Lightweight IP -> country approximation (no external DB needed).
def country_from_ip(ip: str) -> str:
    if not ip or ip.startswith(("127.", "10.", "192.168.", "172.")):
        return "Local"
    # Pseudo-geo bucket via hash for demo analytics
    buckets = ["US", "DE", "TR", "IN", "BR", "JP", "GB", "FR", "CA", "AU", "NL", "SE", "SG", "KR"]
    h = int(hashlib.md5(ip.encode()).hexdigest(), 16)
    return buckets[h % len(buckets)]


async def admin_log(action: str, actor: str, meta: Optional[dict] = None):
    await db.admin_logs.insert_one({
        "id": str(uuid.uuid4()),
        "action": action,
        "actor": actor,
        "meta": meta or {},
        "ts": now_utc().isoformat(),
    })


# ---------------------------------------------------------------------------
# Auth dependency
# ---------------------------------------------------------------------------
async def get_current_user(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        auth = request.headers.get("Authorization", "")
        if auth.startswith("Bearer "):
            token = auth[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, jwt_secret(), algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Invalid token type")
        user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0, "password_hash": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


async def require_admin(user: dict = Depends(get_current_user)) -> dict:
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return user


# ---------------------------------------------------------------------------
# Models
# ---------------------------------------------------------------------------
class LoginIn(BaseModel):
    email: EmailStr
    password: str


class PostIn(BaseModel):
    title: str
    excerpt: str = ""
    content: str  # HTML from WYSIWYG
    category: str = "General"
    tags: List[str] = []
    cover_image: Optional[str] = None
    published: bool = True


class ChangelogIn(BaseModel):
    version: str
    title: str
    content: str  # HTML
    type: str = "feature"  # feature | fix | breaking | security | perf
    released_at: Optional[str] = None


class ReleaseIn(BaseModel):
    version: str
    channel: str  # stable | beta | nightly
    title: str
    notes: str = ""
    file_url: Optional[str] = None
    file_name: Optional[str] = None
    file_size: Optional[int] = None
    sha256: Optional[str] = None
    arch: str = "x86_64"
    min_ram_gb: int = 2
    min_disk_gb: int = 4
    storage_kind: str = "external"  # external | local


class TrackEventIn(BaseModel):
    type: str  # pageview | download
    path: str = ""
    referrer: str = ""
    meta: dict = {}


# ---------------------------------------------------------------------------
# AUTH ROUTES
# ---------------------------------------------------------------------------
@api.post("/auth/login")
async def login(body: LoginIn, request: Request, response: Response):
    email = body.email.lower()
    ip = client_ip(request)
    identifier = f"{ip}:{email}"

    attempt = await db.login_attempts.find_one({"identifier": identifier})
    if attempt and attempt.get("locked_until"):
        locked_until = datetime.fromisoformat(attempt["locked_until"])
        if locked_until > now_utc():
            raise HTTPException(status_code=429, detail="Too many attempts. Try again later.")

    user = await db.users.find_one({"email": email})
    if not user or not verify_password(body.password, user["password_hash"]):
        await db.login_attempts.update_one(
            {"identifier": identifier},
            {"$inc": {"count": 1}, "$set": {"last_attempt": now_utc().isoformat()}},
            upsert=True,
        )
        updated = await db.login_attempts.find_one({"identifier": identifier})
        if updated and updated.get("count", 0) >= MAX_LOGIN_ATTEMPTS:
            await db.login_attempts.update_one(
                {"identifier": identifier},
                {"$set": {"locked_until": (now_utc() + timedelta(minutes=LOCKOUT_MINUTES)).isoformat(), "count": 0}},
            )
        raise HTTPException(status_code=401, detail="Invalid credentials")

    await db.login_attempts.delete_one({"identifier": identifier})

    token = create_access_token(user["id"], user["email"], user.get("role", "admin"))
    response.set_cookie(
        key="access_token",
        value=token,
        httponly=True,
        secure=False,
        samesite="lax",
        max_age=ACCESS_TTL_MIN * 60,
        path="/",
    )
    await admin_log("login", email, {"ip": ip})
    return {
        "user": {"id": user["id"], "email": user["email"], "name": user.get("name", ""), "role": user.get("role", "admin")},
        "access_token": token,
    }


@api.post("/auth/logout")
async def logout(response: Response, user: dict = Depends(get_current_user)):
    response.delete_cookie("access_token", path="/")
    await admin_log("logout", user["email"])
    return {"ok": True}


@api.get("/auth/me")
async def me(user: dict = Depends(get_current_user)):
    return user


# ---------------------------------------------------------------------------
# POSTS (News & Announcements) - public list/detail; admin manage
# ---------------------------------------------------------------------------
@api.get("/posts")
async def list_posts(
    category: Optional[str] = None,
    tag: Optional[str] = None,
    q: Optional[str] = None,
    page: int = 1,
    page_size: int = 9,
    include_unpublished: bool = False,
):
    query: dict = {}
    if not include_unpublished:
        query["published"] = True
    if category:
        query["category"] = category
    if tag:
        query["tags"] = tag
    if q:
        query["$or"] = [
            {"title": {"$regex": q, "$options": "i"}},
            {"excerpt": {"$regex": q, "$options": "i"}},
        ]
    skip = max(0, (page - 1) * page_size)
    cursor = db.posts.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(page_size)
    items = await cursor.to_list(length=page_size)
    total = await db.posts.count_documents(query)
    # All distinct categories & tags for filters
    cats = await db.posts.distinct("category", {"published": True})
    tags = await db.posts.distinct("tags", {"published": True})
    return {"items": items, "total": total, "page": page, "page_size": page_size, "categories": cats, "tags": tags}


@api.get("/posts/{slug}")
async def get_post(slug: str):
    post = await db.posts.find_one({"slug": slug}, {"_id": 0})
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    return post


@api.post("/posts")
async def create_post(body: PostIn, user: dict = Depends(require_admin)):
    slug_base = slugify(body.title)
    slug = slug_base
    i = 1
    while await db.posts.find_one({"slug": slug}):
        i += 1
        slug = f"{slug_base}-{i}"
    doc = {
        "id": str(uuid.uuid4()),
        "slug": slug,
        **body.model_dump(),
        "author": user["email"],
        "created_at": now_utc().isoformat(),
        "updated_at": now_utc().isoformat(),
    }
    await db.posts.insert_one(doc)
    doc.pop("_id", None)
    await admin_log("post.create", user["email"], {"slug": slug})
    return doc


@api.put("/posts/{post_id}")
async def update_post(post_id: str, body: PostIn, user: dict = Depends(require_admin)):
    existing = await db.posts.find_one({"id": post_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Post not found")
    update = {**body.model_dump(), "updated_at": now_utc().isoformat()}
    await db.posts.update_one({"id": post_id}, {"$set": update})
    await admin_log("post.update", user["email"], {"id": post_id})
    doc = await db.posts.find_one({"id": post_id}, {"_id": 0})
    return doc


@api.delete("/posts/{post_id}")
async def delete_post(post_id: str, user: dict = Depends(require_admin)):
    res = await db.posts.delete_one({"id": post_id})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Post not found")
    await admin_log("post.delete", user["email"], {"id": post_id})
    return {"ok": True}


# ---------------------------------------------------------------------------
# CHANGELOGS
# ---------------------------------------------------------------------------
@api.get("/changelogs")
async def list_changelogs():
    items = await db.changelogs.find({}, {"_id": 0}).sort("released_at", -1).to_list(length=500)
    return {"items": items}


@api.post("/changelogs")
async def create_changelog(body: ChangelogIn, user: dict = Depends(require_admin)):
    doc = {
        "id": str(uuid.uuid4()),
        **body.model_dump(),
        "released_at": body.released_at or now_utc().isoformat(),
        "created_at": now_utc().isoformat(),
    }
    await db.changelogs.insert_one(doc)
    doc.pop("_id", None)
    await admin_log("changelog.create", user["email"], {"version": body.version})
    return doc


@api.put("/changelogs/{cid}")
async def update_changelog(cid: str, body: ChangelogIn, user: dict = Depends(require_admin)):
    update = body.model_dump()
    if not update.get("released_at"):
        update["released_at"] = now_utc().isoformat()
    res = await db.changelogs.update_one({"id": cid}, {"$set": update})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Changelog not found")
    await admin_log("changelog.update", user["email"], {"id": cid})
    return await db.changelogs.find_one({"id": cid}, {"_id": 0})


@api.delete("/changelogs/{cid}")
async def delete_changelog(cid: str, user: dict = Depends(require_admin)):
    res = await db.changelogs.delete_one({"id": cid})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Not found")
    await admin_log("changelog.delete", user["email"], {"id": cid})
    return {"ok": True}


# ---------------------------------------------------------------------------
# RELEASES / DOWNLOADS
# ---------------------------------------------------------------------------
@api.get("/releases")
async def list_releases(channel: Optional[str] = None):
    q = {"channel": channel} if channel else {}
    items = await db.releases.find(q, {"_id": 0}).sort("created_at", -1).to_list(length=200)
    return {"items": items}


@api.post("/releases")
async def create_release(body: ReleaseIn, user: dict = Depends(require_admin)):
    doc = {
        "id": str(uuid.uuid4()),
        **body.model_dump(),
        "downloads": 0,
        "created_at": now_utc().isoformat(),
    }
    await db.releases.insert_one(doc)
    doc.pop("_id", None)
    await admin_log("release.create", user["email"], {"version": body.version, "channel": body.channel})
    return doc


@api.post("/releases/upload")
async def upload_release(
    version: str = Form(...),
    channel: str = Form(...),
    title: str = Form(...),
    notes: str = Form(""),
    arch: str = Form("x86_64"),
    min_ram_gb: int = Form(2),
    min_disk_gb: int = Form(4),
    file: UploadFile = File(...),
    user: dict = Depends(require_admin),
):
    safe_name = re.sub(r"[^\w.\-]+", "_", file.filename or "build.iso")
    rid = str(uuid.uuid4())
    save_path = STORAGE_DIR / f"{rid}__{safe_name}"
    h = hashlib.sha256()
    total = 0
    with save_path.open("wb") as out:
        while True:
            chunk = await file.read(1024 * 1024)
            if not chunk:
                break
            out.write(chunk)
            h.update(chunk)
            total += len(chunk)
    sha = h.hexdigest()
    doc = {
        "id": rid,
        "version": version,
        "channel": channel,
        "title": title,
        "notes": notes,
        "file_url": None,
        "file_name": safe_name,
        "file_size": total,
        "sha256": sha,
        "arch": arch,
        "min_ram_gb": min_ram_gb,
        "min_disk_gb": min_disk_gb,
        "storage_kind": "local",
        "local_path": str(save_path),
        "downloads": 0,
        "created_at": now_utc().isoformat(),
    }
    await db.releases.insert_one(doc)
    await admin_log("release.upload", user["email"], {"version": version, "channel": channel, "size": total})
    doc.pop("_id", None)
    doc.pop("local_path", None)
    return doc


@api.delete("/releases/{rid}")
async def delete_release(rid: str, user: dict = Depends(require_admin)):
    rel = await db.releases.find_one({"id": rid})
    if not rel:
        raise HTTPException(status_code=404, detail="Release not found")
    lp = rel.get("local_path")
    if lp and Path(lp).exists():
        try:
            Path(lp).unlink()
        except Exception:
            pass
    await db.releases.delete_one({"id": rid})
    await admin_log("release.delete", user["email"], {"id": rid})
    return {"ok": True}


@api.get("/releases/{rid}/download")
async def download_release(rid: str, request: Request):
    rel = await db.releases.find_one({"id": rid})
    if not rel:
        raise HTTPException(status_code=404, detail="Release not found")
    await db.releases.update_one({"id": rid}, {"$inc": {"downloads": 1}})
    ip = client_ip(request)
    await db.analytics_events.insert_one({
        "id": str(uuid.uuid4()),
        "type": "download",
        "release_id": rid,
        "version": rel.get("version"),
        "channel": rel.get("channel"),
        "ip": ip,
        "country": country_from_ip(ip),
        "ua": request.headers.get("user-agent", ""),
        "referrer": request.headers.get("referer", ""),
        "ts": now_utc().isoformat(),
    })
    if rel.get("storage_kind") == "local" and rel.get("local_path"):
        return FileResponse(rel["local_path"], filename=rel.get("file_name") or "aetherxos.iso", media_type="application/octet-stream")
    if rel.get("file_url"):
        return JSONResponse({"redirect": rel["file_url"]})
    raise HTTPException(status_code=404, detail="No file available")


# ---------------------------------------------------------------------------
# ANALYTICS
# ---------------------------------------------------------------------------
@api.post("/analytics/track")
async def analytics_track(body: TrackEventIn, request: Request):
    ip = client_ip(request)
    doc = {
        "id": str(uuid.uuid4()),
        "type": body.type,
        "path": body.path,
        "referrer": body.referrer or request.headers.get("referer", ""),
        "ip": ip,
        "country": country_from_ip(ip),
        "ua": request.headers.get("user-agent", ""),
        "meta": body.meta,
        "ts": now_utc().isoformat(),
    }
    await db.analytics_events.insert_one(doc)
    return {"ok": True}


@api.get("/admin/analytics")
async def admin_analytics(days: int = 7, user: dict = Depends(require_admin)):
    since = (now_utc() - timedelta(days=days)).isoformat()
    cursor = db.analytics_events.find({"ts": {"$gte": since}}, {"_id": 0})
    events = await cursor.to_list(length=50000)

    total_pv = sum(1 for e in events if e["type"] == "pageview")
    total_dl = sum(1 for e in events if e["type"] == "download")
    unique_visitors = len({e["ip"] for e in events if e["type"] == "pageview"})

    # Daily series
    daily: dict = {}
    for e in events:
        day = e["ts"][:10]
        d = daily.setdefault(day, {"date": day, "pageviews": 0, "downloads": 0, "visitors": set()})
        if e["type"] == "pageview":
            d["pageviews"] += 1
            d["visitors"].add(e["ip"])
        elif e["type"] == "download":
            d["downloads"] += 1
    series = sorted(
        [{"date": v["date"], "pageviews": v["pageviews"], "downloads": v["downloads"], "visitors": len(v["visitors"])} for v in daily.values()],
        key=lambda x: x["date"],
    )

    # Top pages
    pages: dict = {}
    for e in events:
        if e["type"] == "pageview":
            pages[e["path"]] = pages.get(e["path"], 0) + 1
    top_pages = sorted([{"path": k or "/", "views": v} for k, v in pages.items()], key=lambda x: -x["views"])[:10]

    # Geography
    geo: dict = {}
    for e in events:
        c = e.get("country", "Unknown")
        geo[c] = geo.get(c, 0) + 1
    geography = sorted([{"country": k, "events": v} for k, v in geo.items()], key=lambda x: -x["events"])

    # Referrers
    refs: dict = {}
    for e in events:
        r = (e.get("referrer") or "").split("?")[0]
        if not r:
            r = "direct"
        else:
            try:
                from urllib.parse import urlparse
                r = urlparse(r).hostname or "direct"
            except Exception:
                r = "direct"
        refs[r] = refs.get(r, 0) + 1
    top_referrers = sorted([{"source": k, "count": v} for k, v in refs.items()], key=lambda x: -x["count"])[:10]

    # Top downloads by version
    dls: dict = {}
    for e in events:
        if e["type"] == "download":
            key = f"{e.get('version','?')} ({e.get('channel','?')})"
            dls[key] = dls.get(key, 0) + 1
    top_downloads = sorted([{"version": k, "count": v} for k, v in dls.items()], key=lambda x: -x["count"])[:10]

    return {
        "summary": {
            "pageviews": total_pv,
            "downloads": total_dl,
            "unique_visitors": unique_visitors,
            "days": days,
        },
        "series": series,
        "top_pages": top_pages,
        "geography": geography,
        "top_referrers": top_referrers,
        "top_downloads": top_downloads,
    }


@api.get("/admin/health")
async def admin_health(user: dict = Depends(require_admin)):
    try:
        await db.command("ping")
        db_ok = True
    except Exception:
        db_ok = False
    posts = await db.posts.count_documents({})
    releases = await db.releases.count_documents({})
    changelogs = await db.changelogs.count_documents({})
    events = await db.analytics_events.count_documents({})
    uptime = (now_utc() - APP_STARTED_AT).total_seconds()
    storage_used = 0
    for p in STORAGE_DIR.glob("*"):
        try:
            storage_used += p.stat().st_size
        except Exception:
            pass
    return {
        "db_ok": db_ok,
        "uptime_seconds": int(uptime),
        "started_at": APP_STARTED_AT.isoformat(),
        "counts": {"posts": posts, "releases": releases, "changelogs": changelogs, "events": events},
        "storage_used_bytes": storage_used,
    }


@api.get("/admin/logs")
async def admin_logs(limit: int = 100, user: dict = Depends(require_admin)):
    items = await db.admin_logs.find({}, {"_id": 0}).sort("ts", -1).to_list(length=limit)
    return {"items": items}


# ---------------------------------------------------------------------------
# Startup
# ---------------------------------------------------------------------------
@app.on_event("startup")
async def startup():
    # Indexes
    await db.users.create_index("email", unique=True)
    await db.users.create_index("id", unique=True)
    await db.posts.create_index("slug", unique=True)
    await db.posts.create_index("id", unique=True)
    await db.changelogs.create_index("id", unique=True)
    await db.releases.create_index("id", unique=True)
    await db.analytics_events.create_index("ts")
    await db.login_attempts.create_index("identifier")

    # Seed admin
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@aetherxos.dev").lower()
    admin_password = os.environ.get("ADMIN_PASSWORD", "aether123")
    existing = await db.users.find_one({"email": admin_email})
    if not existing:
        await db.users.insert_one({
            "id": str(uuid.uuid4()),
            "email": admin_email,
            "password_hash": hash_password(admin_password),
            "name": "AetherXOS Admin",
            "role": "admin",
            "created_at": now_utc().isoformat(),
        })
        log.info(f"Seeded admin user {admin_email}")
    elif not verify_password(admin_password, existing["password_hash"]):
        await db.users.update_one({"email": admin_email}, {"$set": {"password_hash": hash_password(admin_password)}})
        log.info(f"Updated admin password for {admin_email}")

    # Seed initial data if empty
    if await db.posts.count_documents({}) == 0:
        await _seed_initial_data()


async def _seed_initial_data():
    posts = [
        {
            "id": str(uuid.uuid4()),
            "slug": "aetherxos-1-0-stable-released",
            "title": "AetherXOS 1.0 Stable Released — A New Kernel Era",
            "excerpt": "After 18 months of intensive exokernel research, AetherXOS 1.0 stable is here.",
            "content": "<p>We are thrilled to announce <strong>AetherXOS 1.0</strong>. This release delivers bare-metal performance with full memory safety guarantees, a brand-new <em>Library OS</em> ABI, and dramatically lower system-call latency.</p><h2>Highlights</h2><ul><li>True exokernel architecture</li><li>Userland scheduler hooks</li><li>Zero-copy network stack</li></ul>",
            "category": "Release",
            "tags": ["release", "stable", "1.0"],
            "cover_image": None,
            "published": True,
            "author": "admin@aetherxos.dev",
            "created_at": now_utc().isoformat(),
            "updated_at": now_utc().isoformat(),
        },
        {
            "id": str(uuid.uuid4()),
            "slug": "deep-dive-exokernel-vs-monolithic",
            "title": "Deep Dive: Why the Exokernel Wins on Modern Hardware",
            "excerpt": "Monolithic kernels treat applications as second-class citizens. Exokernels flip the model.",
            "content": "<p>Modern hardware demands a kernel that gets out of the way. In this article, we explore how AetherXOS exposes hardware resources directly to applications through <code>LibOS</code> layers.</p>",
            "category": "Engineering",
            "tags": ["architecture", "exokernel"],
            "cover_image": None,
            "published": True,
            "author": "admin@aetherxos.dev",
            "created_at": (now_utc() - timedelta(days=2)).isoformat(),
            "updated_at": (now_utc() - timedelta(days=2)).isoformat(),
        },
        {
            "id": str(uuid.uuid4()),
            "slug": "community-update-q1",
            "title": "Community Update — Q1 Roadmap and Contributors",
            "excerpt": "RISC-V port milestones, new doc site, and 47 new contributors this quarter.",
            "content": "<p>The community is exploding. This quarter we welcomed 47 new contributors and shipped initial RISC-V boot support.</p>",
            "category": "Community",
            "tags": ["community", "roadmap"],
            "cover_image": None,
            "published": True,
            "author": "admin@aetherxos.dev",
            "created_at": (now_utc() - timedelta(days=5)).isoformat(),
            "updated_at": (now_utc() - timedelta(days=5)).isoformat(),
        },
    ]
    await db.posts.insert_many(posts)

    changelogs = [
        {"id": str(uuid.uuid4()), "version": "1.0.0", "title": "Stable launch", "type": "feature",
         "content": "<ul><li>Exokernel core finalized</li><li>LibOS POSIX layer GA</li><li>Zero-copy NIC drivers</li></ul>",
         "released_at": now_utc().isoformat(), "created_at": now_utc().isoformat()},
        {"id": str(uuid.uuid4()), "version": "0.9.4", "title": "Beta hardening", "type": "fix",
         "content": "<ul><li>Fixed page-fault race in capability table</li><li>Patched TLB shootdown deadlock</li></ul>",
         "released_at": (now_utc() - timedelta(days=14)).isoformat(), "created_at": (now_utc() - timedelta(days=14)).isoformat()},
        {"id": str(uuid.uuid4()), "version": "0.9.0", "title": "First public beta", "type": "feature",
         "content": "<ul><li>Public beta with LibOS prototype</li><li>x86_64 only</li></ul>",
         "released_at": (now_utc() - timedelta(days=60)).isoformat(), "created_at": (now_utc() - timedelta(days=60)).isoformat()},
        {"id": str(uuid.uuid4()), "version": "0.8.2", "title": "Security audit", "type": "security",
         "content": "<ul><li>External audit: 0 criticals, 3 highs resolved</li></ul>",
         "released_at": (now_utc() - timedelta(days=110)).isoformat(), "created_at": (now_utc() - timedelta(days=110)).isoformat()},
    ]
    await db.changelogs.insert_many(changelogs)

    releases = [
        {"id": str(uuid.uuid4()), "version": "1.0.0", "channel": "stable", "title": "AetherXOS 1.0 Stable",
         "notes": "Production-ready stable release.", "file_url": "https://example.com/aetherxos-1.0.0-x86_64.iso",
         "file_name": "aetherxos-1.0.0-x86_64.iso", "file_size": 612 * 1024 * 1024,
         "sha256": "c5b4e1f9a8d3c2b1a09f8e7d6c5b4a39281706e5d4c3b2a190f8e7d6c5b4a392",
         "arch": "x86_64", "min_ram_gb": 2, "min_disk_gb": 8, "storage_kind": "external",
         "downloads": 14237, "created_at": now_utc().isoformat()},
        {"id": str(uuid.uuid4()), "version": "1.1.0-beta.2", "channel": "beta", "title": "AetherXOS 1.1 Beta 2",
         "notes": "Includes new io_uring backend and RISC-V preview.", "file_url": "https://example.com/aetherxos-1.1.0-beta.2.iso",
         "file_name": "aetherxos-1.1.0-beta.2.iso", "file_size": 648 * 1024 * 1024,
         "sha256": "ab12cd34ef56789012345678abcdef01234567890abcdef1234567890abcdef0",
         "arch": "x86_64", "min_ram_gb": 4, "min_disk_gb": 10, "storage_kind": "external",
         "downloads": 3210, "created_at": (now_utc() - timedelta(days=7)).isoformat()},
        {"id": str(uuid.uuid4()), "version": "nightly-2026-02-12", "channel": "nightly", "title": "Nightly 2026-02-12",
         "notes": "Bleeding-edge nightly build. Expect bugs.", "file_url": "https://example.com/aetherxos-nightly.iso",
         "file_name": "aetherxos-nightly.iso", "file_size": 705 * 1024 * 1024,
         "sha256": "deadbeefcafe0123456789abcdef0123456789abcdef0123456789abcdef0123",
         "arch": "x86_64", "min_ram_gb": 4, "min_disk_gb": 12, "storage_kind": "external",
         "downloads": 421, "created_at": (now_utc() - timedelta(hours=8)).isoformat()},
    ]
    await db.releases.insert_many(releases)

    # Seed some analytics events for instant dashboard demo
    import random
    paths = ["/", "/downloads", "/news", "/changelog", "/architecture", "/docs"]
    countries = ["US", "DE", "TR", "IN", "BR", "JP", "GB", "FR", "CA", "NL", "SE", "KR"]
    events = []
    for d in range(30):
        day = now_utc() - timedelta(days=d, hours=random.randint(0, 23))
        for _ in range(random.randint(40, 220)):
            events.append({
                "id": str(uuid.uuid4()),
                "type": "pageview",
                "path": random.choice(paths),
                "ip": f"10.0.{random.randint(0,255)}.{random.randint(1,254)}",
                "country": random.choice(countries),
                "ua": "demo",
                "referrer": random.choice(["https://news.ycombinator.com/", "https://reddit.com/r/programming", "", "https://twitter.com/", "https://github.com/"]),
                "ts": day.isoformat(),
                "meta": {},
            })
        for _ in range(random.randint(2, 30)):
            r = random.choice(releases)
            events.append({
                "id": str(uuid.uuid4()),
                "type": "download",
                "release_id": r["id"],
                "version": r["version"],
                "channel": r["channel"],
                "ip": f"10.0.{random.randint(0,255)}.{random.randint(1,254)}",
                "country": random.choice(countries),
                "ua": "demo",
                "referrer": "",
                "ts": day.isoformat(),
            })
    if events:
        await db.analytics_events.insert_many(events)
    log.info("Seeded initial AetherXOS data.")


app.include_router(api)

app.add_middleware(
    CORSMiddleware,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("shutdown")
async def shutdown():
    client.close()
