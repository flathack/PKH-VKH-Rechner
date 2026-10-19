export const THEME_STORAGE_KEY = "pkh-vkh-theme";
export const THEMES = [
  { value: "classic", label: "Gericht · Hell", color: "#f3f6f5" },
  { value: "paper", label: "Papier · Warm", color: "#f2f0e9" },
  { value: "terminal", label: "Terminal", color: "#0b1014" },
  { value: "amber", label: "Bernstein", color: "#100d09" },
  { value: "ice", label: "Eisblau", color: "#0a1016" },
];

export const THEME_INIT_SCRIPT = `(() => {
  const themes = ${JSON.stringify(THEMES)};
  let theme = "classic";
  try {
    const saved = localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});
    if (themes.some(item => item.value === saved)) theme = saved;
  } catch { /* Darstellung funktioniert auch ohne Browserspeicher. */ }
  document.documentElement.dataset.theme = theme;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.content = themes.find(item => item.value === theme).color;
})();`;
