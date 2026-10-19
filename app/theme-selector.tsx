"use client";

import { useSyncExternalStore } from "react";
import { THEMES, THEME_STORAGE_KEY } from "./theme.mjs";

function subscribe(listener: () => void) {
  window.addEventListener("pkh-theme-change", listener);
  return () => window.removeEventListener("pkh-theme-change", listener);
}

export default function ThemeSelector() {
  const theme = useSyncExternalStore(subscribe, () => document.documentElement.dataset.theme ?? "classic", () => "classic");

  const changeTheme = (value: string) => {
    const selected = THEMES.find((item) => item.value === value);
    if (!selected) return;
    document.documentElement.dataset.theme = value;
    const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    if (meta) meta.content = selected.color;
    window.dispatchEvent(new Event("pkh-theme-change"));
    try { localStorage.setItem(THEME_STORAGE_KEY, value); } catch { /* Nur die Darstellung wird gespeichert. */ }
  };

  return (
    <label className="theme-control" htmlFor="theme-select" title="Nur die Darstellungswahl wird gespeichert, keine Berechnungsdaten.">
      <span>Darstellung</span>
      <select id="theme-select" value={theme} onChange={(event) => changeTheme(event.target.value)}>
        {THEMES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
      </select>
    </label>
  );
}
