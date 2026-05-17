import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API_BASE = `${BACKEND_URL}/api`;

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

export function trackEvent(type, path = "", meta = {}) {
    try {
        api.post("/analytics/track", {
            type,
            path,
            referrer: document.referrer || "",
            meta,
        }).catch(() => {});
    } catch (_) {}
}
