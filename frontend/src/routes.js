import { route, index, layout } from "@react-router/dev/routes";

export default [
  // Catchall API server route for our real backend
  route("api/*", "routes/api/catchall.js"),

  // Public Pages Layout
  layout("components/Layout.jsx", [
    index("pages/Home.jsx"),
    route("downloads", "pages/Downloads.jsx"),
    route("news", "pages/News.jsx"),
    route("news/:slug", "pages/NewsDetail.jsx"),
    route("changelog", "pages/Changelog.jsx"),
    route("architecture", "pages/Architecture.jsx"),
    route("docs", "pages/Docs.jsx"),
    route("security", "pages/Security.jsx"),
  ]),

  // Admin Login
  route("admin/login", "pages/admin/Login.jsx"),

  // Protected Admin Layout (manages auth validation)
  layout("components/ProtectedRoute.jsx", [
    route("admin", "pages/admin/Dashboard.jsx"),
    route("admin/posts", "pages/admin/Posts.jsx"),
    route("admin/changelogs", "pages/admin/Changelogs.jsx"),
    route("admin/docs", "pages/admin/Docs.jsx"),
    route("admin/releases", "pages/admin/Releases.jsx"),
    route("admin/users", "pages/admin/Users.jsx"),
    route("admin/security", "pages/admin/Security.jsx"),
    route("admin/system", "pages/admin/System.jsx"),
    route("admin/announcements", "pages/admin/Announcements.jsx"),
    route("admin/support", "pages/admin/Support.jsx"),
  ]),
];
