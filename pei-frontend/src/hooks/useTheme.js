import { useState, useEffect } from "react";

export const THEMES = {
  dark: {
    id:      "dark",
    label:   "Dark",
    desc:    "Deep black. Easy on the eyes at night.",
    preview: ["#07090f", "#0c1018", "#f5a623"],
    tokens: {
      bg:       "#07090f",
      surface:  "#0c1018",
      surface2: "#111622",
      border:   "rgba(255,255,255,0.07)",
      text:     "#e6e1d4",
      muted:    "#5a6070",
      amber:    "#f5a623",
      teal:     "#2dd4bf",
      rose:     "#fb7185",
    },
  },
  light: {
    id:      "light",
    label:   "Light",
    desc:    "Clean and bright. For daytime reading.",
    preview: ["#f5f3ef", "#ffffff", "#c47a1a"],
    tokens: {
      bg:       "#f5f3ef",
      surface:  "#ffffff",
      surface2: "#f0ede8",
      border:   "rgba(0,0,0,0.09)",
      text:     "#1a1814",
      muted:    "#8a8070",
      amber:    "#c47a1a",
      teal:     "#0d9488",
      rose:     "#e11d48",
    },
  },
  warm: {
    id:      "warm",
    label:   "Warm",
    desc:    "Earthy and grounded. Like old paper.",
    preview: ["#1a1208", "#241a0a", "#e8933a"],
    tokens: {
      bg:       "#1a1208",
      surface:  "#241a0a",
      surface2: "#2e2010",
      border:   "rgba(255,200,100,0.08)",
      text:     "#f0e6cc",
      muted:    "#7a6040",
      amber:    "#e8933a",
      teal:     "#4db89e",
      rose:     "#e07070",
    },
  },
  midnight: {
    id:      "midnight",
    label:   "Midnight",
    desc:    "Deep navy. Calm and focused.",
    preview: ["#060b18", "#0b1428", "#6b9fff"],
    tokens: {
      bg:       "#060b18",
      surface:  "#0b1428",
      surface2: "#101c36",
      border:   "rgba(100,150,255,0.08)",
      text:     "#d0dff5",
      muted:    "#4a6080",
      amber:    "#6b9fff",
      teal:     "#38bdf8",
      rose:     "#f472b6",
    },
  },
};

const STORAGE_KEY = "pei_theme";

export function useTheme() {
  const [themeId, setThemeId] = useState(() => {
    try { return localStorage.getItem(STORAGE_KEY) || "dark"; }
    catch { return "dark"; }
  });

  const theme = THEMES[themeId] || THEMES.dark;

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, themeId); } catch {}
    // Apply CSS variables to :root
    const root = document.documentElement;
    const t = theme.tokens;
    root.style.setProperty("--bg",       t.bg);
    root.style.setProperty("--surface",  t.surface);
    root.style.setProperty("--surface2", t.surface2);
    root.style.setProperty("--border",   t.border);
    root.style.setProperty("--text",     t.text);
    root.style.setProperty("--muted",    t.muted);
    root.style.setProperty("--amber",    t.amber);
    root.style.setProperty("--teal",     t.teal);
    root.style.setProperty("--rose",     t.rose);
    document.body.style.background = t.bg;
    document.body.style.color = t.text;
  }, [themeId, theme]);

  return { themeId, theme, tokens: theme.tokens, setTheme: setThemeId };
}
