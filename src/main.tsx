// ─────────────────────────────────────────────────────────────────────────────
// File: src/main.tsx
// ─────────────────────────────────────────────────────────────────────────────
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css"; // your Tailwind entry (v4: `@import "tailwindcss";`)
// Bundled serif for the writing surface — JS import so Vite emits the woff2
// files and rewrites their urls (a CSS @import leaves them unresolved in prod)
import "@fontsource-variable/lora/index.css";


ReactDOM.createRoot(document.getElementById("root")!).render(
<React.StrictMode>
<App />
</React.StrictMode>
);
