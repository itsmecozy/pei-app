import { useT } from "../../context/ThemeContext";
import { THEMES } from "../../hooks/useTheme";
import { useBreakpoint } from "../../hooks/useBreakpoint";

export default function SettingsPage({ themeId, setTheme }) {
  const T = useT();
  const bp = useBreakpoint();

  return (
    <div style={{ paddingBottom:"4rem" }}>
      <style>{`@keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}`}</style>

      {/* Header */}
      <div style={{ padding:"3rem 0 2rem", borderBottom:`1px solid ${T.border}`, marginBottom:"2rem" }}>
        <div style={{ display:"flex", alignItems:"center", gap:"0.5rem",
          fontFamily:"DM Mono", fontSize:"0.52rem", letterSpacing:"0.18em",
          textTransform:"uppercase", color:T.amber, marginBottom:"0.6rem" }}>
          <div style={{ width:20, height:1, background:T.amber }} />
          Settings
        </div>
        <h1 style={{ fontFamily:"'Playfair Display',serif",
          fontSize:"clamp(1.6rem,3.5vw,2.8rem)", fontWeight:900,
          letterSpacing:"-0.025em", lineHeight:1.1 }}>
          Appearance
        </h1>
        <p style={{ fontFamily:"DM Mono", fontSize:"0.6rem",
          color:T.muted, marginTop:"0.5rem" }}>
          Choose how PEI looks to you. Saved automatically.
        </p>
      </div>

      {/* Theme grid */}
      <div style={{ animation:"fadeUp 0.35s both" }}>
        <div style={{ fontFamily:"DM Mono", fontSize:"0.5rem", letterSpacing:"0.14em",
          textTransform:"uppercase", color:T.muted, marginBottom:"1rem" }}>
          Theme
        </div>

        <div style={{ display:"grid",
          gridTemplateColumns: bp==="mobile" ? "1fr 1fr" : "repeat(4,1fr)",
          gap:"1px", background:T.border, border:`1px solid ${T.border}` }}>
          {Object.values(THEMES).map(theme => {
            const isActive = themeId === theme.id;
            return (
              <div key={theme.id} onClick={() => setTheme(theme.id)}
                style={{ background: isActive ? `${T.amber}10` : T.surface,
                  padding:"1.25rem", cursor:"pointer", position:"relative",
                  overflow:"hidden", transition:"background 0.2s" }}
                onMouseEnter={e=>{ if(!isActive) e.currentTarget.style.background=T.surface2; }}
                onMouseLeave={e=>{ if(!isActive) e.currentTarget.style.background=T.surface; }}>

                {/* Active top border */}
                <div style={{ position:"absolute", top:0, left:0, right:0, height:2,
                  background: isActive ? T.amber : "transparent",
                  transition:"background 0.2s" }} />

                {/* Color preview swatches */}
                <div style={{ display:"flex", gap:4, marginBottom:"0.85rem" }}>
                  {theme.preview.map((color, i) => (
                    <div key={i} style={{ width: i===0?28:i===1?20:12,
                      height:28, background:color,
                      border:"1px solid rgba(255,255,255,0.08)" }} />
                  ))}
                </div>

                {/* Selection dot */}
                <div style={{ display:"flex", alignItems:"center",
                  gap:"0.5rem", marginBottom:"0.4rem" }}>
                  <div style={{ width:14, height:14, borderRadius:"50%", flexShrink:0,
                    border:`2px solid ${isActive ? T.amber : T.border}`,
                    background: isActive ? T.amber : "none",
                    transition:"all 0.2s", display:"flex",
                    alignItems:"center", justifyContent:"center" }}>
                    {isActive && (
                      <div style={{ width:5, height:5,
                        borderRadius:"50%", background:"#000" }} />
                    )}
                  </div>
                  <span style={{ fontFamily:"DM Mono", fontSize:"0.58rem",
                    letterSpacing:"0.06em", textTransform:"uppercase",
                    color: isActive ? T.amber : T.text }}>
                    {theme.label}
                  </span>
                </div>

                <p style={{ fontFamily:"DM Mono", fontSize:"0.5rem",
                  color:T.muted, lineHeight:1.6 }}>
                  {theme.desc}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Preview note */}
      <div style={{ marginTop:"1.5rem", padding:"0.75rem 1rem",
        border:`1px solid ${T.border}`, fontFamily:"DM Mono",
        fontSize:"0.54rem", color:T.muted, lineHeight:1.7,
        animation:"fadeUp 0.4s 0.1s both" }}>
        <span style={{ color:T.teal }}>Live preview:</span>{" "}
        Changes apply instantly across all pages. Your preference is saved locally on this device.
      </div>
    </div>
  );
}
