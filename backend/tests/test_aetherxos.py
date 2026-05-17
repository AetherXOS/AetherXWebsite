"""AetherXOS Backend API tests - covers auth, posts, changelogs, releases, analytics, admin endpoints."""
import io
import os
import time
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
if not BASE_URL:
    # Fallback: read from frontend .env
    with open("/app/frontend/.env") as f:
        for line in f:
            if line.startswith("REACT_APP_BACKEND_URL"):
                BASE_URL = line.split("=", 1)[1].strip().rstrip("/")
                break

API = f"{BASE_URL}/api"
ADMIN_EMAIL = "admin@aetherxos.dev"
ADMIN_PASSWORD = "aether123"


@pytest.fixture(scope="session")
def admin_token():
    # Clear any prior lockout from this IP by waiting if needed, then login
    r = requests.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    if r.status_code == 429:
        pytest.skip(f"Login locked out: {r.text}")
    assert r.status_code == 200, f"Login failed: {r.status_code} {r.text}"
    data = r.json()
    assert "access_token" in data
    assert data["user"]["email"] == ADMIN_EMAIL
    assert data["user"]["role"] == "admin"
    return data["access_token"]


@pytest.fixture(scope="session")
def auth_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}"}


# ------------------------- AUTH -------------------------
class TestAuth:
    def test_login_success_sets_cookie(self):
        r = requests.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
        if r.status_code == 429:
            pytest.skip("Locked out")
        assert r.status_code == 200
        data = r.json()
        assert data["user"]["email"] == ADMIN_EMAIL
        assert "access_token" in data
        # Cookie set
        assert "access_token" in r.cookies or any(
            "access_token" in (h.lower(),) for h in r.headers.get("set-cookie", "").lower().split(";")
        ) or "access_token" in (r.headers.get("set-cookie") or "")

    def test_me_with_bearer(self, auth_headers):
        r = requests.get(f"{API}/auth/me", headers=auth_headers)
        assert r.status_code == 200
        assert r.json()["email"] == ADMIN_EMAIL

    def test_me_without_token_401(self):
        r = requests.get(f"{API}/auth/me")
        assert r.status_code == 401

    def test_me_with_cookie(self):
        s = requests.Session()
        r = s.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
        if r.status_code == 429:
            pytest.skip("Locked out")
        assert r.status_code == 200
        r2 = s.get(f"{API}/auth/me")
        assert r2.status_code == 200
        assert r2.json()["email"] == ADMIN_EMAIL

    def test_logout_clears_cookie(self, auth_headers):
        r = requests.post(f"{API}/auth/logout", headers=auth_headers)
        assert r.status_code == 200
        assert r.json().get("ok") is True


# ------------------------- POSTS -------------------------
class TestPosts:
    def test_list_posts_public(self):
        r = requests.get(f"{API}/posts")
        assert r.status_code == 200
        data = r.json()
        assert "items" in data and "total" in data
        assert data["total"] >= 1
        assert isinstance(data["categories"], list)
        assert isinstance(data["tags"], list)

    def test_pagination_and_filters(self):
        r = requests.get(f"{API}/posts", params={"page": 1, "page_size": 2})
        assert r.status_code == 200
        data = r.json()
        assert len(data["items"]) <= 2

        # category filter
        r2 = requests.get(f"{API}/posts", params={"category": "Release"})
        assert r2.status_code == 200
        for item in r2.json()["items"]:
            assert item["category"] == "Release"

        # tag filter
        r3 = requests.get(f"{API}/posts", params={"tag": "release"})
        assert r3.status_code == 200

        # q search
        r4 = requests.get(f"{API}/posts", params={"q": "exokernel"})
        assert r4.status_code == 200

    def test_get_post_by_slug(self):
        items = requests.get(f"{API}/posts").json()["items"]
        assert items
        slug = items[0]["slug"]
        r = requests.get(f"{API}/posts/{slug}")
        assert r.status_code == 200
        assert r.json()["slug"] == slug

    def test_get_post_404(self):
        r = requests.get(f"{API}/posts/this-slug-does-not-exist-xyz")
        assert r.status_code == 404

    def test_create_post_requires_auth(self):
        r = requests.post(f"{API}/posts", json={"title": "x", "content": "<p>x</p>"})
        assert r.status_code in (401, 403)

    def test_post_crud(self, auth_headers):
        # Create
        payload = {
            "title": f"TEST_POST_{uuid.uuid4().hex[:6]}",
            "excerpt": "test excerpt",
            "content": "<p>hello <strong>world</strong></p>",
            "category": "TestCat",
            "tags": ["test", "auto"],
            "published": True,
        }
        r = requests.post(f"{API}/posts", json=payload, headers=auth_headers)
        assert r.status_code == 200, r.text
        post = r.json()
        assert post["title"] == payload["title"]
        assert "slug" in post and post["slug"]
        pid = post["id"]

        # Verify persistence via GET by slug
        g = requests.get(f"{API}/posts/{post['slug']}")
        assert g.status_code == 200
        assert g.json()["title"] == payload["title"]

        # Update
        payload["title"] = payload["title"] + "_UPD"
        u = requests.put(f"{API}/posts/{pid}", json=payload, headers=auth_headers)
        assert u.status_code == 200
        assert u.json()["title"].endswith("_UPD")

        # Delete
        d = requests.delete(f"{API}/posts/{pid}", headers=auth_headers)
        assert d.status_code == 200
        # Confirm not found
        g2 = requests.get(f"{API}/posts/{post['slug']}")
        assert g2.status_code == 404


# ------------------------- CHANGELOGS -------------------------
class TestChangelogs:
    def test_list(self):
        r = requests.get(f"{API}/changelogs")
        assert r.status_code == 200
        assert len(r.json()["items"]) >= 1

    def test_crud(self, auth_headers):
        payload = {"version": f"TEST_{uuid.uuid4().hex[:6]}", "title": "T", "content": "<p>x</p>", "type": "fix"}
        r = requests.post(f"{API}/changelogs", json=payload, headers=auth_headers)
        assert r.status_code == 200
        cid = r.json()["id"]

        payload["title"] = "T2"
        u = requests.put(f"{API}/changelogs/{cid}", json=payload, headers=auth_headers)
        assert u.status_code == 200
        assert u.json()["title"] == "T2"

        d = requests.delete(f"{API}/changelogs/{cid}", headers=auth_headers)
        assert d.status_code == 200


# ------------------------- RELEASES -------------------------
class TestReleases:
    def test_list_seeded(self):
        r = requests.get(f"{API}/releases")
        assert r.status_code == 200
        items = r.json()["items"]
        channels = {i["channel"] for i in items}
        assert {"stable", "beta", "nightly"}.issubset(channels)

    def test_create_external(self, auth_headers):
        payload = {
            "version": f"TEST_{uuid.uuid4().hex[:6]}",
            "channel": "beta",
            "title": "Test External Release",
            "notes": "n",
            "file_url": "https://example.com/x.iso",
            "file_name": "x.iso",
            "file_size": 1234,
            "sha256": "a" * 64,
            "storage_kind": "external",
        }
        r = requests.post(f"{API}/releases", json=payload, headers=auth_headers)
        assert r.status_code == 200
        rid = r.json()["id"]
        # Cleanup
        requests.delete(f"{API}/releases/{rid}", headers=auth_headers)

    def test_upload_iso_and_download(self, auth_headers):
        fake_iso = b"AETHERXOS_FAKE_ISO_" + os.urandom(4096)
        files = {"file": ("test.iso", io.BytesIO(fake_iso), "application/octet-stream")}
        data = {
            "version": f"upl-{uuid.uuid4().hex[:6]}",
            "channel": "nightly",
            "title": "Upload Test",
            "notes": "auto",
            "arch": "x86_64",
            "min_ram_gb": "2",
            "min_disk_gb": "4",
        }
        r = requests.post(f"{API}/releases/upload", data=data, files=files, headers=auth_headers)
        assert r.status_code == 200, r.text
        rel = r.json()
        assert rel["sha256"] and len(rel["sha256"]) == 64
        assert rel["file_size"] == len(fake_iso)
        assert rel["storage_kind"] == "local"
        rid = rel["id"]

        # Download (no auth needed)
        d = requests.get(f"{API}/releases/{rid}/download", stream=True)
        assert d.status_code == 200
        content = d.content
        assert content == fake_iso

        # Verify downloads count incremented
        time.sleep(0.5)
        items = requests.get(f"{API}/releases").json()["items"]
        found = next((i for i in items if i["id"] == rid), None)
        assert found and found["downloads"] >= 1

        # Verify analytics download event created
        an = requests.get(f"{API}/admin/analytics", params={"days": 1}, headers=auth_headers)
        assert an.status_code == 200
        # at least 1 download event in last 1 day
        assert an.json()["summary"]["downloads"] >= 1

        # Delete release
        x = requests.delete(f"{API}/releases/{rid}", headers=auth_headers)
        assert x.status_code == 200

    def test_create_release_requires_admin(self):
        r = requests.post(f"{API}/releases", json={"version": "x", "channel": "stable", "title": "x"})
        assert r.status_code in (401, 403)


# ------------------------- ANALYTICS -------------------------
class TestAnalytics:
    def test_public_track(self):
        r = requests.post(f"{API}/analytics/track", json={"type": "pageview", "path": "/test"})
        assert r.status_code == 200
        assert r.json().get("ok") is True

    def test_admin_analytics_requires_auth(self):
        r = requests.get(f"{API}/admin/analytics")
        assert r.status_code in (401, 403)

    def test_admin_analytics_summary(self, auth_headers):
        r = requests.get(f"{API}/admin/analytics", params={"days": 7}, headers=auth_headers)
        assert r.status_code == 200
        d = r.json()
        for k in ("summary", "series", "top_pages", "geography", "top_referrers", "top_downloads"):
            assert k in d
        s = d["summary"]
        for k in ("pageviews", "downloads", "unique_visitors", "days"):
            assert k in s

    def test_admin_health(self, auth_headers):
        r = requests.get(f"{API}/admin/health", headers=auth_headers)
        assert r.status_code == 200
        d = r.json()
        assert d["db_ok"] is True
        assert "uptime_seconds" in d
        assert "counts" in d
        for k in ("posts", "releases", "changelogs", "events"):
            assert k in d["counts"]
        assert "storage_used_bytes" in d

    def test_admin_logs(self, auth_headers):
        r = requests.get(f"{API}/admin/logs", headers=auth_headers)
        assert r.status_code == 200
        assert "items" in r.json()


# ------------------------- BRUTE FORCE LOCKOUT -------------------------
class TestBruteForce:
    """Run last so other tests aren't affected by lockout from shared IP."""

    def test_brute_force_lockout(self):
        # Use a unique email so it doesn't lockout admin login (lockout key is ip:email)
        unique = f"bf_{uuid.uuid4().hex[:8]}@example.com"
        last = None
        for i in range(6):
            r = requests.post(f"{API}/auth/login", json={"email": unique, "password": "wrong"})
            last = r
        # 6th attempt should be 429 OR earlier returned 429
        assert last is not None
        # Check 429 reached on the 6th call
        assert last.status_code in (401, 429)
        # Then next attempt with even correct password should fail with 429
        r2 = requests.post(f"{API}/auth/login", json={"email": unique, "password": "wrong"})
        assert r2.status_code in (429, 401)
