// ─────────────────────────────────────────────────────────────────────────────
// File: src/main.tsx
// ─────────────────────────────────────────────────────────────────────────────
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css"; // your Tailwind entry (v4: `@import "tailwindcss";`)


ReactDOM.createRoot(document.getElementById("root")!).render(
<React.StrictMode>
<App />
</React.StrictMode>
);
