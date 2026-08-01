import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import legalData from "../app/legal-data.json";
import Home from "../app/page";
import "../app/globals.css";

const root = document.getElementById("root");

if (!root) {
  throw new Error("Root-Element fehlt.");
}

document.title = `PKH · VKH Ratenrechner ${legalData.calculationYear}`;

createRoot(root).render(
  <StrictMode>
    <Home />
  </StrictMode>,
);
