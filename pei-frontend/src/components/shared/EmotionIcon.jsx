/**
 * EmotionIcon — flat SVG icons for each emotion.
 * Uses inline paths (no external library) so bundle stays lean.
 * All icons use strokeLinecap="round" strokeLinejoin="round" for a unified feel.
 * Color defaults to the emotion's canonical hex; pass `color` to override.
 */

const PATHS = {
  // Moon — Longing
  Moon: (
    <path
      d="M21 12.79A9 9 0 1 1 11.21 3a7 7 0 0 0 9.79 9.79z"
      fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    />
  ),
  // Sprout — Hope
  Sprout: (
    <>
      <path d="M7 20h10" fill="none" strokeWidth="2" strokeLinecap="round"/>
      <path d="M12 20V10" fill="none" strokeWidth="2" strokeLinecap="round"/>
      <path d="M12 10C12 10 8 8 6 5c4 0 7 2 6 5z" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M12 10C12 10 16 8 18 5c-4 0-7 2-6 5z" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </>
  ),
  // Flame — Anger
  Flame: (
    <path
      d="M12 2c0 0-5 5-5 10a5 5 0 0 0 10 0c0-3-2-6-2-6s-1 3-3 3c0-3 2-5 0-7z"
      fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    />
  ),
  // Wind — Anxiety
  Wind: (
    <>
      <path d="M9.59 4.59A2 2 0 1 1 11 8H2" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M12.59 19.41A2 2 0 1 0 14 16H2" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M6 12h14a2 2 0 0 1 0 4h-1" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </>
  ),
  // CloudRain — Grief
  CloudRain: (
    <>
      <path d="M20 17.58A5 5 0 0 0 18 8h-1.26A8 8 0 1 0 4 16.25" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <line x1="8" y1="19" x2="8" y2="21" strokeWidth="2" strokeLinecap="round"/>
      <line x1="8" y1="13" x2="8" y2="15" strokeWidth="2" strokeLinecap="round"/>
      <line x1="16" y1="19" x2="16" y2="21" strokeWidth="2" strokeLinecap="round"/>
      <line x1="16" y1="13" x2="16" y2="15" strokeWidth="2" strokeLinecap="round"/>
      <line x1="12" y1="21" x2="12" y2="23" strokeWidth="2" strokeLinecap="round"/>
      <line x1="12" y1="15" x2="12" y2="17" strokeWidth="2" strokeLinecap="round"/>
    </>
  ),
  // Sun — Relief
  Sun: (
    <>
      <circle cx="12" cy="12" r="5" fill="none" strokeWidth="2"/>
      <line x1="12" y1="1" x2="12" y2="3" strokeWidth="2" strokeLinecap="round"/>
      <line x1="12" y1="21" x2="12" y2="23" strokeWidth="2" strokeLinecap="round"/>
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" strokeWidth="2" strokeLinecap="round"/>
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" strokeWidth="2" strokeLinecap="round"/>
      <line x1="1" y1="12" x2="3" y2="12" strokeWidth="2" strokeLinecap="round"/>
      <line x1="21" y1="12" x2="23" y2="12" strokeWidth="2" strokeLinecap="round"/>
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" strokeWidth="2" strokeLinecap="round"/>
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" strokeWidth="2" strokeLinecap="round"/>
    </>
  ),
  // Zap — Determination
  Zap: (
    <polygon
      points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"
      fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    />
  ),
  // Waves — Calm
  Waves: (
    <>
      <path d="M2 6c.6.5 1.2 1 2.5 1C7 7 7 5 9.5 5c2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M2 12c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M2 18c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </>
  ),
  // Leaf — Regret
  Leaf: (
    <path
      d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10z M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"
      fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    />
  ),
};

export default function EmotionIcon({ icon, color = "currentColor", size = 24, style = {} }) {
  const paths = PATHS[icon];
  if (!paths) return null;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      style={{ flexShrink: 0, display: "block", ...style }}
    >
      {paths}
    </svg>
  );
}
