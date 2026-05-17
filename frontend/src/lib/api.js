import axios from "axios";

export const API_BASE = "/api";

export const api = axios.create({
    baseURL: API_BASE,
    withCredentials: true,
});

// Attach Bearer token from localStorage as fallback (in addition to cookie)
api.interceptors.request.use((config) => {
    const token =
        typeof window !== "undefined"
            ? localStorage.getItem("aether_token")
            : null;
    if (token) {
        config.headers = config.headers || {};
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

export function formatApiError(detail) {
    if (detail == null) return "Something went wrong. Please try again.";
    if (typeof detail === "string") return detail;
    if (Array.isArray(detail))
        return detail
            .map((e) =>
                e && typeof e.msg === "string" ? e.msg : JSON.stringify(e),
            )
            .join(" ");
    if (detail && typeof detail.msg === "string") return detail.msg;
    return String(detail);
}

let lastTracked = { type: null, path: null, time: 0 };

export function trackEvent(type, path = "", meta = {}) {
    const now = Date.now();
    if (lastTracked.type === type && lastTracked.path === path && (now - lastTracked.time) < 100) {
        return;
    }
    lastTracked = { type, path, time: now };

    try {
        api.post("/analytics/track", {
            type,
            path,
            referrer: document.referrer || "",
            meta,
        }).catch(() => { });
    } catch (_) { }
}
