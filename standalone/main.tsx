import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import Home from "../app/page";
import "../app/design/flathack/tokens.css";
import "../app/design/flathack/base.css";
import "../app/globals.css";
import { SEO_TITLE } from "../app/seo-metadata";

const root = document.getElementById("root");

if (!root) {
  throw new Error("Root-Element fehlt.");
}

document.title = SEO_TITLE;

createRoot(root).render(
  <StrictMode>
    <Home />
  </StrictMode>,
);
