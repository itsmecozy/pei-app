import { useState, useEffect } from "react";
import { T } from "../../../constants/tokens";
import { useInView } from "../../../hooks/useInView";

export function Skeleton({ width = "100%", height = 16, style = {} }) {
  return (
    <div style={{ width, height, background:"rgba(255,255,255,0.06)", borderRadius:2,
      animation:"skeletonPulse 1.5s ease-in-out infinite", ...style }} />
  );
}

export function DataBadge({ live }) {
  return (
    <div style={{ display:"inline-flex", alignItems:"center", gap:"0.3rem",
      fontFamily:"DM Mono", fontSize:"0.48rem", letterSpacing:"0.1em",
      color: live ? "#10b981" : T.muted,
      border: `1px solid ${live ? "#10b98130" : T.border}`,
      padding:"0.15rem 0.4rem" }}>
      <span style={{ width:5, height:5, borderRadius:"50%",
        background: live ? "#10b981" : T.muted,
        animation: live ? "liveP 2s infinite" : "none",
        display:"inline-block" }} />
      {live ? "LIVE" : "NO DATA"}
    </div>
  );
}

export function EmptyState({ icon = "◌", title, body, cta, onCta }) {
  return (
    <div style={{ padding:"2.5rem 1.5rem", textAlign:"center", border:`1px dashed ${T.border}` }}>
      <div style={{ fontFamily:"'Playfair Display',serif", fontSize:"2rem",
        color:"rgba(255,255,255,0.08)", marginBottom:"0.75rem" }}>{icon}</div>
      <div style={{ fontFamily:"'Playfair Display',serif", fontSize:"1rem",
        fontWeight:700, marginBottom:"0.4rem" }}>{title}</div>
      <p style={{ fontFamily:"DM Mono", fontSize:"0.58rem", color:T.muted,
        lineHeight:1.7, maxWidth:320, margin:"0 auto 1rem" }}>{body}</p>
      {cta && (
        <button onClick={onCta} style={{ background:"none", border:`1px solid ${T.amber}40`,
          color:T.amber, padding:"0.4rem 0.85rem", fontFamily:"DM Mono", fontSize:"0.56rem",
          letterSpacing:"0.08em", textTransform:"uppercase", cursor:"pointer" }}>
          {cta}
        </button>
      )}
    </div>
  );
}

export function PageHeader({ label, title, subtitle, live }) {
  const [ref, inView] = useInView(0.1);
  return (
    <div ref={ref} style={{ padding:"3rem 0 2rem", borderBottom:`1px solid ${T.border}`, marginBottom:"2.5rem" }}>
      <div style={{ display:"flex", alignItems:"center", gap:"0.5rem",
        fontFamily:"DM Mono", fontSize:"0.56rem", letterSpacing:"0.18em",
        textTransform:"uppercase", color:T.amber, marginBottom:"0.75rem",
        opacity:inView?1:0, transform:inView?"none":"translateY(8px)", transition:"all 0.5s" }}>
        <div style={{ width:20, height:1, background:T.amber }} />
        {label}
        {live !== undefined && <DataBadge live={live} />}
      </div>
      <h1 style={{ fontFamily:"'Playfair Display',serif",
        fontSize:"clamp(1.8rem,4vw,3.2rem)", fontWeight:900,
        letterSpacing:"-0.025em", lineHeight:1.1, marginBottom:"0.6rem",
        opacity:inView?1:0, transform:inView?"none":"translateY(12px)", transition:"all 0.5s 0.1s" }}>
        {title}
      </h1>
      {subtitle && (
        <p style={{ fontFamily:"DM Mono", fontSize:"0.66rem", color:T.muted,
          lineHeight:1.7, maxWidth:560,
          opacity:inView?1:0, transform:inView?"none":"translateY(8px)", transition:"all 0.5s 0.2s" }}>
          {subtitle}
        </p>
      )}
    </div>
  );
}

export function EmotionBar({ name, pct, hex, inView, delay = 0 }) {
  const [w, setW] = useState(0);
  useEffect(() => {
    setW(0);
    if (!inView) return;
    const t = setTimeout(() => {
      const start = Date.now();
      const tick = () => {
        const p = Math.min((Date.now() - start) / 900, 1);
        setW((1 - Math.pow(1 - p, 3)) * pct);
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }, delay);
    return () => clearTimeout(t);
  }, [inView, pct, delay]);

  return (
    <div style={{ display:"grid", gridTemplateColumns:"100px 1fr 38px", alignItems:"center", gap:"0.5rem" }}>
      <span style={{ fontFamily:"DM Mono", fontSize:"0.54rem", letterSpacing:"0.05em",
        color:T.muted, textTransform:"capitalize", overflow:"hidden",
        textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{name}</span>
      <div style={{ height:3, background:"rgba(255,255,255,0.05)", position:"relative" }}>
        <div style={{ position:"absolute", inset:0, width:`${w}%`, background:hex, transition:"none" }} />
      </div>
      <span style={{ fontFamily:"DM Mono", fontSize:"0.58rem", textAlign:"right",
        color:hex, fontVariantNumeric:"tabular-nums" }}>{Math.round(w)}%</span>
    </div>
  );
}

export function ScoreCard({ label, value, desc, color, fill, loading }) {
  return (
    <div style={{ background:T.surface, border:`1px solid ${T.border}`,
      padding:"0.9rem 1rem", position:"relative", overflow:"hidden" }}>
      <div style={{ position:"absolute", bottom:0, left:0, height:2,
        width:`${fill || 0}%`, background:color,
        transition:"width 1.2s cubic-bezier(.4,0,.2,1)" }} />
      <div style={{ fontFamily:"DM Mono", fontSize:"0.52rem", letterSpacing:"0.12em",
        textTransform:"uppercase", color:T.muted, marginBottom:"0.35rem" }}>{label}</div>
      {loading
        ? <Skeleton height={28} width={60} style={{ marginBottom:4 }} />
        : <div style={{ fontFamily:"'Playfair Display',serif", fontSize:"1.3rem",
            fontWeight:700, color, lineHeight:1 }}>{value ?? "—"}</div>
      }
      <div style={{ fontFamily:"DM Mono", fontSize:"0.52rem", color:T.muted, marginTop:"0.2rem" }}>{desc}</div>
    </div>
  );
}
