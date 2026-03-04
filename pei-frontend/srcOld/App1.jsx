import { useState, useEffect, useRef, useCallback } from "react";
import { supabase, submitEmotion, searchLGUs, getNational, getLGUAggregations, getLGUData } from "./lib/supabase";

// ─── DESIGN TOKENS ────────────────────────────────────────────────────────────
const T = {
  bg:       "#07090f",
  surface:  "#0c1018",
  surface2: "#111622",
  border:   "rgba(255,255,255,0.07)",
  text:     "#e6e1d4",
  muted:    "#5a6070",
  amber:    "#f5a623",
  teal:     "#2dd4bf",
  rose:     "#fb7185",
};

// ─── EMOTIONS ─────────────────────────────────────────────────────────────────
const EMOTIONS = [
  { name:"Longing",       emoji:"🌙", hex:"#6366f1", key:"longing"       },
  { name:"Hope",          emoji:"🌱", hex:"#2dd4bf", key:"hope"          },
  { name:"Anger",         emoji:"🔥", hex:"#ef4444", key:"anger"         },
  { name:"Anxiety",       emoji:"🌀", hex:"#f59e0b", key:"anxiety"       },
  { name:"Grief",         emoji:"🌧",  hex:"#8b5cf6", key:"grief"         },
  { name:"Relief",        emoji:"☀️", hex:"#10b981", key:"relief"        },
  { name:"Determination", emoji:"⚡", hex:"#3b82f6", key:"determination" },
  { name:"Regret",        emoji:"🍂", hex:"#ec4899", key:"regret"        },
];

const EMOTION_MAP = Object.fromEntries(EMOTIONS.map(e => [e.key, e]));

// ─── HASH ROUTER ──────────────────────────────────────────────────────────────
function useHashRouter() {
  const [page, setPage] = useState(() => window.location.hash.replace("#/", "") || "home");
  const navigate = useCallback((p) => {
    window.location.hash = `#/${p}`;
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);
  useEffect(() => {
    const onHash = () => {
      setPage(window.location.hash.replace("#/", "") || "home");
      window.scrollTo({ top: 0 });
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);
  return { page, navigate };
}

// ─── BREAKPOINT ───────────────────────────────────────────────────────────────
function useBreakpoint() {
  const [bp, setBp] = useState(() => {
    const w = window.innerWidth;
    return w < 640 ? "mobile" : w < 1024 ? "tablet" : "desktop";
  });
  useEffect(() => {
    const update = () => {
      const w = window.innerWidth;
      setBp(w < 640 ? "mobile" : w < 1024 ? "tablet" : "desktop");
    };
    window.addEventListener("resize", update, { passive: true });
    return () => window.removeEventListener("resize", update);
  }, []);
  return bp;
}

function useInView(threshold = 0.1) {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    setInView(false);
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setInView(true); obs.disconnect(); } },
      { threshold }
    );
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [threshold]);
  return [ref, inView];
}

// ─── SHARED UI ────────────────────────────────────────────────────────────────
function GrainOverlay() {
  return <div style={{ position:"fixed", inset:0, pointerEvents:"none", zIndex:9999,
    backgroundImage:`url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.045'/%3E%3C/svg%3E")`,
    opacity:0.35 }} />;
}

function Skeleton({ width = "100%", height = 16, style = {} }) {
  return (
    <div style={{ width, height, background:"rgba(255,255,255,0.06)", borderRadius:2,
      animation:"skeletonPulse 1.5s ease-in-out infinite", ...style }} />
  );
}

function DataBadge({ live }) {
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

function EmptyState({ icon = "◌", title, body, cta, onCta }) {
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

function PageHeader({ label, title, subtitle, live }) {
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

function EmotionBar({ name, pct, hex, inView, delay = 0 }) {
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

function ScoreCard({ label, value, desc, color, fill, loading }) {
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

// ─── NAVIGATION ───────────────────────────────────────────────────────────────
function Navigation({ navigate, currentPage, openModal }) {
  const bp = useBreakpoint();
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", h, { passive: true });
    return () => window.removeEventListener("scroll", h);
  }, []);

  const navItems = [
    { id:"dashboard", label:"Dashboard" },
    { id:"map",       label:"Map" },
    { id:"trends",    label:"Trends" },
    { id:"seasonal",  label:"Seasonal" },
    { id:"ethics",    label:"Ethics" },
    { id:"methodology", label:"Methodology" },
  ];

  return (
    <>
      <nav style={{
        position:"fixed", top:0, left:0, right:0, zIndex:200,
        background: scrolled ? "rgba(7,9,15,0.97)" : "rgba(7,9,15,0.6)",
        backdropFilter:"blur(20px)",
        borderBottom:`1px solid ${scrolled ? T.border : "transparent"}`,
        transition:"all 0.3s"
      }}>
        <div style={{ display:"flex", alignItems:"center", height:60, padding:"0 1.25rem", gap:"0.75rem" }}>
          <div style={{ display:"flex", alignItems:"center", gap:"0.5rem", flexShrink:0 }}>
            <span style={{ fontFamily:"'Playfair Display',serif", fontSize:"1.3rem",
              fontWeight:900, color:T.amber, cursor:"pointer", letterSpacing:"-0.02em" }}
              onClick={() => navigate("home")}>PEI</span>
            {bp !== "mobile" && (
              <span style={{ fontFamily:"DM Mono", fontSize:"0.52rem", color:T.muted,
                letterSpacing:"0.12em", textTransform:"uppercase" }}>
                Philippines Emotional Index
              </span>
            )}
            <div style={{ display:"flex", alignItems:"center", gap:"0.25rem" }}>
              <span style={{ width:5, height:5, borderRadius:"50%", background:"#10b981",
                animation:"liveP 2s infinite", display:"inline-block" }} />
              {bp === "desktop" && (
                <span style={{ fontFamily:"DM Mono", fontSize:"0.48rem",
                  color:"#10b981", letterSpacing:"0.1em" }}>LIVE</span>
              )}
            </div>
          </div>

          <div style={{ display:"flex", alignItems:"center", gap:"0.1rem",
            flex:1, overflowX:"auto", msOverflowStyle:"none", scrollbarWidth:"none" }}>
            {navItems.map(n => {
              const isActive = currentPage === n.id;
              return (
                <button key={n.id} onClick={() => navigate(n.id)} style={{
                  flexShrink:0,
                  background: isActive ? `${T.amber}12` : "none",
                  border: `1px solid ${isActive ? T.amber+"50" : "transparent"}`,
                  fontFamily:"DM Mono",
                  fontSize: bp === "mobile" ? "0.52rem" : "0.58rem",
                  letterSpacing:"0.08em", textTransform:"uppercase",
                  color: isActive ? T.amber : T.muted,
                  cursor:"pointer",
                  padding: bp === "mobile" ? "0.3rem 0.5rem" : "0.32rem 0.7rem",
                  transition:"all 0.2s", whiteSpace:"nowrap", position:"relative",
                }}
                  onMouseEnter={e=>{ if(!isActive) e.currentTarget.style.color=T.text; }}
                  onMouseLeave={e=>{ if(!isActive) e.currentTarget.style.color=T.muted; }}>
                  {n.label}
                  {isActive && (
                    <span style={{ position:"absolute", bottom:-1, left:"50%",
                      transform:"translateX(-50%)", width:"60%", height:1, background:T.amber }} />
                  )}
                </button>
              );
            })}
          </div>

          <button onClick={openModal} style={{
            flexShrink:0, background:T.amber, color:"#000", border:"none",
            padding: bp === "mobile" ? "0.32rem 0.6rem" : "0.38rem 0.9rem",
            fontFamily:"DM Mono",
            fontSize: bp === "mobile" ? "0.54rem" : "0.58rem",
            fontWeight:500, letterSpacing:"0.08em", textTransform:"uppercase",
            cursor:"pointer", transition:"all 0.2s"
          }}
            onMouseEnter={e=>e.currentTarget.style.background="#fff"}
            onMouseLeave={e=>e.currentTarget.style.background=T.amber}>
            {bp === "mobile" ? "+" : "Submit Feeling"}
          </button>
        </div>
      </nav>
      <style>{`
        @keyframes liveP{0%,100%{opacity:1}50%{opacity:0.3}}
        @keyframes skeletonPulse{0%,100%{opacity:0.4}50%{opacity:0.8}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
        nav div::-webkit-scrollbar{display:none}
      `}</style>
    </>
  );
}

// ─── SUBMISSION MODAL ─────────────────────────────────────────────────────────
function SubmissionModal({ open, onClose }) {
  const [step, setStep]         = useState(1);
  const [query, setQuery]       = useState("");
  const [lguResults, setLguResults] = useState([]);
  const [selectedLgu, setSelectedLgu] = useState(null);
  const [searching, setSearching]   = useState(false);
  const [emotion, setEmotion]   = useState(null);
  const [intensity, setIntensity] = useState(3);
  const [text, setText]         = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone]         = useState(false);
  const [error, setError]       = useState(null);
  const bp = useBreakpoint();

  const reset = () => {
    setStep(1); setQuery(""); setLguResults([]); setSelectedLgu(null);
    setEmotion(null); setIntensity(3); setText(""); setDone(false); setError(null);
  };
  const handleClose = () => { onClose(); setTimeout(reset, 400); };

  // LGU search
  useEffect(() => {
    if (query.length < 2) { setLguResults([]); return; }
    const t = setTimeout(async () => {
      setSearching(true);
      try { setLguResults(await searchLGUs(query)); }
      catch { setLguResults([]); }
      finally { setSearching(false); }
    }, 300);
    return () => clearTimeout(t);
  }, [query]);

  const handleSubmit = async () => {
    if (!selectedLgu || !emotion) return;
    setSubmitting(true); setError(null);
    try {
      await submitEmotion({ lgu_id: selectedLgu.id, emotion, intensity, text: text.trim() || null });
      setDone(true);
    } catch(e) {
      setError(e.message || "Submission failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div style={{ position:"fixed", inset:0, zIndex:500,
      background:"rgba(7,9,15,0.92)", backdropFilter:"blur(12px)",
      display:"flex", alignItems:"center", justifyContent:"center", padding:"1rem" }}
      onClick={e => { if (e.target === e.currentTarget) handleClose(); }}>
      <div style={{ background:T.surface, border:`1px solid ${T.border}`,
        width:"100%", maxWidth:480, maxHeight:"90vh", overflowY:"auto",
        position:"relative" }}>
        {/* Header */}
        <div style={{ padding:"1.25rem 1.5rem", borderBottom:`1px solid ${T.border}`,
          display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div>
            <div style={{ fontFamily:"'Playfair Display',serif", fontSize:"1.1rem",
              fontWeight:700 }}>Share Your Feeling</div>
            <div style={{ fontFamily:"DM Mono", fontSize:"0.52rem", color:T.muted,
              marginTop:"0.2rem" }}>Anonymous · Voluntary · Aggregated only</div>
          </div>
          <button onClick={handleClose}
            style={{ background:"none", border:`1px solid ${T.border}`, color:T.muted,
              width:28, height:28, cursor:"pointer", fontSize:"0.9rem", fontFamily:"DM Mono",
              display:"flex", alignItems:"center", justifyContent:"center" }}>×</button>
        </div>

        {/* Body */}
        <div style={{ padding:"1.25rem 1.5rem" }}>
          {done ? (
            <div style={{ textAlign:"center", padding:"2rem 0" }}>
              <div style={{ fontFamily:"'Playfair Display',serif", fontSize:"2.5rem",
                color:T.teal, marginBottom:"0.75rem" }}>✓</div>
              <div style={{ fontFamily:"'Playfair Display',serif", fontSize:"1.2rem",
                fontWeight:700, marginBottom:"0.4rem" }}>Feeling Recorded</div>
              <div style={{ fontFamily:"DM Mono", fontSize:"0.58rem", color:T.muted,
                lineHeight:1.7, maxWidth:300, margin:"0 auto 1.5rem" }}>
                Your anonymous signal has been added to the index. No trace of you remains.
              </div>
              <button onClick={handleClose}
                style={{ background:T.amber, color:"#000", border:"none",
                  padding:"0.5rem 1.25rem", fontFamily:"DM Mono", fontSize:"0.58rem",
                  fontWeight:500, letterSpacing:"0.08em", textTransform:"uppercase",
                  cursor:"pointer" }}>
                Close
              </button>
            </div>
          ) : (
            <>
              {/* Step 1 — Location */}
              {step === 1 && (
                <div>
                  <label style={{ fontFamily:"DM Mono", fontSize:"0.58rem",
                    letterSpacing:"0.12em", textTransform:"uppercase",
                    color:T.muted, display:"block", marginBottom:"0.5rem" }}>
                    Your City or Municipality
                  </label>
                  <input value={query} onChange={e=>setQuery(e.target.value)}
                    placeholder="Search city or municipality..."
                    style={{ width:"100%", background:T.bg, border:`1px solid ${T.border}`,
                      color:T.text, padding:"0.6rem 0.75rem", fontFamily:"DM Mono",
                      fontSize:"0.7rem", outline:"none", boxSizing:"border-box" }}
                    onFocus={e=>e.target.style.borderColor=T.amber}
                    onBlur={e=>e.target.style.borderColor=T.border} />

                  {searching && (
                    <div style={{ padding:"0.6rem 0.75rem", fontFamily:"DM Mono",
                      fontSize:"0.56rem", color:T.muted }}>Searching…</div>
                  )}

                  {lguResults.length > 0 && (
                    <div style={{ border:`1px solid ${T.border}`, borderTop:"none",
                      maxHeight:200, overflowY:"auto" }}>
                      {lguResults.map(lgu => (
                        <div key={lgu.id} onClick={() => { setSelectedLgu(lgu); setLguResults([]); setQuery(""); }}
                          style={{ padding:"0.55rem 0.75rem", cursor:"pointer",
                            background:selectedLgu?.id===lgu.id?T.surface2:"none",
                            borderBottom:`1px solid ${T.border}`, transition:"background 0.15s" }}
                          onMouseEnter={e=>e.currentTarget.style.background=T.surface2}
                          onMouseLeave={e=>e.currentTarget.style.background=selectedLgu?.id===lgu.id?T.surface2:"none"}>
                          <div style={{ fontFamily:"DM Mono", fontSize:"0.62rem", color:T.text }}>
                            {lgu.name}
                          </div>
                          <div style={{ fontFamily:"DM Mono", fontSize:"0.5rem", color:T.muted, marginTop:"0.15rem" }}>
                            {lgu.lgu_type === "city" ? "City" : "Municipality"} · {lgu.province} · {lgu.region}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {selectedLgu && (
                    <div style={{ background:`${T.amber}08`, border:`1px solid ${T.amber}20`,
                      padding:"0.6rem 0.7rem", fontFamily:"DM Mono", fontSize:"0.56rem",
                      color:T.muted, display:"flex", alignItems:"center", gap:"0.4rem" }}>
                      <span style={{ color:T.amber }}>✓</span>
                      {selectedLgu.name}, {selectedLgu.province}
                    </div>
                  )}

                  <div style={{ marginTop:"0.75rem", background:`${T.teal}08`,
                    border:`1px solid ${T.teal}15`, padding:"0.6rem 0.7rem",
                    fontFamily:"DM Mono", fontSize:"0.54rem", color:T.muted }}>
                    <span style={{ color:T.teal }}>Fully anonymous.</span> No IP. No device ID. No tracking.
                  </div>
                </div>
              )}

              {/* Step 2 — Emotion */}
              {step === 2 && (
                <div>
                  <label style={{ fontFamily:"DM Mono", fontSize:"0.58rem",
                    letterSpacing:"0.12em", textTransform:"uppercase",
                    color:T.muted, display:"block", marginBottom:"0.65rem" }}>
                    What are you feeling?
                  </label>
                  <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)",
                    gap:"0.35rem", marginBottom:"1.1rem" }}>
                    {EMOTIONS.map(em => (
                      <div key={em.name} onClick={() => setEmotion(em.key)}
                        style={{ border:`1px solid ${emotion===em.key?em.hex:T.border}`,
                          background:emotion===em.key?`${em.hex}12`:T.bg,
                          padding:"0.6rem 0.35rem", cursor:"pointer",
                          textAlign:"center", transition:"all 0.2s" }}>
                        <div style={{ fontSize:"1.3rem", marginBottom:"0.2rem" }}>{em.emoji}</div>
                        <div style={{ fontFamily:"DM Mono", fontSize:"0.46rem",
                          color:emotion===em.key?em.hex:T.muted,
                          letterSpacing:"0.06em", textTransform:"uppercase" }}>{em.name}</div>
                      </div>
                    ))}
                  </div>

                  <label style={{ fontFamily:"DM Mono", fontSize:"0.58rem",
                    letterSpacing:"0.12em", textTransform:"uppercase",
                    color:T.muted, display:"block", marginBottom:"0.6rem" }}>
                    Intensity
                  </label>
                  <div style={{ position:"relative", height:36, display:"flex",
                    alignItems:"center", marginBottom:"0.4rem" }}>
                    <div style={{ position:"absolute", width:"100%", height:3,
                      background:"rgba(255,255,255,0.07)", borderRadius:2 }} />
                    <div style={{ position:"absolute", height:3, borderRadius:2,
                      background:`linear-gradient(to right,${T.teal},${T.amber})`,
                      width:`${((intensity-1)/4)*100}%`, transition:"width 0.2s" }} />
                    {[1,2,3,4,5].map(n => (
                      <button key={n} onClick={()=>setIntensity(n)}
                        style={{ position:"absolute", left:`${((n-1)/4)*100}%`,
                          transform:"translateX(-50%)", width:18, height:18,
                          borderRadius:"50%",
                          border:`2px solid ${n<=intensity?T.amber:T.border}`,
                          background:n<=intensity?T.amber:T.bg,
                          cursor:"pointer", transition:"all 0.2s" }} />
                    ))}
                  </div>
                  <div style={{ display:"flex", justifyContent:"space-between",
                    fontFamily:"DM Mono", fontSize:"0.5rem", color:T.muted }}>
                    {["Subtle","Mild","Moderate","Strong","Intense"].map(l=><span key={l}>{l}</span>)}
                  </div>
                </div>
              )}

              {/* Step 3 — Optional text */}
              {step === 3 && (
                <div>
                  <label style={{ fontFamily:"DM Mono", fontSize:"0.58rem",
                    letterSpacing:"0.12em", textTransform:"uppercase",
                    color:T.muted, display:"block", marginBottom:"0.5rem" }}>
                    Optional — A few words (max 150)
                  </label>
                  <textarea value={text} onChange={e=>setText(e.target.value.slice(0,150))}
                    placeholder="What's making you feel this way?"
                    style={{ width:"100%", background:T.bg, border:`1px solid ${T.border}`,
                      color:T.text, padding:"0.7rem 0.9rem", fontFamily:"DM Mono",
                      fontSize:"0.7rem", outline:"none", resize:"none",
                      height:100, lineHeight:1.6, boxSizing:"border-box" }}
                    onFocus={e=>e.target.style.borderColor=T.amber}
                    onBlur={e=>e.target.style.borderColor=T.border} />
                  <div style={{ textAlign:"right", fontFamily:"DM Mono", fontSize:"0.5rem",
                    color:150-text.length<30?T.rose:T.muted, marginTop:"0.2rem" }}>
                    {150-text.length}
                  </div>
                  <div style={{ fontFamily:"DM Mono", fontSize:"0.52rem", color:T.muted,
                    lineHeight:1.6, marginTop:"0.5rem", padding:"0.5rem 0.6rem",
                    border:`1px solid ${T.border}` }}>
                    Your words are processed for emotional signal only. Raw text is never stored.
                  </div>
                </div>
              )}

              {error && (
                <div style={{ marginTop:"0.75rem", padding:"0.6rem 0.7rem",
                  background:`${T.rose}10`, border:`1px solid ${T.rose}30`,
                  fontFamily:"DM Mono", fontSize:"0.56rem", color:T.rose }}>
                  {error}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {!done && (
          <div style={{ padding:"0.9rem 1.5rem", borderTop:`1px solid ${T.border}`,
            display:"flex", alignItems:"center", justifyContent:"space-between" }}>
            <div style={{ display:"flex", gap:"0.3rem" }}>
              {[1,2,3].map(n=>(
                <div key={n} style={{ width:16, height:2,
                  background:n<=step?T.amber:T.border, transition:"background 0.3s" }} />
              ))}
            </div>
            <div style={{ display:"flex", gap:"0.45rem" }}>
              {step > 1 && (
                <button onClick={()=>setStep(s=>s-1)}
                  style={{ background:"none", border:`1px solid ${T.border}`,
                    color:T.muted, padding:"0.5rem 0.9rem", fontFamily:"DM Mono",
                    fontSize:"0.58rem", letterSpacing:"0.08em", textTransform:"uppercase",
                    cursor:"pointer" }}>
                  Back
                </button>
              )}
              <button
                onClick={() => {
                  if (step === 1 && !selectedLgu) return;
                  if (step === 2 && !emotion) return;
                  if (step < 3) setStep(s => s + 1);
                  else handleSubmit();
                }}
                disabled={submitting || (step===1&&!selectedLgu) || (step===2&&!emotion)}
                style={{ background:T.amber, color:"#000", border:"none",
                  padding:"0.5rem 1rem", fontFamily:"DM Mono", fontSize:"0.58rem",
                  fontWeight:500, letterSpacing:"0.08em", textTransform:"uppercase",
                  cursor:"pointer", transition:"all 0.2s",
                  opacity:submitting||(step===1&&!selectedLgu)||(step===2&&!emotion)?0.45:1 }}
                onMouseEnter={e=>{ if(!submitting) e.currentTarget.style.background="#fff"; }}
                onMouseLeave={e=>{ e.currentTarget.style.background=T.amber; }}>
                {submitting ? "Submitting…" : step < 3 ? "Continue →" : "Submit Feeling →"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── HOME PAGE ────────────────────────────────────────────────────────────────
function HomePage({ navigate, openModal }) {
  const bp = useBreakpoint();
  const [ref, inView] = useInView(0.05);
  const [national, setNational] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getNational().then(d => { setNational(d); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const dominant = national?.dominant ? EMOTION_MAP[national.dominant] : null;

  return (
    <div ref={ref}>
      {/* Hero */}
      <div style={{ padding:bp==="mobile"?"4rem 1.25rem 3rem":"5rem 0 4rem",
        borderBottom:`1px solid ${T.border}` }}>
        <div style={{ fontFamily:"DM Mono", fontSize:"0.56rem", letterSpacing:"0.2em",
          textTransform:"uppercase", color:T.amber, marginBottom:"1rem",
          display:"flex", alignItems:"center", gap:"0.5rem",
          opacity:inView?1:0, transform:inView?"none":"translateY(8px)", transition:"all 0.5s" }}>
          <div style={{ width:20, height:1, background:T.amber }} />
          Philippines Emotional Index · Real-time
        </div>

        <h1 style={{ fontFamily:"'Playfair Display',serif",
          fontSize:"clamp(2.5rem,7vw,5.5rem)", fontWeight:900,
          letterSpacing:"-0.035em", lineHeight:0.95,
          marginBottom:"1.5rem", maxWidth:700,
          opacity:inView?1:0, transform:inView?"none":"translateY(16px)", transition:"all 0.6s 0.1s" }}>
          How does the nation feel <span style={{ fontStyle:"italic", color:T.amber }}>right now?</span>
        </h1>

        <p style={{ fontFamily:"DM Mono", fontSize:"0.7rem", color:T.muted,
          lineHeight:1.8, maxWidth:520, marginBottom:"2rem",
          opacity:inView?1:0, transform:inView?"none":"translateY(8px)", transition:"all 0.5s 0.2s" }}>
          PEI aggregates anonymous emotional signals across every city and municipality in the Philippines.
          No accounts. No tracking. Pure collective mood.
        </p>

        <div style={{ display:"flex", gap:"0.75rem", flexWrap:"wrap",
          opacity:inView?1:0, transform:inView?"none":"translateY(8px)", transition:"all 0.5s 0.3s" }}>
          <button onClick={openModal} style={{ background:T.amber, color:"#000", border:"none",
            padding:"0.65rem 1.4rem", fontFamily:"DM Mono", fontSize:"0.62rem",
            fontWeight:500, letterSpacing:"0.1em", textTransform:"uppercase",
            cursor:"pointer", transition:"all 0.2s" }}
            onMouseEnter={e=>e.currentTarget.style.background="#fff"}
            onMouseLeave={e=>e.currentTarget.style.background=T.amber}>
            Submit Your Feeling →
          </button>
          <button onClick={() => navigate("dashboard")}
            style={{ background:"none", border:`1px solid ${T.border}`,
              color:T.muted, padding:"0.65rem 1.4rem", fontFamily:"DM Mono",
              fontSize:"0.62rem", letterSpacing:"0.1em", textTransform:"uppercase",
              cursor:"pointer", transition:"all 0.2s" }}
            onMouseEnter={e=>{ e.currentTarget.style.borderColor=T.text; e.currentTarget.style.color=T.text; }}
            onMouseLeave={e=>{ e.currentTarget.style.borderColor=T.border; e.currentTarget.style.color=T.muted; }}>
            View Dashboard
          </button>
        </div>
      </div>

      {/* Stats strip */}
      <div style={{ display:"grid",
        gridTemplateColumns:bp==="mobile"?"1fr 1fr":"repeat(4,1fr)",
        gap:1, background:T.border, border:`1px solid ${T.border}`,
        margin:"2.5rem 0" }}>
        {[
          { label:"Dominant Emotion", value: loading ? null : (dominant?.name ?? "—"), color: dominant?.hex ?? T.amber },
          { label:"Total Submissions", value: loading ? null : (national?.total ?? "—"), color: T.teal },
          { label:"Cities Represented", value: loading ? null : (national?.cities ?? "—"), color: T.amber },
          { label:"Provinces Active", value: loading ? null : (national?.provinces ?? "—"), color: T.rose },
        ].map((s, i) => (
          <div key={i} style={{ background:T.bg, padding:"1.25rem 1rem" }}>
            <div style={{ fontFamily:"DM Mono", fontSize:"0.5rem", letterSpacing:"0.12em",
              textTransform:"uppercase", color:T.muted, marginBottom:"0.4rem" }}>{s.label}</div>
            {loading
              ? <Skeleton height={28} width={70} />
              : <div style={{ fontFamily:"'Playfair Display',serif", fontSize:"1.4rem",
                  fontWeight:700, color:s.color }}>{s.value}</div>
            }
          </div>
        ))}
      </div>

      {/* Emotion bars */}
      {national?.distribution && (
        <div style={{ marginBottom:"2.5rem" }}>
          <div style={{ fontFamily:"DM Mono", fontSize:"0.52rem", letterSpacing:"0.14em",
            textTransform:"uppercase", color:T.muted, marginBottom:"1rem" }}>
            National Emotional Distribution
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:"0.6rem" }}>
            {EMOTIONS.map((em, i) => (
              <EmotionBar key={em.key} name={em.name} hex={em.hex}
                pct={national.distribution[em.key] ?? 0}
                inView={inView} delay={i * 60} />
            ))}
          </div>
        </div>
      )}

      {/* Nav cards */}
      <div style={{ display:"grid",
        gridTemplateColumns:bp==="mobile"?"1fr":bp==="tablet"?"1fr 1fr":"repeat(3,1fr)",
        gap:1, background:T.border, border:`1px solid ${T.border}`, marginBottom:"2.5rem" }}>
        {[
          { id:"map", icon:"◉", label:"City Map", desc:"Explore emotional heat by geography" },
          { id:"trends", icon:"↗", label:"Trends", desc:"Track how mood shifts over time" },
          { id:"methodology", icon:"◈", label:"Methodology", desc:"How PEI works and what it measures" },
        ].map(c => (
          <div key={c.id} onClick={() => navigate(c.id)}
            style={{ background:T.bg, padding:"1.5rem", cursor:"pointer",
              transition:"background 0.2s" }}
            onMouseEnter={e=>e.currentTarget.style.background=T.surface}
            onMouseLeave={e=>e.currentTarget.style.background=T.bg}>
            <div style={{ fontFamily:"'Playfair Display',serif", fontSize:"1.5rem",
              color:T.amber, opacity:0.6, marginBottom:"0.5rem" }}>{c.icon}</div>
            <div style={{ fontFamily:"'Playfair Display',serif", fontSize:"0.95rem",
              fontWeight:700, marginBottom:"0.3rem" }}>{c.label}</div>
            <div style={{ fontFamily:"DM Mono", fontSize:"0.58rem", color:T.muted }}>{c.desc}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── DASHBOARD PAGE ───────────────────────────────────────────────────────────
function DashboardPage({ navigate }) {
  const bp = useBreakpoint();
  const [ref, inView] = useInView(0.05);
  const [national, setNational] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getNational().then(d => { setNational(d); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const dominant = national?.dominant ? EMOTION_MAP[national.dominant] : null;

  return (
    <div ref={ref} style={{ padding:bp==="mobile"?"0 1.25rem":"0" }}>
      <PageHeader label="Dashboard" title="National Pulse."
        subtitle="Real-time aggregate view of emotional signals submitted across the Philippines."
        live={!loading && !!national} />

      <div style={{ display:"grid",
        gridTemplateColumns:bp==="mobile"?"1fr 1fr":"repeat(4,1fr)",
        gap:1, background:T.border, border:`1px solid ${T.border}`, marginBottom:"2rem" }}>
        <ScoreCard label="Dominant Emotion" value={dominant?.name ?? "—"}
          desc="Most reported today" color={dominant?.hex ?? T.amber}
          fill={national?.distribution?.[national?.dominant] ?? 0} loading={loading} />
        <ScoreCard label="Total Submissions" value={national?.total?.toLocaleString() ?? "—"}
          desc="All time" color={T.teal} fill={Math.min((national?.total ?? 0) / 10000 * 100, 100)} loading={loading} />
        <ScoreCard label="Cities Active" value={national?.cities ?? "—"}
          desc="With ≥50 submissions" color={T.amber} fill={Math.min((national?.cities ?? 0) / 200 * 100, 100)} loading={loading} />
        <ScoreCard label="Provinces" value={national?.provinces ?? "—"}
          desc="Represented" color={T.rose} fill={Math.min((national?.provinces ?? 0) / 82 * 100, 100)} loading={loading} />
      </div>

      {national?.distribution ? (
        <div style={{ border:`1px solid ${T.border}`, padding:"1.5rem", marginBottom:"2rem" }}>
          <div style={{ fontFamily:"DM Mono", fontSize:"0.52rem", letterSpacing:"0.14em",
            textTransform:"uppercase", color:T.muted, marginBottom:"1.25rem" }}>
            Emotional Distribution — All Submissions
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:"0.75rem" }}>
            {EMOTIONS.sort((a,b)=>(national.distribution[b.key]??0)-(national.distribution[a.key]??0))
              .map((em, i) => (
              <EmotionBar key={em.key} name={em.name} hex={em.hex}
                pct={national.distribution[em.key] ?? 0}
                inView={inView} delay={i * 60} />
            ))}
          </div>
        </div>
      ) : !loading && (
        <EmptyState icon="◎" title="No national data yet."
          body="Once enough submissions arrive, the national distribution will appear here."
          cta="Be the first" onCta={() => {}} />
      )}
    </div>
  );
}

// ─── MAP PAGE ─────────────────────────────────────────────────────────────────
function MapPage({ openModal }) {
  const bp = useBreakpoint();
  const [aggs, setAggs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [lguData, setLguData] = useState(null);
  const [lguLoading, setLguLoading] = useState(false);

  useEffect(() => {
    getLGUAggregations().then(d => { setAggs(d); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const handleSelect = async (lgu) => {
    setSelected(lgu);
    setLguLoading(true);
    try { setLguData(await getLGUData(lgu.id)); }
    catch { setLguData(null); }
    finally { setLguLoading(false); }
  };

  return (
    <div style={{ padding:bp==="mobile"?"0 1.25rem":"0" }}>
      <PageHeader label="City Map" title="Emotion by Location."
        subtitle="Select any city or municipality to explore its emotional profile."
        live={!loading && aggs.length > 0} />

      <div style={{ display:"grid",
        gridTemplateColumns:bp==="mobile"?"1fr":bp==="tablet"?"1fr":"1fr 1fr",
        gap:"1.5rem" }}>
        <div>
          <div style={{ fontFamily:"DM Mono", fontSize:"0.52rem", letterSpacing:"0.14em",
            textTransform:"uppercase", color:T.muted, marginBottom:"0.75rem" }}>
            Active Locations ({aggs.length})
          </div>
          <div style={{ border:`1px solid ${T.border}`, maxHeight:480, overflowY:"auto" }}>
            {loading ? (
              <div style={{ padding:"1.5rem" }}>
                {[...Array(6)].map((_,i) => <Skeleton key={i} height={40} style={{ marginBottom:8 }} />)}
              </div>
            ) : aggs.length === 0 ? (
              <EmptyState icon="◌" title="No locations yet."
                body="Cities appear after 50 submissions from that area." />
            ) : aggs.map(lgu => {
              const em = EMOTION_MAP[lgu.dominant];
              return (
                <div key={lgu.id} onClick={() => handleSelect(lgu)}
                  style={{ padding:"0.7rem 1rem", borderBottom:`1px solid ${T.border}`,
                    cursor:"pointer", background:selected?.id===lgu.id?T.surface2:"none",
                    transition:"background 0.15s", display:"flex",
                    alignItems:"center", justifyContent:"space-between" }}
                  onMouseEnter={e=>e.currentTarget.style.background=T.surface2}
                  onMouseLeave={e=>e.currentTarget.style.background=selected?.id===lgu.id?T.surface2:"none"}>
                  <div>
                    <div style={{ fontFamily:"DM Mono", fontSize:"0.62rem", color:T.text }}>{lgu.name}</div>
                    <div style={{ fontFamily:"DM Mono", fontSize:"0.5rem", color:T.muted, marginTop:"0.1rem" }}>
                      {lgu.province}
                    </div>
                  </div>
                  {em && (
                    <div style={{ display:"flex", alignItems:"center", gap:"0.4rem" }}>
                      <span style={{ fontSize:"0.9rem" }}>{em.emoji}</span>
                      <span style={{ fontFamily:"DM Mono", fontSize:"0.5rem",
                        color:em.hex, letterSpacing:"0.06em", textTransform:"uppercase" }}>
                        {em.name}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div>
          {selected ? (
            <div style={{ border:`1px solid ${T.border}`, padding:"1.5rem" }}>
              <div style={{ fontFamily:"'Playfair Display',serif", fontSize:"1.2rem",
                fontWeight:700, marginBottom:"0.3rem" }}>{selected.name}</div>
              <div style={{ fontFamily:"DM Mono", fontSize:"0.52rem", color:T.muted,
                marginBottom:"1.25rem" }}>{selected.province} · {selected.region}</div>
              {lguLoading ? (
                <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                  {[...Array(8)].map((_,i)=><Skeleton key={i} height={14} />)}
                </div>
              ) : lguData?.distribution ? (
                <div style={{ display:"flex", flexDirection:"column", gap:"0.65rem" }}>
                  {EMOTIONS.sort((a,b)=>(lguData.distribution[b.key]??0)-(lguData.distribution[a.key]??0))
                    .map((em,i) => (
                    <EmotionBar key={em.key} name={em.name} hex={em.hex}
                      pct={lguData.distribution[em.key] ?? 0}
                      inView={true} delay={i * 50} />
                  ))}
                </div>
              ) : (
                <EmptyState icon="◌" title="No data."
                  body="This location doesn't have enough submissions yet." />
              )}
            </div>
          ) : (
            <div style={{ border:`1px dashed ${T.border}`, padding:"3rem 2rem",
              textAlign:"center", height:"100%", display:"flex",
              flexDirection:"column", alignItems:"center", justifyContent:"center" }}>
              <div style={{ fontFamily:"'Playfair Display',serif", fontSize:"2rem",
                color:"rgba(255,255,255,0.05)", marginBottom:"0.75rem" }}>◉</div>
              <div style={{ fontFamily:"DM Mono", fontSize:"0.58rem", color:T.muted }}>
                Select a location to view its emotional profile
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── TRENDS PAGE ──────────────────────────────────────────────────────────────
function TrendsPage() {
  const bp = useBreakpoint();
  const [ref, inView] = useInView(0.05);

  return (
    <div ref={ref} style={{ padding:bp==="mobile"?"0 1.25rem":"0" }}>
      <PageHeader label="Trends" title="Emotion Over Time."
        subtitle="Track how the collective mood of the Philippines shifts across days, weeks, and months." />
      <EmptyState icon="↗" title="Trend data coming soon."
        body="As the index accumulates more submissions, time-series trend charts will appear here — showing emotional arcs across events, holidays, and news cycles." />
    </div>
  );
}

// ─── SEASONAL PAGE ────────────────────────────────────────────────────────────
function SeasonalPage() {
  const bp = useBreakpoint();
  const [ref, inView] = useInView(0.05);

  const seasons = [
    { label:"January – March", icon:"🌧", color:"#6366f1", title:"Bagyo Season Aftermath",
      body:"The tail of the wet season. Grief and longing typically peak as communities recover from typhoon impacts." },
    { label:"April – June", icon:"☀️", color:T.amber, title:"Summer Heat",
      body:"The hottest months. Anxiety rises with heat indices. Hope spikes around graduation and election seasons." },
    { label:"July – September", icon:"🌀", color:T.rose, title:"Typhoon Core",
      body:"Peak storm season. Anger and determination dominate as communities brace for and respond to disasters." },
    { label:"October – December", icon:"🌟", color:T.teal, title:"Ber Months",
      body:"The Philippines' beloved Christmas stretch. Relief and hope reach annual highs. The longest holiday season in the world." },
  ];

  return (
    <div ref={ref} style={{ padding:bp==="mobile"?"0 1.25rem":"0" }}>
      <PageHeader label="Seasonal" title="The Emotional Calendar."
        subtitle="How Philippine seasons, typhoons, and cultural events shape collective feeling across the year." />
      <div style={{ display:"grid",
        gridTemplateColumns:bp==="mobile"?"1fr":bp==="tablet"?"1fr 1fr":"repeat(4,1fr)",
        gap:1, background:T.border, border:`1px solid ${T.border}`, marginBottom:"2.5rem" }}>
        {seasons.map((s, i) => (
          <div key={i} style={{ background:T.bg, padding:"1.5rem",
            opacity:inView?1:0, transform:inView?"none":"translateY(16px)",
            transition:`all 0.5s ${i*0.1}s` }}>
            <div style={{ fontSize:"1.8rem", marginBottom:"0.6rem" }}>{s.icon}</div>
            <div style={{ fontFamily:"DM Mono", fontSize:"0.5rem", letterSpacing:"0.12em",
              textTransform:"uppercase", color:s.color, marginBottom:"0.4rem" }}>{s.label}</div>
            <div style={{ fontFamily:"'Playfair Display',serif", fontSize:"0.9rem",
              fontWeight:700, marginBottom:"0.4rem" }}>{s.title}</div>
            <div style={{ fontFamily:"DM Mono", fontSize:"0.58rem",
              color:T.muted, lineHeight:1.7 }}>{s.body}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── ETHICS PAGE ──────────────────────────────────────────────────────────────
function EthicsPage() {
  const bp = useBreakpoint();
  const [ref, inView] = useInView(0.05);

  const principles = [
    { icon:"◈", color:T.teal, title:"Radical Anonymity",
      body:"No accounts. No login. No email. The system is designed so that even if compelled, we cannot identify who submitted what." },
    { icon:"◉", color:T.amber, title:"Aggregation-Only Display",
      body:"Individual submissions are never shown. Only community-level aggregates appear, and only when a threshold is met." },
    { icon:"△", color:T.rose, title:"Voluntary Participation",
      body:"Submission is always a choice. There is no default data collection. No passive tracking of any kind." },
    { icon:"□", color:"#6366f1", title:"Emotional, Not Behavioral",
      body:"PEI measures feeling, not action. We do not correlate emotional data with voting, spending, or any behavioral signal." },
    { icon:"○", color:"#10b981", title:"No Commercial Use",
      body:"This data will never be sold, licensed for advertising, or used to target individuals or groups for commercial purposes." },
    { icon:"◇", color:T.amber, title:"Open Methodology",
      body:"How we collect, aggregate, and display data is fully documented. We publish our thresholds, salt logic, and display rules." },
  ];

  return (
    <div ref={ref} style={{ padding:bp==="mobile"?"0 1.25rem":"0" }}>
      <PageHeader label="Ethics" title="Built on Privacy."
        subtitle="The principles that govern how PEI collects, protects, and uses emotional data." />
      <div style={{ display:"grid",
        gridTemplateColumns:bp==="mobile"?"1fr":bp==="tablet"?"1fr 1fr":"repeat(3,1fr)",
        gap:1, background:T.border, border:`1px solid ${T.border}`, marginBottom:"2.5rem" }}>
        {principles.map((s, i) => (
          <div key={i} style={{ background:T.bg, padding:"1.5rem",
            opacity:inView?1:0, transform:inView?"none":"translateY(16px)",
            transition:`all 0.5s ${i*0.08}s ease` }}>
            <div style={{ fontFamily:"'Playfair Display',serif", fontSize:"2rem",
              color:s.color, opacity:0.5, marginBottom:"0.5rem", lineHeight:1 }}>{s.icon}</div>
            <div style={{ fontFamily:"'Playfair Display',serif", fontSize:"0.95rem",
              fontWeight:700, marginBottom:"0.4rem" }}>{s.title}</div>
            <div style={{ fontFamily:"DM Mono", fontSize:"0.6rem",
              color:T.muted, lineHeight:1.7 }}>{s.body}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── METHODOLOGY PAGE ─────────────────────────────────────────────────────────
function MethodologyPage() {
  const bp = useBreakpoint();
  const [ref, inView] = useInView(0.05);

  const sections = [
    { icon:"◈", color:T.amber, title:"What We Measure",
      body:"Eight discrete emotional states, each rated by intensity on a 1–5 scale. The combination of emotion type and intensity creates a weighted signal that contributes to community-level distributions." },
    { icon:"◉", color:T.teal, title:"Aggregation Logic",
      body:"Submissions are grouped by LGU (city or municipality). A minimum threshold of 50 submissions is required before any community data is displayed, preventing exposure of small groups." },
    { icon:"△", color:T.rose, title:"Time Windows",
      body:"The index operates on rolling windows: a 24-hour live feed, a 7-day trend, and cumulative all-time data. Each window is calculated independently to prevent anchoring bias." },
    { icon:"□", color:"#6366f1", title:"Dominance Score",
      body:"A community's 'dominant emotion' is not simply the plurality. It is calculated using intensity-weighted frequency, normalized against the national baseline to surface genuine local signal." },
    { icon:"○", color:"#10b981", title:"Bias Acknowledgment",
      body:"PEI measures willing participants with internet access, not all Filipinos. Urban areas are over-represented. Older and rural populations are under-represented. This is a mirror, not a census." },
    { icon:"◇", color:T.amber, title:"Anonymity Architecture",
      body:"No IP addresses are stored permanently. No device fingerprints are retained. Daily rotating salts mean yesterday's hashes are unrecoverable. Raw text from optional messages is never stored — only emotional signal. Cities appear only after 50 submissions, preventing individual exposure. The smallest unit of display is always a community." },
  ];

  return (
    <div>
      <div style={{ padding:bp==="mobile"?"0 1.25rem":"0" }}>
        <PageHeader label="Methodology" title="How the Index Works."
          subtitle="What PEI measures, how it measures it, and what it cannot tell you. Transparency is part of the product." />
      </div>
      <div ref={ref} style={{ display:"grid",
        gridTemplateColumns:bp==="mobile"?"1fr":bp==="tablet"?"1fr 1fr":"repeat(3,1fr)",
        gap:1, background:T.border, border:`1px solid ${T.border}` }}>
        {sections.map((s, i) => (
          <div key={i} style={{ background:T.bg, padding:"1.5rem",
            opacity:inView?1:0, transform:inView?"none":"translateY(16px)",
            transition:`all 0.5s ${i*0.08}s ease` }}>
            <div style={{ fontFamily:"'Playfair Display',serif", fontSize:"2rem",
              color:s.color, opacity:0.5, marginBottom:"0.5rem", lineHeight:1 }}>{s.icon}</div>
            <div style={{ fontFamily:"'Playfair Display',serif", fontSize:"0.95rem",
              fontWeight:700, marginBottom:"0.4rem" }}>{s.title}</div>
            <div style={{ fontFamily:"DM Mono", fontSize:"0.6rem",
              color:T.muted, lineHeight:1.7 }}>{s.body}</div>
          </div>
        ))}
      </div>
      <div style={{ padding:bp==="mobile"?"2rem 1.25rem 0":"2.5rem 0 0" }}>
        <blockquote style={{ fontFamily:"'Playfair Display',serif", fontStyle:"italic",
          fontSize:bp==="mobile"?"1.1rem":"1.5rem", lineHeight:1.5, letterSpacing:"-0.01em",
          borderLeft:`3px solid ${T.amber}`, paddingLeft:"1.25rem",
          margin:0, maxWidth:680 }}>
          "PEI is a voluntary emotional census — a living record of how Filipinos who choose to participate are feeling. It is not a scientific survey. It is a mirror, not a measurement."
        </blockquote>
      </div>
    </div>
  );
}

// ─── LEGAL / DOC PAGES ────────────────────────────────────────────────────────

function DocSection({ title, children }) {
  return (
    <div style={{ marginBottom:"2rem", paddingBottom:"2rem", borderBottom:`1px solid ${T.border}` }}>
      <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:"1.15rem",
        fontWeight:700, marginBottom:"0.75rem", letterSpacing:"-0.01em" }}>{title}</h2>
      <div style={{ fontFamily:"DM Mono", fontSize:"0.63rem", color:T.muted, lineHeight:1.85 }}>
        {children}
      </div>
    </div>
  );
}

function PrivacyPolicyPage() {
  const bp = useBreakpoint();
  return (
    <div style={{ padding:bp==="mobile"?"0 1.25rem":"0" }}>
      <PageHeader label="Legal" title="Privacy Policy."
        subtitle="How the Philippines Emotional Index handles — and deliberately does not handle — your data." />
      <DocSection title="1. What We Collect">
        <p>When you submit a feeling, we record: the emotional category you selected (e.g. Hope, Anxiety), the intensity level (1–5), the LGU (city or municipality) you identified, an optional short-form text message if you chose to include one, and a one-way hash of a session token that expires within 24 hours. We do not collect your IP address in any persistent form. We do not collect your name, email, phone number, or any account identifier.</p>
      </DocSection>
      <DocSection title="2. What We Do Not Collect">
        <p>PEI is engineered around the principle of minimum viable data. We do not collect: device fingerprints, browser identifiers, geolocation coordinates, behavioral data, cookies for tracking, or any cross-session identity signal. The system is designed so that even a compelled disclosure would yield no individually identifying information.</p>
      </DocSection>
      <DocSection title="3. How Data Is Stored">
        <p>Submissions are stored in an aggregated form only. Raw individual submissions are retained for a maximum of 72 hours before being collapsed into community-level statistics. Optional text messages are processed for emotional signal classification and then immediately discarded — the raw text is never written to permanent storage.</p>
      </DocSection>
      <DocSection title="4. How Data Is Displayed">
        <p>No individual submission is ever displayed. Community data is only shown when a minimum threshold of 50 submissions from that LGU has been reached. The smallest unit of display is always a community, never a person. Distributions shown on the site represent aggregated percentages, not individual responses.</p>
      </DocSection>
      <DocSection title="5. Third Parties">
        <p>We do not sell, license, share, or transfer your data to any third party for any commercial purpose. Aggregated, anonymized, non-attributable statistics may be shared with academic research partners under a formal data access agreement. See our Research Access policy for details.</p>
      </DocSection>
      <DocSection title="6. Your Rights">
        <p>Because we do not collect identifying information, we cannot retrieve or delete a specific individual's submission on request — there is no linkage between a submission and a person. This is a feature of the design, not a limitation of our policy. If you have questions about our privacy practices, contact us at the address listed on the Contact Us page.</p>
      </DocSection>
      <DocSection title="7. Changes to This Policy">
        <p>We will post any changes to this privacy policy on this page with a revised effective date. Continued use of the submission feature constitutes acceptance of the updated policy.</p>
      </DocSection>
      <div style={{ fontFamily:"DM Mono", fontSize:"0.52rem", color:T.muted, paddingBottom:"2rem" }}>
        Effective date: January 1, 2025. Last updated: January 1, 2025.
      </div>
    </div>
  );
}

function AnonymityFrameworkPage() {
  const bp = useBreakpoint();
  const [ref, inView] = useInView(0.05);
  const layers = [
    { num:"01", color:T.teal, title:"No Persistent IP Storage",
      body:"Your IP address is used solely to enforce rate limits within a single session. It is never written to any permanent data store and is discarded after the session window closes." },
    { num:"02", color:T.amber, title:"Daily Rotating Salt Architecture",
      body:"Any session token is hashed using a salt that rotates every 24 hours. This means yesterday's hash is mathematically unrecoverable today, even with full access to the current salt." },
    { num:"03", color:T.rose, title:"No Device Fingerprinting",
      body:"PEI does not use canvas fingerprinting, WebGL fingerprinting, AudioContext fingerprinting, or any other technique to build a device profile. The browser sends no identifying signals beyond a temporary session token." },
    { num:"04", color:"#6366f1", title:"Text-Ephemeral Processing",
      body:"If you include an optional text message, it is processed in memory for emotional signal classification only. The raw text string is never written to disk, never logged, and cannot be retrieved after the classification step completes." },
    { num:"05", color:"#10b981", title:"Community Threshold Gating",
      body:"No LGU data is displayed until at least 50 independent submissions have been recorded for that community. This prevents reverse-engineering of individual responses from small-group statistics." },
    { num:"06", color:T.amber, title:"Aggregation-Before-Storage",
      body:"Individual submissions are collapsed into community-level statistical distributions before any long-term storage occurs. The atomic unit of our database is a community aggregate, not an individual response." },
  ];

  return (
    <div ref={ref} style={{ padding:bp==="mobile"?"0 1.25rem":"0" }}>
      <PageHeader label="Legal" title="Anonymity Framework."
        subtitle="The technical and architectural decisions that make PEI anonymity a guarantee, not a promise." />
      <div style={{ display:"grid",
        gridTemplateColumns:bp==="mobile"?"1fr":bp==="tablet"?"1fr 1fr":"repeat(3,1fr)",
        gap:1, background:T.border, border:`1px solid ${T.border}`, marginBottom:"2.5rem" }}>
        {layers.map((l, i) => (
          <div key={i} style={{ background:T.bg, padding:"1.5rem",
            opacity:inView?1:0, transform:inView?"none":"translateY(16px)",
            transition:`all 0.5s ${i*0.08}s ease` }}>
            <div style={{ fontFamily:"'Playfair Display',serif", fontSize:"2.5rem",
              color:l.color, opacity:0.15, lineHeight:1, marginBottom:"0.5rem" }}>{l.num}</div>
            <div style={{ fontFamily:"'Playfair Display',serif", fontSize:"0.95rem",
              fontWeight:700, marginBottom:"0.4rem", color:l.color }}>{l.title}</div>
            <div style={{ fontFamily:"DM Mono", fontSize:"0.6rem", color:T.muted, lineHeight:1.7 }}>{l.body}</div>
          </div>
        ))}
      </div>
      <div style={{ border:`1px solid ${T.teal}20`, background:`${T.teal}05`,
        padding:"1.25rem 1.5rem", marginBottom:"2.5rem",
        fontFamily:"DM Mono", fontSize:"0.6rem", color:T.muted, lineHeight:1.8 }}>
        <span style={{ color:T.teal, fontWeight:500 }}>Design Principle: </span>
        Anonymity by architecture means that even if PEI were legally compelled to disclose user data, the disclosed data would contain no information that could identify an individual. This is not a policy commitment — it is a structural property of the system.
      </div>
    </div>
  );
}

function DataMethodologyPage() {
  const bp = useBreakpoint();
  return (
    <div style={{ padding:bp==="mobile"?"0 1.25rem":"0" }}>
      <PageHeader label="Legal" title="Data Methodology."
        subtitle="A technical specification of how emotional signals are collected, weighted, and aggregated into the PEI index." />
      <DocSection title="Signal Collection">
        <p>Each submission captures: emotion_key (one of 8 canonical emotions), intensity (integer 1–5), lgu_id (foreign key to the LGU registry), and submitted_at (UTC timestamp). Optional fields: text_signal (string, max 150 chars, processed then discarded).</p>
      </DocSection>
      <DocSection title="Weighting Model">
        <p>Raw emotion frequency is insufficient for meaningful signal. PEI uses an intensity-weighted frequency model: each submission's contribution to its emotion bucket is multiplied by its intensity score divided by the maximum intensity (5). A submission of Grief at intensity 5 contributes 1.0 units to the Grief bucket; a submission at intensity 2 contributes 0.4 units. Buckets are then normalized to percentages.</p>
      </DocSection>
      <DocSection title="Community Thresholds">
        <p>A minimum of 50 submissions is required before a community's data is surfaced in the map or any public-facing view. This threshold was selected to (a) ensure statistical stability of percentage distributions and (b) prevent de-anonymization through inference from small groups. Communities with fewer than 50 submissions are recorded but not displayed.</p>
      </DocSection>
      <DocSection title="Dominance Calculation">
        <p>The 'dominant emotion' for a community is the emotion with the highest intensity-weighted frequency score after normalization. Ties are broken by recency — the emotion with the more recent submission median is preferred. The national dominant emotion is calculated from the aggregated national distribution, not a plurality of LGU dominant emotions.</p>
      </DocSection>
      <DocSection title="Time Windows">
        <p>Three time windows are maintained: Live (rolling 24 hours), Weekly (rolling 7 days), and All-Time (full history). Each window is calculated independently. The default display is Live. Time-window calculations are performed on a 15-minute refresh cycle.</p>
      </DocSection>
      <DocSection title="Known Limitations">
        <p>Self-selection bias: participants choose to submit, and emotionally activated individuals are more likely to participate. Platform bias: mobile and desktop internet access skews submissions toward urban, younger, and more connected populations. Language bias: the interface is currently English-only, which excludes fluent-Tagalog-only and regional-language-only users. PEI acknowledges these limitations explicitly and does not represent this data as a scientific sample.</p>
      </DocSection>
    </div>
  );
}

function ResearchAccessPage() {
  const bp = useBreakpoint();
  return (
    <div style={{ padding:bp==="mobile"?"0 1.25rem":"0" }}>
      <PageHeader label="Legal" title="Research Access."
        subtitle="Guidelines for academic and institutional researchers who wish to access PEI data for non-commercial research purposes." />
      <DocSection title="Who May Apply">
        <p>Research access is available to faculty members, postdoctoral researchers, and graduate students affiliated with accredited universities or research institutions. Independent researchers may apply on a case-by-case basis. Commercial entities are not eligible for the research access tier — see API Reference for commercial data access options.</p>
      </DocSection>
      <DocSection title="What Is Available">
        <p>Approved researchers receive access to: anonymized community-level aggregate exports (LGU × emotion × intensity × time window), historical trend data with configurable time resolution (daily, weekly, monthly), regional breakdowns by province and island group, and event-correlation datasets aligned to major Philippine news events. No individual-level data exists or is provided.</p>
      </DocSection>
      <DocSection title="Application Process">
        <p>Submit a research proposal via the Research Portal that includes: institutional affiliation, research question and methodology, intended use of data, data security plan, expected publication timeline, and co-investigator details if applicable. Applications are reviewed on a rolling basis with a typical 2–4 week turnaround. Approved researchers sign a Data Use Agreement before access is granted.</p>
      </DocSection>
      <DocSection title="Data Use Restrictions">
        <p>Research data may not be: shared with non-approved parties, used for commercial purposes, used to attempt to re-identify individuals, combined with other datasets in ways that could enable identification, or published in ways that present PEI data as a representative scientific sample without appropriate methodological caveats.</p>
      </DocSection>
      <DocSection title="Attribution">
        <p>Publications using PEI data should cite: "Philippines Emotional Index (PEI), [year of data]. Anonymized community-level aggregate data. pei.ph. Accessed [access date]." We request a pre-publication notification and a copy of any paper that uses PEI data.</p>
      </DocSection>
      <div style={{ paddingBottom:"2rem" }}>
        <button style={{ background:T.amber, color:"#000", border:"none",
          padding:"0.6rem 1.4rem", fontFamily:"DM Mono", fontSize:"0.6rem",
          fontWeight:500, letterSpacing:"0.1em", textTransform:"uppercase",
          cursor:"pointer" }}
          onMouseEnter={e=>e.currentTarget.style.background="#fff"}
          onMouseLeave={e=>e.currentTarget.style.background=T.amber}>
          Apply via Research Portal →
        </button>
      </div>
    </div>
  );
}

function APIReferencePage() {
  const bp = useBreakpoint();
  const CodeBlock = ({ children }) => (
    <pre style={{ background:T.surface2, border:`1px solid ${T.border}`,
      padding:"1rem 1.25rem", fontFamily:"DM Mono", fontSize:"0.6rem",
      color:T.teal, lineHeight:1.7, overflowX:"auto", marginTop:"0.75rem",
      marginBottom:"1.25rem" }}>{children}</pre>
  );

  return (
    <div style={{ padding:bp==="mobile"?"0 1.25rem":"0" }}>
      <PageHeader label="Documentation" title="API Reference."
        subtitle="Programmatic access to PEI aggregate data. All endpoints return anonymized community-level statistics only." />
      <DocSection title="Base URL">
        <CodeBlock>https://api.pei.ph/v1</CodeBlock>
        <p>All responses are JSON. Authentication uses Bearer tokens issued via the Research Portal or API Access tier.</p>
      </DocSection>
      <DocSection title="GET /national">
        <p>Returns the current national emotional distribution.</p>
        <CodeBlock>{`GET /v1/national?window=live

Response:
{
  "dominant": "hope",
  "total_submissions": 14823,
  "distribution": {
    "hope": 28.4,
    "anxiety": 22.1,
    "determination": 18.7,
    "longing": 12.3,
    "relief": 9.8,
    "grief": 4.2,
    "anger": 3.1,
    "regret": 1.4
  },
  "window": "live",
  "generated_at": "2025-01-15T08:00:00Z"
}`}</CodeBlock>
        <p>Supported window values: <span style={{color:T.amber}}>live</span> (24h), <span style={{color:T.amber}}>weekly</span> (7d), <span style={{color:T.amber}}>alltime</span>.</p>
      </DocSection>
      <DocSection title="GET /lgu/:id">
        <p>Returns the emotional distribution for a specific LGU. Returns 404 if the LGU has not yet reached the minimum submission threshold.</p>
        <CodeBlock>{`GET /v1/lgu/112801?window=live

Response:
{
  "lgu_id": 112801,
  "name": "Quezon City",
  "province": "Metro Manila",
  "dominant": "anxiety",
  "submission_count": 2341,
  "distribution": { ... },
  "window": "live"
}`}</CodeBlock>
      </DocSection>
      <DocSection title="GET /lgu/search">
        <p>Search for LGUs by name.</p>
        <CodeBlock>{`GET /v1/lgu/search?q=cebu&type=city

Response: Array of LGU objects with id, name, province, region, lgu_type`}</CodeBlock>
      </DocSection>
      <DocSection title="Rate Limits">
        <p>Free tier: 100 requests/hour. Research tier: 1,000 requests/hour. Enterprise tier: unlimited with SLA. Rate limit headers are included in all responses: <span style={{color:T.amber}}>X-RateLimit-Limit</span>, <span style={{color:T.amber}}>X-RateLimit-Remaining</span>, <span style={{color:T.amber}}>X-RateLimit-Reset</span>.</p>
      </DocSection>
      <DocSection title="Authentication">
        <CodeBlock>{`Authorization: Bearer pei_your_api_key_here`}</CodeBlock>
        <p>API keys are issued via the Research Portal. Keep your key secret. Do not expose it in client-side code.</p>
      </DocSection>
    </div>
  );
}

function DataAccessPage() {
  const bp = useBreakpoint();
  return (
    <div style={{ padding:bp==="mobile"?"0 1.25rem":"0" }}>
      <PageHeader label="Documentation" title="Data Access."
        subtitle="Options for accessing PEI data programmatically, from individual developers to institutional partners." />

      <div style={{ display:"grid",
        gridTemplateColumns:bp==="mobile"?"1fr":bp==="tablet"?"1fr 1fr":"repeat(3,1fr)",
        gap:1, background:T.border, border:`1px solid ${T.border}`, marginBottom:"2.5rem" }}>
        {[
          { tier:"Free", color:T.muted, price:"No cost", features:["National distribution", "Top 20 LGUs by volume", "Live window only", "100 requests/hour", "JSON via REST API"] },
          { tier:"Research", color:T.teal, price:"Academic / Non-profit", features:["All LGU data", "All time windows", "Historical exports (CSV)", "1,000 requests/hour", "Priority support"] },
          { tier:"Enterprise", color:T.amber, price:"Contact for pricing", features:["Full dataset access", "Real-time webhooks", "Custom aggregations", "Unlimited requests", "SLA + dedicated support"] },
        ].map((t, i) => (
          <div key={i} style={{ background:T.bg, padding:"1.75rem 1.5rem" }}>
            <div style={{ fontFamily:"DM Mono", fontSize:"0.5rem", letterSpacing:"0.14em",
              textTransform:"uppercase", color:t.color, marginBottom:"0.3rem" }}>{t.tier}</div>
            <div style={{ fontFamily:"'Playfair Display',serif", fontSize:"1rem",
              fontWeight:700, marginBottom:"1rem", color:T.text }}>{t.price}</div>
            {t.features.map((f, j) => (
              <div key={j} style={{ fontFamily:"DM Mono", fontSize:"0.58rem",
                color:T.muted, marginBottom:"0.35rem", display:"flex", gap:"0.5rem" }}>
                <span style={{ color:t.color }}>→</span>{f}
              </div>
            ))}
          </div>
        ))}
      </div>

      <DocSection title="Getting Started">
        <p>Register for an API key via the Research Portal. Free tier keys are issued immediately. Research and Enterprise tiers require application review. Once issued, use your key in the Authorization header on all API requests. See the API Reference for endpoint documentation and code samples.</p>
      </DocSection>
      <DocSection title="Data Format">
        <p>All API responses are JSON. Bulk exports (Research and Enterprise tiers) are available as CSV or JSON-L (newline-delimited JSON). Export files include column headers and metadata headers describing the time window, generation timestamp, and applicable methodology version.</p>
      </DocSection>
      <DocSection title="Usage Policy">
        <p>All data access tiers require agreement to the PEI Data Use Policy. Key restrictions: no re-identification attempts, no commercial resale of raw data, no use in systems that make decisions about individual Filipinos, and attribution in any published use. Violations result in immediate key revocation.</p>
      </DocSection>
    </div>
  );
}

function ResearchPortalPage() {
  const bp = useBreakpoint();
  const [form, setForm] = useState({ name:"", institution:"", email:"", role:"", question:"", timeline:"" });
  const [submitted, setSubmitted] = useState(false);

  const handleChange = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const InputField = ({ label, field, placeholder, multiline }) => (
    <div style={{ marginBottom:"1rem" }}>
      <label style={{ fontFamily:"DM Mono", fontSize:"0.52rem", letterSpacing:"0.12em",
        textTransform:"uppercase", color:T.muted, display:"block", marginBottom:"0.35rem" }}>
        {label}
      </label>
      {multiline ? (
        <textarea value={form[field]} onChange={e=>handleChange(field,e.target.value)}
          placeholder={placeholder} rows={4}
          style={{ width:"100%", background:T.bg, border:`1px solid ${T.border}`,
            color:T.text, padding:"0.6rem 0.8rem", fontFamily:"DM Mono",
            fontSize:"0.65rem", outline:"none", resize:"vertical",
            lineHeight:1.6, boxSizing:"border-box" }}
          onFocus={e=>e.target.style.borderColor=T.amber}
          onBlur={e=>e.target.style.borderColor=T.border} />
      ) : (
        <input value={form[field]} onChange={e=>handleChange(field,e.target.value)}
          placeholder={placeholder}
          style={{ width:"100%", background:T.bg, border:`1px solid ${T.border}`,
            color:T.text, padding:"0.6rem 0.8rem", fontFamily:"DM Mono",
            fontSize:"0.65rem", outline:"none", boxSizing:"border-box" }}
          onFocus={e=>e.target.style.borderColor=T.amber}
          onBlur={e=>e.target.style.borderColor=T.border} />
      )}
    </div>
  );

  if (submitted) return (
    <div style={{ padding:bp==="mobile"?"0 1.25rem":"0" }}>
      <PageHeader label="Documentation" title="Research Portal." subtitle="" />
      <div style={{ textAlign:"center", padding:"4rem 2rem", border:`1px solid ${T.border}` }}>
        <div style={{ fontFamily:"'Playfair Display',serif", fontSize:"3rem", color:T.teal, marginBottom:"1rem" }}>✓</div>
        <div style={{ fontFamily:"'Playfair Display',serif", fontSize:"1.3rem", fontWeight:700, marginBottom:"0.5rem" }}>Application Received</div>
        <div style={{ fontFamily:"DM Mono", fontSize:"0.6rem", color:T.muted, lineHeight:1.8, maxWidth:420, margin:"0 auto" }}>
          We review research applications on a rolling basis. You will receive a response within 2–4 weeks at the email address you provided.
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ padding:bp==="mobile"?"0 1.25rem":"0" }}>
      <PageHeader label="Documentation" title="Research Portal."
        subtitle="Apply for academic or institutional access to PEI aggregate datasets for non-commercial research." />

      <div style={{ display:"grid",
        gridTemplateColumns:bp==="mobile"?"1fr":bp==="desktop"?"1fr 1fr":"1fr",
        gap:"2.5rem" }}>
        <div>
          <div style={{ fontFamily:"DM Mono", fontSize:"0.52rem", letterSpacing:"0.14em",
            textTransform:"uppercase", color:T.muted, marginBottom:"1rem" }}>
            Research Application
          </div>
          <InputField label="Full Name" field="name" placeholder="Dr. Maria Santos" />
          <InputField label="Institution" field="institution" placeholder="University of the Philippines" />
          <InputField label="Email Address" field="email" placeholder="msantos@up.edu.ph" />
          <InputField label="Role / Title" field="role" placeholder="Assistant Professor, Sociology" />
          <InputField label="Research Question" field="question" placeholder="Describe your research question and intended use of PEI data…" multiline />
          <InputField label="Expected Timeline" field="timeline" placeholder="e.g. 6-month study, publication Q3 2025" />
          <button onClick={() => { if(form.name && form.email && form.question) setSubmitted(true); }}
            style={{ background:T.amber, color:"#000", border:"none",
              padding:"0.65rem 1.5rem", fontFamily:"DM Mono", fontSize:"0.6rem",
              fontWeight:500, letterSpacing:"0.1em", textTransform:"uppercase",
              cursor:"pointer", transition:"all 0.2s", marginTop:"0.5rem" }}
            onMouseEnter={e=>e.currentTarget.style.background="#fff"}
            onMouseLeave={e=>e.currentTarget.style.background=T.amber}>
            Submit Application →
          </button>
        </div>

        <div>
          <div style={{ fontFamily:"DM Mono", fontSize:"0.52rem", letterSpacing:"0.14em",
            textTransform:"uppercase", color:T.muted, marginBottom:"1rem" }}>
            What to Expect
          </div>
          {[
            { n:"01", title:"Submit Application", body:"Fill out the form with your institutional details and research question." },
            { n:"02", title:"Review (2–4 weeks)", body:"Our team reviews for methodological fit and compliance with the Data Use Policy." },
            { n:"03", title:"Data Use Agreement", body:"Approved researchers sign a DUA before any data or API keys are issued." },
            { n:"04", title:"Access Granted", body:"Receive API keys, export access, and onboarding documentation." },
          ].map((s, i) => (
            <div key={i} style={{ display:"flex", gap:"1rem", marginBottom:"1.25rem",
              paddingBottom:"1.25rem", borderBottom:`1px solid ${T.border}` }}>
              <div style={{ fontFamily:"'Playfair Display',serif", fontSize:"1.5rem",
                color:T.amber, opacity:0.25, lineHeight:1, flexShrink:0 }}>{s.n}</div>
              <div>
                <div style={{ fontFamily:"'Playfair Display',serif", fontSize:"0.85rem",
                  fontWeight:700, marginBottom:"0.25rem" }}>{s.title}</div>
                <div style={{ fontFamily:"DM Mono", fontSize:"0.58rem",
                  color:T.muted, lineHeight:1.7 }}>{s.body}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ContactUsPage() {
  const bp = useBreakpoint();
  const [form, setForm] = useState({ name:"", email:"", subject:"", message:"" });
  const [sent, setSent] = useState(false);

  const handleChange = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const InputField = ({ label, field, placeholder, multiline }) => (
    <div style={{ marginBottom:"1rem" }}>
      <label style={{ fontFamily:"DM Mono", fontSize:"0.52rem", letterSpacing:"0.12em",
        textTransform:"uppercase", color:T.muted, display:"block", marginBottom:"0.35rem" }}>
        {label}
      </label>
      {multiline ? (
        <textarea value={form[field]} onChange={e=>handleChange(field,e.target.value)}
          placeholder={placeholder} rows={5}
          style={{ width:"100%", background:T.bg, border:`1px solid ${T.border}`,
            color:T.text, padding:"0.6rem 0.8rem", fontFamily:"DM Mono",
            fontSize:"0.65rem", outline:"none", resize:"vertical",
            lineHeight:1.6, boxSizing:"border-box" }}
          onFocus={e=>e.target.style.borderColor=T.amber}
          onBlur={e=>e.target.style.borderColor=T.border} />
      ) : (
        <input value={form[field]} onChange={e=>handleChange(field,e.target.value)}
          placeholder={placeholder}
          style={{ width:"100%", background:T.bg, border:`1px solid ${T.border}`,
            color:T.text, padding:"0.6rem 0.8rem", fontFamily:"DM Mono",
            fontSize:"0.65rem", outline:"none", boxSizing:"border-box" }}
          onFocus={e=>e.target.style.borderColor=T.amber}
          onBlur={e=>e.target.style.borderColor=T.border} />
      )}
    </div>
  );

  if (sent) return (
    <div style={{ padding:bp==="mobile"?"0 1.25rem":"0" }}>
      <PageHeader label="Contact" title="Contact Us." subtitle="" />
      <div style={{ textAlign:"center", padding:"4rem 2rem", border:`1px solid ${T.border}` }}>
        <div style={{ fontFamily:"'Playfair Display',serif", fontSize:"3rem", color:T.teal, marginBottom:"1rem" }}>✓</div>
        <div style={{ fontFamily:"'Playfair Display',serif", fontSize:"1.3rem", fontWeight:700, marginBottom:"0.5rem" }}>Message Sent</div>
        <div style={{ fontFamily:"DM Mono", fontSize:"0.6rem", color:T.muted, lineHeight:1.8, maxWidth:360, margin:"0 auto" }}>
          We typically respond within 2–3 business days. For urgent matters, include URGENT in your subject line.
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ padding:bp==="mobile"?"0 1.25rem":"0" }}>
      <PageHeader label="Contact" title="Contact Us."
        subtitle="Questions about PEI, the data, methodology, or partnership opportunities. We read every message." />

      <div style={{ display:"grid",
        gridTemplateColumns:bp==="mobile"?"1fr":bp==="desktop"?"1fr 1fr":"1fr",
        gap:"3rem", marginBottom:"3rem" }}>
        <div>
          <InputField label="Your Name" field="name" placeholder="Maria Santos" />
          <InputField label="Email Address" field="email" placeholder="maria@example.com" />
          <InputField label="Subject" field="subject" placeholder="e.g. Research collaboration, Data question, Bug report…" />
          <InputField label="Message" field="message" placeholder="Tell us what's on your mind…" multiline />
          <button onClick={() => { if(form.email && form.message) setSent(true); }}
            style={{ background:T.amber, color:"#000", border:"none",
              padding:"0.65rem 1.5rem", fontFamily:"DM Mono", fontSize:"0.6rem",
              fontWeight:500, letterSpacing:"0.1em", textTransform:"uppercase",
              cursor:"pointer", transition:"all 0.2s", marginTop:"0.5rem" }}
            onMouseEnter={e=>e.currentTarget.style.background="#fff"}
            onMouseLeave={e=>e.currentTarget.style.background=T.amber}>
            Send Message →
          </button>
        </div>

        <div style={{ display:"flex", flexDirection:"column", gap:"1.25rem" }}>
          {[
            { icon:"◈", color:T.teal, title:"General Inquiries", body:"hello@pei.ph — Questions about the project, how it works, or how to get involved." },
            { icon:"◉", color:T.amber, title:"Research & Data", body:"research@pei.ph — Academic partnerships, data access requests, methodology questions." },
            { icon:"△", color:T.rose, title:"Press & Media", body:"press@pei.ph — Media inquiries, interview requests, press kit access." },
            { icon:"□", color:"#6366f1", title:"Technical & API", body:"api@pei.ph — Developer questions, API issues, integration support." },
          ].map((c, i) => (
            <div key={i} style={{ padding:"1rem 1.25rem", border:`1px solid ${T.border}`,
              display:"flex", gap:"1rem", alignItems:"flex-start" }}>
              <div style={{ fontFamily:"'Playfair Display',serif", fontSize:"1.3rem",
                color:c.color, opacity:0.5, lineHeight:1, flexShrink:0, marginTop:"0.1rem" }}>{c.icon}</div>
              <div>
                <div style={{ fontFamily:"'Playfair Display',serif", fontSize:"0.85rem",
                  fontWeight:700, marginBottom:"0.25rem" }}>{c.title}</div>
                <div style={{ fontFamily:"DM Mono", fontSize:"0.58rem",
                  color:T.muted, lineHeight:1.7 }}>{c.body}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── FOOTER ───────────────────────────────────────────────────────────────────
function Footer({ navigate, openModal }) {
  const bp = useBreakpoint();

  const FooterLink = ({ label, page }) => (
    <div onClick={() => navigate(page)}
      style={{ fontFamily:"DM Mono", fontSize:"0.58rem", color:T.muted,
        marginBottom:"0.4rem", cursor:"pointer", transition:"color 0.2s" }}
      onMouseEnter={e=>e.target.style.color=T.text}
      onMouseLeave={e=>e.target.style.color=T.muted}>
      {label}
    </div>
  );

  return (
    <footer style={{
      borderTop:`1px solid ${T.border}`,
      marginTop:"4rem",
      background:T.surface,
    }}>
      <div style={{
        maxWidth:1200, margin:"0 auto",
        padding:`2.5rem ${bp==="mobile"?"1.25rem":bp==="tablet"?"2rem":"3rem"}`,
      }}>
        {/* Columns */}
        <div style={{
          display:"grid",
          gridTemplateColumns:bp==="mobile"?"1fr":bp==="tablet"?"1fr 1fr":"2fr 1fr 1fr 1fr",
          gap:bp==="mobile"?"2rem":"2.5rem",
          marginBottom:"2rem",
        }}>
          {/* Brand */}
          <div>
            <div style={{ fontFamily:"'Playfair Display',serif", fontSize:"1.4rem",
              fontWeight:900, color:T.amber, marginBottom:"0.4rem" }}>PEI</div>
            <div style={{ fontFamily:"DM Mono", fontSize:"0.58rem", color:T.muted,
              lineHeight:1.7, maxWidth:300 }}>
              Philippines Emotional Index — A real-time emotional census powered by voluntary, anonymous submissions.
            </div>
            <button onClick={openModal} style={{ marginTop:"1rem", background:T.amber,
              color:"#000", border:"none", padding:"0.5rem 1rem", fontFamily:"DM Mono",
              fontSize:"0.58rem", fontWeight:500, letterSpacing:"0.08em",
              textTransform:"uppercase", cursor:"pointer", transition:"all 0.2s" }}
              onMouseEnter={e=>e.currentTarget.style.background="#fff"}
              onMouseLeave={e=>e.currentTarget.style.background=T.amber}>
              Submit Your Feeling →
            </button>
          </div>

          {/* Pages */}
          <div>
            <div style={{ fontFamily:"DM Mono", fontSize:"0.52rem", letterSpacing:"0.14em",
              textTransform:"uppercase", color:T.muted, marginBottom:"0.75rem" }}>Pages</div>
            <FooterLink label="Dashboard"   page="dashboard" />
            <FooterLink label="City Map"    page="map" />
            <FooterLink label="Trends"      page="trends" />
            <FooterLink label="Seasonal"    page="seasonal" />
            <FooterLink label="Ethics"      page="ethics" />
            <FooterLink label="Methodology" page="methodology" />
          </div>

          {/* Legal */}
          <div>
            <div style={{ fontFamily:"DM Mono", fontSize:"0.52rem", letterSpacing:"0.14em",
              textTransform:"uppercase", color:T.muted, marginBottom:"0.75rem" }}>Legal</div>
            <FooterLink label="Privacy Policy"        page="privacy" />
            <FooterLink label="Anonymity Framework"   page="anonymity" />
            <FooterLink label="Data Methodology"      page="data-methodology" />
            <FooterLink label="Research Access"       page="research-access" />
          </div>

          {/* Documentation */}
          <div>
            <div style={{ fontFamily:"DM Mono", fontSize:"0.52rem", letterSpacing:"0.14em",
              textTransform:"uppercase", color:T.muted, marginBottom:"0.75rem" }}>Documentation</div>
            <FooterLink label="API Reference"   page="api-reference" />
            <FooterLink label="Data Access"     page="data-access" />
            <FooterLink label="Research Portal" page="research-portal" />
            <FooterLink label="Contact Us"      page="contact" />
          </div>
        </div>

        {/* Bottom bar */}
        <div style={{ borderTop:`1px solid ${T.border}`, paddingTop:"1.1rem",
          display:"flex", alignItems:"center", justifyContent:"space-between",
          flexWrap:"wrap", gap:"0.5rem",
          fontFamily:"DM Mono", fontSize:"0.5rem", color:T.muted }}>
          <span>© {new Date().getFullYear()} Philippines Emotional Index. All insights aggregated. No individuals exposed.</span>
          <span>Pattern survives. Person does not.</span>
        </div>
      </div>
    </footer>
  );
}

// ─── PAGE WRAPPER ─────────────────────────────────────────────────────────────
function PageWrapper({ children, page }) {
  const bp = useBreakpoint();
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(false);
    const t = setTimeout(() => setMounted(true), 20);
    return () => clearTimeout(t);
  }, [page]);

  return (
    <div style={{ maxWidth:1200, margin:"0 auto",
      padding:`80px ${bp==="mobile"?"0":bp==="tablet"?"2rem":"3rem"} 0`,
      opacity:mounted?1:0, transform:mounted?"none":"translateY(8px)",
      transition:"all 0.35s ease" }}>
      {children}
    </div>
  );
}

// ─── ROOT ─────────────────────────────────────────────────────────────────────
export default function App() {
  const { page, navigate } = useHashRouter();
  const [modalOpen, setModalOpen] = useState(false);

  const openModal = () => setModalOpen(true);

  const allPages = [
    "home","dashboard","map","trends","seasonal","ethics","methodology",
    "privacy","anonymity","data-methodology","research-access",
    "api-reference","data-access","research-portal","contact",
  ];
  const currentPage = allPages.includes(page) ? page : "home";

  const pages = {
    home:             <HomePage navigate={navigate} openModal={openModal} />,
    dashboard:        <DashboardPage navigate={navigate} />,
    map:              <MapPage openModal={openModal} />,
    trends:           <TrendsPage />,
    seasonal:         <SeasonalPage />,
    ethics:           <EthicsPage />,
    methodology:      <MethodologyPage />,
    privacy:          <PrivacyPolicyPage />,
    anonymity:        <AnonymityFrameworkPage />,
    "data-methodology": <DataMethodologyPage />,
    "research-access":  <ResearchAccessPage />,
    "api-reference":    <APIReferencePage />,
    "data-access":      <DataAccessPage />,
    "research-portal":  <ResearchPortalPage />,
    contact:            <ContactUsPage />,
  };

  return (
    <div style={{ background:T.bg, color:T.text, minHeight:"100vh", fontFamily:"DM Mono,monospace" }}>
      <GrainOverlay />
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;0,900;1,400&family=DM+Mono:wght@300;400;500&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        body{background:#07090f}
        ::-webkit-scrollbar{width:4px}
        ::-webkit-scrollbar-track{background:#07090f}
        ::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.08)}
        select option{background:#0c1018}
        textarea,input{font-family:'DM Mono',monospace!important}
        input::placeholder{color:#5a6070}
        textarea::placeholder{color:#5a6070}
      `}</style>

      <Navigation navigate={navigate} currentPage={currentPage} openModal={openModal} />

      <PageWrapper page={currentPage}>
        {pages[currentPage]}
        <Footer navigate={navigate} openModal={openModal} />
      </PageWrapper>

      <SubmissionModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </div>
  );
}
