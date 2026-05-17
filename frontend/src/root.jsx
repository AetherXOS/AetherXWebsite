import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "react-router";
import "./index.css";
import { AuthProvider } from "./context/AuthContext";
import { Toaster } from "./components/ui/sonner";

export const links = () => [
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
  { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700;800&family=IBM+Plex+Sans:wght@400;500;600;700&display=swap" },
];

export const meta = () => [
  { title: "AetherXOS — Exokernel + Library OS" },
  { name: "description", content: "AetherXOS — Next-generation Exokernel + Library OS. Bare-metal performance, memory safety, extreme modularity." },
  { name: "theme-color", content: "#000000" }
];

export function Layout({ children }) {
  return (
    <html lang="en" className="dark">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
        <script dangerouslySetInnerHTML={{
          __html: `window.addEventListener("error",function(e){if(e.error instanceof DOMException&&e.error.name==="DataCloneError"&&e.message&&e.message.includes("PerformanceServerTiming")){e.stopImmediatePropagation();e.preventDefault()}},true);`
        }} />
        <script src="https://assets.emergent.sh/scripts/emergent-main.js"></script>
      </head>
      <body className="bg-black text-white antialiased">
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Outlet />
      <Toaster theme="dark" />
    </AuthProvider>
  );
}
