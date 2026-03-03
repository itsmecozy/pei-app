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
    { id:"api",       label:"API" },
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
      try {
        const results = await searchLGUs(query);
        setLguResults(results);
      } catch { setLguResults([]); }
      finally { setSearching(false); }
    }, 300);
    return () => clearTimeout(t);
  }, [query]);

  const handleSubmit = async () => {
    if (!selectedLgu || !emotion) return;
    setSubmitting(true);
    setError(null);
    try {
      const result = await submitEmotion({
        lgu_id: selectedLgu.id,
        emotion: emotion.toLowerCase(),
        intensity,
        text: text.trim() || undefined,
      });
      if (result.acknowledged) {
        setDone(true);
        setTimeout(handleClose, 2800);
      } else {
        setError(result.error || "Something went wrong. Please try again.");
      }
    } catch {
      setError("Connection error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.88)",
      backdropFilter:"blur(12px)", zIndex:300,
      display:"flex", alignItems:bp==="mobile"?"flex-end":"center",
      justifyContent:"center", padding:bp==="mobile"?"0":"2rem" }}
      onClick={e => { if(e.target===e.currentTarget) handleClose(); }}>
      <div style={{ background:T.surface, border:`1px solid ${T.border}`,
        maxWidth:520, width:"100%",
        animation:bp==="mobile"?"slideUp 0.3s ease":"modalIn 0.3s ease",
        borderRadius:bp==="mobile"?"16px 16px 0 0":"0" }}>

        {/* Header */}
        <div style={{ padding:"1.25rem 1.5rem", borderBottom:`1px solid ${T.border}`,
          display:"flex", alignItems:"baseline", justifyContent:"space-between" }}>
          <span style={{ fontFamily:"'Playfair Display',serif", fontSize:"1.2rem", fontWeight:700 }}>
            Add to the Index
          </span>
          <button onClick={handleClose} style={{ background:"none", border:"none",
            color:T.muted, cursor:"pointer", fontSize:"1.1rem" }}>✕</button>
        </div>

        {/* Body */}
        <div style={{ padding:"1.25rem 1.5rem" }}>
          {done ? (
            <div style={{ textAlign:"center", padding:"1.75rem 0" }}>
              <div style={{ fontSize:"3rem", marginBottom:"0.75rem",
                animation:"successPop 0.5s ease" }}>◉</div>
              <div style={{ fontFamily:"'Playfair Display',serif", fontSize:"1.1rem",
                fontWeight:700, marginBottom:"0.4rem" }}>You've been counted.</div>
              <p style={{ fontFamily:"DM Mono", fontSize:"0.62rem", color:T.muted, lineHeight:1.7 }}>
                Your feeling has been added to the national index.<br/>The Philippines felt you.
              </p>
            </div>
          ) : (
            <>
              {/* Step 1 — LGU Search */}
              {step === 1 && (
                <div>
                  <label style={{ fontFamily:"DM Mono", fontSize:"0.58rem",
                    letterSpacing:"0.12em", textTransform:"uppercase",
                    color:T.muted, display:"block", marginBottom:"0.6rem" }}>
                    Search your city or municipality
                  </label>
                  <input
                    type="text"
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    placeholder="Type a city or municipality name..."
                    style={{ width:"100%", background:T.bg, border:`1px solid ${T.border}`,
                      color:T.text, padding:"0.7rem 0.9rem", fontFamily:"DM Mono",
                      fontSize:"0.72rem", outline:"none", boxSizing:"border-box",
                      marginBottom:"0.5rem" }}
                    onFocus={e=>e.target.style.borderColor=T.amber}
                    onBlur={e=>e.target.style.borderColor=T.border}
                    autoFocus
                  />

                  {searching && (
                    <div style={{ fontFamily:"DM Mono", fontSize:"0.56rem",
                      color:T.muted, padding:"0.5rem 0" }}>Searching...</div>
                  )}

                  {lguResults.length > 0 && (
                    <div style={{ border:`1px solid ${T.border}`, maxHeight:200,
                      overflowY:"auto", marginBottom:"0.5rem" }}>
                      {lguResults.map(lgu => (
                        <div key={lgu.id}
                          onClick={() => { setSelectedLgu(lgu); setQuery(lgu.name); setLguResults([]); }}
                          style={{ padding:"0.65rem 0.9rem", cursor:"pointer",
                            borderBottom:`1px solid ${T.border}`,
                            background: selectedLgu?.id===lgu.id ? T.surface2 : "none",
                            transition:"background 0.15s" }}
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
                onMouseLeave={e=>e.currentTarget.style.background=T.amber}>
                {submitting ? "Submitting..." : step === 3 ? "Submit Anonymously" : "Continue →"}
              </button>
            </div>
          </div>
        )}
      </div>
      <style>{`
        @keyframes modalIn{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
        @keyframes slideUp{from{transform:translateY(100%)}to{transform:translateY(0)}}
        @keyframes successPop{0%{transform:scale(0);opacity:0}60%{transform:scale(1.2)}100%{transform:scale(1);opacity:1}}
      `}</style>
    </div>
  );
}

// ─── PAGE: HOME ───────────────────────────────────────────────────────────────
function HomePage({ navigate, openModal }) {
  const bp = useBreakpoint();
  const [national, setNational]   = useState(null);
  const [loading, setLoading]     = useState(true);
  const [barProgress, setBarProgress] = useState(0);

  useEffect(() => {
    getNational("7d")
      .then(data => {
        setNational(data);
        setTimeout(() => {
          const start = Date.now();
          const tick = () => {
            const p = Math.min((Date.now()-start)/1600, 1);
            setBarProgress(1 - Math.pow(1-p, 3));
            if (p < 1) requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
        }, 300);
      })
      .catch(() => setNational(null))
      .finally(() => setLoading(false));
  }, []);

  const dist = national?.emotion_dist || {};
  const dominant = national?.dominant_emotion || null;
  const hasData = national && national.submission_count > 0;

  const pages = [
    { id:"dashboard", label:"Dashboard", icon:"◈", desc:"National metrics, city snapshots, ESI & HDR live.", color:T.amber },
    { id:"map",       label:"Map",       icon:"◉", desc:"Emotional heatmap across all Philippine LGUs.", color:T.teal },
    { id:"trends",    label:"Trends",    icon:"↗", desc:"Velocity charts tracking how fast emotions shift.", color:"#a78bfa" },
    { id:"seasonal",  label:"Seasonal",  icon:"◷", desc:"12-month emotional fingerprint of the Philippines.", color:"#fb923c" },
    { id:"ethics",    label:"Ethics",    icon:"✓", desc:"How we protect anonymity and handle data responsibly.", color:"#10b981" },
    { id:"api",       label:"API",       icon:"⌘", desc:"Data access for researchers, journalists, institutions.", color:"#ec4899" },
  ];

  return (
    <div style={{ minHeight:"100vh", display:"flex", flexDirection:"column" }}>
      <section style={{ flex:1, display:"flex", flexDirection:"column", justifyContent:"center",
        padding:bp==="mobile"?"5rem 1.25rem 3rem":"5rem 2.5rem 3rem",
        position:"relative", overflow:"hidden" }}>
        <div style={{ position:"absolute", top:"50%", left:"50%",
          transform:"translate(-50%,-50%)",
          fontFamily:"'Playfair Display',serif",
          fontSize:"clamp(6rem,18vw,18rem)", fontWeight:900,
          color:"rgba(255,255,255,0.018)", pointerEvents:"none",
          userSelect:"none", whiteSpace:"nowrap" }}>FEEL</div>

        <div style={{ maxWidth:820, position:"relative", zIndex:1 }}>
          <div style={{ display:"flex", alignItems:"center", gap:"0.5rem",
            fontFamily:"DM Mono", fontSize:"0.56rem", letterSpacing:"0.18em",
            textTransform:"uppercase", color:T.amber, marginBottom:"1.25rem",
            animation:"fadeUp 0.7s 0.2s both" }}>
            <div style={{ width:20, height:1, background:T.amber }} />
            Philippines Emotional Index · {new Date().toLocaleDateString("en-PH", { month:"long", year:"numeric" })}
            <DataBadge live={hasData} />
          </div>

          <h1 style={{ fontFamily:"'Playfair Display',serif",
            fontSize:"clamp(2.2rem,5.5vw,4.5rem)", fontWeight:900,
            lineHeight:1.08, letterSpacing:"-0.025em", marginBottom:"0.75rem",
            animation:"fadeUp 0.7s 0.35s both" }}>
            {loading
              ? "Loading the national pulse..."
              : hasData
                ? <>The Philippines felt more <em style={{ color:T.amber }}>{dominant}</em> this week.</>
                : "Be the first to add to the Index."
            }
          </h1>

          <p style={{ fontFamily:"DM Mono", fontSize:bp==="mobile"?"0.62rem":"0.68rem",
            color:T.muted, letterSpacing:"0.06em", marginBottom:"2.5rem",
            animation:"fadeUp 0.7s 0.5s both" }}>
            {loading
              ? "Connecting to the index..."
              : hasData
                ? `${national.submission_count.toLocaleString()} anonymous submissions · ${national.active_lgus} active cities`
                : "No submissions yet. The map is waiting to be filled."
            }
          </p>

          {/* Emotion distribution bar */}
          <div style={{ animation:"fadeUp 0.7s 0.6s both" }}>
            <div style={{ fontFamily:"DM Mono", fontSize:"0.54rem", letterSpacing:"0.12em",
              textTransform:"uppercase", color:T.muted, marginBottom:"0.5rem" }}>
              National Emotional Distribution
            </div>

            {loading ? (
              <Skeleton height={10} />
            ) : hasData ? (
              <>
                <div style={{ display:"flex", height:10, gap:1 }}>
                  {Object.entries(dist).map(([key, pct]) => {
                    const em = EMOTION_MAP[key];
                    return (
                      <div key={key}
                        style={{ flex: pct * barProgress,
                          background: em?.hex || T.muted,
                          transition:"flex 1.5s cubic-bezier(.4,0,.2,1)" }}
                        title={`${em?.name || key}: ${Math.round(pct*100)}%`} />
                    );
                  })}
                </div>
                <div style={{ display:"flex", flexWrap:"wrap", gap:"0.6rem", marginTop:"0.75rem" }}>
                  {Object.entries(dist).map(([key, pct]) => {
                    const em = EMOTION_MAP[key];
                    return (
                      <div key={key} style={{ display:"flex", alignItems:"center",
                        gap:"0.3rem", fontFamily:"DM Mono", fontSize:"0.54rem", color:T.muted }}>
                        <div style={{ width:7, height:7, borderRadius:"50%",
                          background:em?.hex || T.muted }} />
                        {em?.name || key} {Math.round(pct*100)}%
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <div style={{ height:10, background:"rgba(255,255,255,0.04)",
                border:`1px dashed ${T.border}`,
                display:"flex", alignItems:"center", justifyContent:"center" }}>
                <span style={{ fontFamily:"DM Mono", fontSize:"0.5rem", color:T.muted }}>
                  Waiting for first submissions
                </span>
              </div>
            )}
          </div>

          <div style={{ display:"flex", gap:"0.75rem", marginTop:"2.5rem",
            flexWrap:"wrap", animation:"fadeUp 0.7s 0.75s both" }}>
            <button onClick={() => navigate("map")}
              style={{ background:T.amber, color:"#000", border:"none",
                padding:"0.7rem 1.5rem", fontFamily:"DM Mono", fontSize:"0.62rem",
                fontWeight:500, letterSpacing:"0.1em", textTransform:"uppercase",
                cursor:"pointer", transition:"all 0.2s" }}
              onMouseEnter={e=>e.currentTarget.style.background="#fff"}
              onMouseLeave={e=>e.currentTarget.style.background=T.amber}>
              Explore the Map →
            </button>
            <button onClick={openModal}
              style={{ background:"none", border:`1px solid ${T.amber}40`,
                color:T.amber, padding:"0.7rem 1.25rem", fontFamily:"DM Mono",
                fontSize:"0.62rem", letterSpacing:"0.1em", textTransform:"uppercase",
                cursor:"pointer", transition:"all 0.2s" }}
              onMouseEnter={e=>e.currentTarget.style.background=`${T.amber}12`}
              onMouseLeave={e=>e.currentTarget.style.background="none"}>
              Submit Your Feeling
            </button>
          </div>
        </div>
      </section>

      {/* Page grid */}
      <section style={{ padding:bp==="mobile"?"2rem 1.25rem":"2.5rem 2.5rem",
        borderTop:`1px solid ${T.border}` }}>
        <div style={{ fontFamily:"DM Mono", fontSize:"0.54rem", letterSpacing:"0.16em",
          textTransform:"uppercase", color:T.muted, marginBottom:"1.25rem" }}>
          Explore the Index
        </div>
        <div style={{ display:"grid",
          gridTemplateColumns:bp==="mobile"?"1fr 1fr":bp==="tablet"?"1fr 1fr 1fr":"repeat(6,1fr)",
          gap:1, background:T.border, border:`1px solid ${T.border}` }}>
          {pages.map(p => (
            <div key={p.id} onClick={() => navigate(p.id)}
              style={{ background:T.surface, padding:"1.5rem 1.1rem",
                cursor:"pointer", transition:"background 0.2s", position:"relative", overflow:"hidden" }}
              onMouseEnter={e=>e.currentTarget.style.background=T.surface2}
              onMouseLeave={e=>e.currentTarget.style.background=T.surface}>
              <div style={{ position:"absolute", top:0, left:0, right:0, height:2, background:p.color }} />
              <div style={{ fontFamily:"'Playfair Display',serif", fontSize:"1.8rem",
                color:p.color, opacity:0.25, marginBottom:"0.6rem", lineHeight:1 }}>{p.icon}</div>
              <div style={{ fontFamily:"DM Mono", fontSize:"0.54rem", letterSpacing:"0.12em",
                textTransform:"uppercase", color:p.color, marginBottom:"0.35rem" }}>{p.label}</div>
              <div style={{ fontFamily:"DM Mono", fontSize:"0.58rem",
                color:T.muted, lineHeight:1.6 }}>{p.desc}</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

// ─── PAGE: DASHBOARD ──────────────────────────────────────────────────────────
function DashboardPage({ navigate }) {
  const bp = useBreakpoint();
  const [ref, inView] = useInView();
  const [national, setNational] = useState(null);
  const [lgus, setLgus]         = useState([]);
  const [loading, setLoading]   = useState(true);
  const [period, setPeriod]     = useState("7d");

  useEffect(() => {
    setLoading(true);
    Promise.all([getNational(period), getLGUAggregations(period)])
      .then(([nat, lguData]) => {
        setNational(nat);
        setLgus(lguData);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [period]);

  const hasData = national && national.submission_count > 0;
  const esiColor = v => v > 0.6 ? "#10b981" : v > 0.4 ? T.amber : T.rose;

  return (
    <div>
      <div style={{ padding:bp==="mobile"?"0 1.25rem":"0" }}>
        <PageHeader label="Dashboard" title="National Emotional Pulse"
          live={hasData}
          subtitle="Real-time aggregated data from anonymous submissions across Philippine cities and municipalities." />
      </div>

      {/* Period selector */}
      <div style={{ padding:bp==="mobile"?"0 1.25rem 1.25rem":"0 0 1.25rem",
        display:"flex", gap:"0.25rem" }}>
        {["7d","30d","90d"].map(t => (
          <button key={t} onClick={() => setPeriod(t)}
            style={{ padding:"0.28rem 0.65rem", fontFamily:"DM Mono", fontSize:"0.56rem",
              letterSpacing:"0.06em", border:`1px solid ${period===t?T.amber:T.border}`,
              background:period===t?`${T.amber}15`:"none",
              color:period===t?T.amber:T.muted, cursor:"pointer", transition:"all 0.2s" }}>
            {t.toUpperCase()}
          </button>
        ))}
      </div>

      {/* Metrics */}
      <div ref={ref} style={{ display:"grid",
        gridTemplateColumns:bp==="mobile"?"1fr 1fr":bp==="tablet"?"1fr 1fr":"repeat(4,1fr)",
        border:`1px solid ${T.border}`, borderBottom:"none" }}>
        {[
          { label:"Emotional Stability", value:national?.esi, desc:"National ESI",
            color:national?.esi ? esiColor(national.esi) : T.muted,
            fill:(national?.esi||0)*100 },
          { label:"Hope / Despair Ratio", value:national?.hdr, desc:"National HDR",
            color:national?.hdr>1?T.teal:T.rose, fill:Math.min((national?.hdr||0)/2*100,100) },
          { label:"Dominant Emotion", value:national?.dominant_emotion
              ? (EMOTION_MAP[national.dominant_emotion]?.emoji + " " + national.dominant_emotion)
              : null,
            desc:"This week", color:EMOTION_MAP[national?.dominant_emotion]?.hex||T.muted, fill:60 },
          { label:"Total Submissions", value:national?.submission_count?.toLocaleString(),
            desc:`${national?.active_lgus||0} active LGUs`, color:T.text, fill:40 },
        ].map((m, i) => (
          <div key={i} style={{ padding:"1.5rem 1.25rem",
            borderRight:(bp==="desktop"&&i<3)||(bp!=="desktop"&&i%2===0)?`1px solid ${T.border}`:"none",
            borderBottom:`1px solid ${T.border}`,
            opacity:inView?1:0, transform:inView?"none":"translateY(12px)",
            transition:`all 0.5s ${i*0.08}s` }}>
            <div style={{ fontFamily:"DM Mono", fontSize:"0.52rem", letterSpacing:"0.14em",
              textTransform:"uppercase", color:T.muted, marginBottom:"0.5rem" }}>{m.label}</div>
            {loading
              ? <Skeleton height={32} width={80} style={{ marginBottom:4 }} />
              : <div style={{ fontFamily:"'Playfair Display',serif",
                  fontSize:bp==="mobile"?"1.6rem":"2rem", fontWeight:700,
                  color:m.color, lineHeight:1, textTransform:"capitalize" }}>
                  {m.value ?? "—"}
                </div>
            }
            <div style={{ fontFamily:"DM Mono", fontSize:"0.52rem",
              color:T.muted, marginTop:"0.3rem" }}>{m.desc}</div>
          </div>
        ))}
      </div>

      {/* LGU grid */}
      <div style={{ padding:bp==="mobile"?"2rem 1.25rem":"2rem 0 0" }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"1rem" }}>
          <div style={{ fontFamily:"DM Mono", fontSize:"0.54rem", letterSpacing:"0.16em",
            textTransform:"uppercase", color:T.muted }}>
            Active Cities · {period}
          </div>
          <button onClick={() => navigate("map")}
            style={{ background:"none", border:`1px solid ${T.border}`, color:T.muted,
              padding:"0.28rem 0.65rem", fontFamily:"DM Mono", fontSize:"0.52rem",
              letterSpacing:"0.08em", cursor:"pointer", transition:"all 0.2s" }}
            onMouseEnter={e=>{e.currentTarget.style.borderColor=T.amber;e.currentTarget.style.color=T.amber}}
            onMouseLeave={e=>{e.currentTarget.style.borderColor=T.border;e.currentTarget.style.color=T.muted}}>
            View Map →
          </button>
        </div>

        {loading ? (
          <div style={{ display:"grid",
            gridTemplateColumns:bp==="mobile"?"1fr":bp==="tablet"?"1fr 1fr":"repeat(3,1fr)",
            gap:1, background:T.border, border:`1px solid ${T.border}` }}>
            {[1,2,3].map(i => (
              <div key={i} style={{ background:T.surface, padding:"1.1rem" }}>
                <Skeleton height={12} width={80} style={{ marginBottom:8 }} />
                <Skeleton height={20} width={120} style={{ marginBottom:8 }} />
                <Skeleton height={10} width={60} />
              </div>
            ))}
          </div>
        ) : lgus.length === 0 ? (
          <EmptyState icon="◉" title="No cities on the map yet"
            body={`Cities appear once they reach 50 submissions. Be the first to submit from your city.`}
            cta="Submit Your Feeling" onCta={() => navigate("home")} />
        ) : (
          <div style={{ display:"grid",
            gridTemplateColumns:bp==="mobile"?"1fr":bp==="tablet"?"1fr 1fr":"repeat(3,1fr)",
            gap:1, background:T.border, border:`1px solid ${T.border}` }}>
            {lgus.map(a => {
              const dist = a.emotion_dist || {};
              const dominant = a.dominant_emotion;
              const em = EMOTION_MAP[dominant];
              const vc = a.velocity > 0 ? "#10b981" : a.velocity < 0 ? T.rose : T.muted;
              return (
                <div key={a.id}
                  style={{ background:T.surface, padding:"1.1rem", position:"relative",
                    overflow:"hidden", cursor:"pointer", transition:"background 0.2s" }}
                  onClick={() => navigate("map")}
                  onMouseEnter={e=>e.currentTarget.style.background=T.surface2}
                  onMouseLeave={e=>e.currentTarget.style.background=T.surface}>
                  <div style={{ position:"absolute", bottom:0, left:0, right:0,
                    height:2, background:em?.hex||T.muted }} />
                  <div style={{ fontFamily:"DM Mono", fontSize:"0.5rem", letterSpacing:"0.1em",
                    textTransform:"uppercase", color:T.muted, marginBottom:"0.2rem" }}>
                    {a.lgus?.name}
                  </div>
                  <div style={{ fontFamily:"'Playfair Display',serif", fontSize:"0.9rem",
                    fontWeight:700, color:em?.hex||T.amber, marginBottom:"0.1rem",
                    textTransform:"capitalize" }}>
                    {em?.emoji} {dominant}
                  </div>
                  <div style={{ fontFamily:"DM Mono", fontSize:"0.54rem", color:T.muted }}>
                    {Math.round((dist[dominant]||0)*100)}% dominant
                  </div>
                  <div style={{ display:"flex", alignItems:"center", gap:"0.4rem",
                    marginTop:"0.4rem", paddingTop:"0.4rem",
                    borderTop:`1px solid ${T.border}`, fontFamily:"DM Mono", fontSize:"0.5rem" }}>
                    <span style={{ color:vc }}>
                      {a.velocity > 0 ? "↑" : a.velocity < 0 ? "↓" : "→"}
                    </span>
                    <span style={{ color:esiColor(a.esi) }}>ESI {a.esi}</span>
                    <span style={{ color:T.muted, marginLeft:"auto" }}>
                      {a.submission_count?.toLocaleString()}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── PAGE: MAP ────────────────────────────────────────────────────────────────
function MapPage({ openModal }) {
  const bp = useBreakpoint();
  const [lgus, setLgus]         = useState([]);
  const [loading, setLoading]   = useState(true);
  const [period, setPeriod]     = useState("7d");
  const [selected, setSelected] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [ref, inView] = useInView(0.05);

  useEffect(() => {
    setLoading(true);
    getLGUAggregations(period)
      .then(data => { setLgus(data); if (data.length > 0) setSelected(data[0]); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [period]);

  const handleSelect = (lgu) => {
    setSelected(lgu);
    if (bp !== "desktop") setSidebarOpen(true);
  };

  const SidebarContent = () => {
    if (!selected) return (
      <div style={{ padding:"2rem 1.25rem" }}>
        <EmptyState icon="◉" title="Select a city" body="Click any active city on the map to explore its emotional data." />
      </div>
    );
    const dist = selected.emotion_dist || {};
    const distEntries = Object.entries(dist)
      .map(([key, pct]) => ({ key, pct: Math.round(pct*100), ...EMOTION_MAP[key] }))
      .sort((a,b) => b.pct - a.pct);
    const dominant = selected.dominant_emotion;
    const em = EMOTION_MAP[dominant];

    return (
      <div>
        <div style={{ padding:"1.25rem", borderBottom:`1px solid ${T.border}` }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:"0.15rem" }}>
            <div style={{ fontFamily:"'Playfair Display',serif", fontSize:"1.3rem", fontWeight:700 }}>
              {selected.lgus?.name}
            </div>
            {bp !== "desktop" && (
              <button onClick={()=>setSidebarOpen(false)}
                style={{ background:"none", border:`1px solid ${T.border}`, color:T.muted,
                  padding:"0.25rem 0.5rem", fontFamily:"DM Mono", fontSize:"0.5rem", cursor:"pointer" }}>✕</button>
            )}
          </div>
          <div style={{ fontFamily:"DM Mono", fontSize:"0.54rem", color:T.muted, marginBottom:"0.85rem" }}>
            {selected.submission_count?.toLocaleString()} submissions · {period}
          </div>
          {em && (
            <div style={{ background:`${em.hex}10`, border:`1px solid ${em.hex}30`,
              padding:"0.5rem 0.65rem", marginBottom:"0.85rem",
              fontFamily:"DM Mono", fontSize:"0.56rem", color:em.hex,
              textTransform:"capitalize" }}>
              ◈ Dominant: {em.emoji} {dominant} · {Math.round((dist[dominant]||0)*100)}%
            </div>
          )}
          <div style={{ display:"flex", flexDirection:"column", gap:"0.5rem" }}>
            {distEntries.map((e, i) => (
              <EmotionBar key={e.key} name={e.name||e.key} pct={e.pct}
                hex={e.hex||T.muted} inView={inView} delay={i*60} />
            ))}
          </div>
        </div>
        <div style={{ padding:"1rem 1.25rem", display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0.5rem" }}>
          <ScoreCard label="ESI" value={selected.esi} desc={selected.esi>0.6?"Stable":selected.esi>0.4?"Moderate":"Turbulent"}
            color={selected.esi>0.6?"#10b981":selected.esi>0.4?T.amber:T.rose} fill={(selected.esi||0)*100} />
          <ScoreCard label="HDR" value={selected.hdr} desc={selected.hdr>1?"Hope-leaning":"Despair-leaning"}
            color={selected.hdr>1?T.teal:T.rose} fill={Math.min((selected.hdr||0)/2*100,100)} />
          <ScoreCard label="Velocity" value={selected.velocity!==null?`${selected.velocity>0?"+":""}${selected.velocity}`:"—"}
            desc="Rate of change" color={selected.velocity>0?"#10b981":selected.velocity<0?T.rose:T.muted}
            fill={Math.abs(selected.velocity||0)*300} />
          <ScoreCard label="Submissions" value={selected.submission_count?.toLocaleString()}
            desc={`${period} window`} color={T.text} fill={40} />
        </div>
      </div>
    );
  };

  return (
    <div>
      <div style={{ padding:bp==="mobile"?"0 1.25rem":"0" }}>
        <PageHeader label="Emotional Heatmap" title="Cities of Feeling"
          live={lgus.length > 0}
          subtitle="Each city appears once it reaches 50 submissions. Click to explore emotional composition and stability data." />
      </div>

      <div style={{ padding:bp==="mobile"?"0 1.25rem 1rem":"0 0 1rem",
        display:"flex", alignItems:"center", gap:"0.5rem", flexWrap:"wrap" }}>
        {["7d","30d","90d"].map(t => (
          <button key={t} onClick={() => setPeriod(t)}
            style={{ padding:"0.28rem 0.65rem", fontFamily:"DM Mono", fontSize:"0.56rem",
              letterSpacing:"0.06em", border:`1px solid ${period===t?T.amber:T.border}`,
              background:period===t?`${T.amber}15`:"none",
              color:period===t?T.amber:T.muted, cursor:"pointer", transition:"all 0.2s" }}>
            {t.toUpperCase()}
          </button>
        ))}
        {lgus.length > 0 && bp !== "desktop" && lgus.map(a => {
          const em = EMOTION_MAP[a.dominant_emotion];
          return (
            <button key={a.id} onClick={() => handleSelect(a)}
              style={{ padding:"0.25rem 0.6rem", fontFamily:"DM Mono", fontSize:"0.52rem",
                border:`1px solid ${selected?.id===a.id?(em?.hex||T.amber):T.border}`,
                background:selected?.id===a.id?`${em?.hex||T.amber}15`:"none",
                color:selected?.id===a.id?(em?.hex||T.amber):T.muted,
                cursor:"pointer", transition:"all 0.2s" }}>
              {a.lgus?.name}
            </button>
          );
        })}
      </div>

      {bp !== "desktop" && sidebarOpen && (
        <div style={{ position:"fixed", inset:0, zIndex:210,
          background:"rgba(0,0,0,0.75)", backdropFilter:"blur(4px)" }}
          onClick={()=>setSidebarOpen(false)}>
          <div style={{ position:"absolute", right:0, top:0, bottom:0,
            width:"min(400px,92vw)", background:T.surface,
            borderLeft:`1px solid ${T.border}`, overflowY:"auto" }}
            onClick={e=>e.stopPropagation()}>
            <SidebarContent />
          </div>
        </div>
      )}

      <div ref={ref} style={{ display:bp==="desktop"?"grid":"block",
        gridTemplateColumns:"1fr 360px", border:`1px solid ${T.border}`, minHeight:480 }}>
        <div style={{ borderRight:bp==="desktop"?`1px solid ${T.border}`:"none",
          display:"flex", alignItems:"center", justifyContent:"center",
          padding:bp==="mobile"?"1.5rem 1rem":"2rem" }}>
          {loading ? (
            <div style={{ textAlign:"center" }}>
              <Skeleton height={300} width={240} />
              <div style={{ fontFamily:"DM Mono", fontSize:"0.56rem",
                color:T.muted, marginTop:"1rem" }}>Loading map data...</div>
            </div>
          ) : lgus.length === 0 ? (
            <EmptyState icon="◉" title="Map is waiting"
              body="Cities appear on the map once they reach 50 anonymous submissions. Submit from your city to help build the index."
              cta="Submit Your Feeling" onCta={openModal} />
          ) : (
            <div>
              <svg viewBox="0 0 300 500"
                style={{ width:"100%", maxWidth:bp==="mobile"?240:320,
                  filter:"drop-shadow(0 0 28px rgba(245,166,35,0.06))" }}>
                {lgus.map(a => {
                  const em = EMOTION_MAP[a.dominant_emotion];
                  const isSelected = selected?.id === a.id;
                  const lat = a.lgus?.lat;
                  const lng = a.lgus?.lng;
                  if (!lat || !lng) return null;
                  // Map Philippines lat/lng to SVG coordinates
                  // Philippines roughly: lat 4.5–21.5, lng 116–127
                  const x = ((lng - 116) / (127 - 116)) * 260 + 20;
                  const y = ((21.5 - lat) / (21.5 - 4.5)) * 460 + 20;
                  return (
                    <g key={a.id} onClick={() => handleSelect(a)} style={{ cursor:"pointer" }}>
                      <circle cx={x} cy={y} r={isSelected?14:10}
                        fill={em?.hex||T.amber} opacity={0.15}
                        style={{ transition:"all 0.3s" }} />
                      <circle cx={x} cy={y} r={isSelected?6:4}
                        fill={em?.hex||T.amber} opacity={isSelected?1:0.85}
                        stroke={isSelected?"#fff":"none"} strokeWidth={isSelected?1:0}
                        style={{ transition:"all 0.3s",
                          filter:isSelected?`drop-shadow(0 0 6px ${em?.hex||T.amber})`:"none" }} />
                      {isSelected && (
                        <text x={x+10} y={y+3} fill="rgba(255,255,255,0.7)"
                          fontSize="7" fontFamily="DM Mono">{a.lgus?.name}</text>
                      )}
                    </g>
                  );
                })}
              </svg>
              <div style={{ fontFamily:"DM Mono", fontSize:"0.5rem", color:T.muted,
                textAlign:"center", marginTop:"0.5rem" }}>
                {lgus.length} active {lgus.length === 1 ? "LGU" : "LGUs"} · Click to explore
              </div>
            </div>
          )}
        </div>
        {bp === "desktop" && (
          <div style={{ overflowY:"auto", maxHeight:600 }}>
            <SidebarContent />
          </div>
        )}
      </div>
    </div>
  );
}

// ─── PAGE: TRENDS ─────────────────────────────────────────────────────────────
function TrendsPage() {
  const bp = useBreakpoint();
  const [lgus, setLgus]       = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getLGUAggregations("7d")
      .then(data => { setLgus(data); if (data.length > 0) setSelected(data[0]); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const dist = selected?.emotion_dist || {};
  const distEntries = Object.entries(dist)
    .map(([key, pct]) => ({ key, pct: Math.round(pct*100), ...EMOTION_MAP[key] }))
    .sort((a,b) => b.pct - a.pct);

  const [ref, inView] = useInView(0.05);

  return (
    <div>
      <div style={{ padding:bp==="mobile"?"0 1.25rem":"0" }}>
        <PageHeader label="Emotional Velocity" title="How Fast Feelings Shift"
          live={lgus.length > 0}
          subtitle="Velocity tracks the rate of emotional change. A city moving from grief to hope in 7 days tells a different story than one taking 90." />
      </div>

      {loading ? (
        <div style={{ padding:bp==="mobile"?"0 1.25rem":"0" }}>
          <Skeleton height={200} />
        </div>
      ) : lgus.length === 0 ? (
        <div style={{ padding:bp==="mobile"?"0 1.25rem":"0" }}>
          <EmptyState icon="↗" title="No trend data yet"
            body="Trend analysis appears once cities start accumulating submissions. Velocity is computed daily from real submission data." />
        </div>
      ) : (
        <div ref={ref} style={{ display:"grid",
          gridTemplateColumns:bp==="desktop"?"1fr 1fr":"1fr",
          gap:bp==="desktop"?"3rem":"2rem",
          padding:bp==="mobile"?"0 1.25rem":"0" }}>
          <div>
            <div style={{ fontFamily:"DM Mono", fontSize:"0.54rem", letterSpacing:"0.14em",
              textTransform:"uppercase", color:T.muted, marginBottom:"0.75rem" }}>
              Select City
            </div>
            <div style={{ display:"flex", flexWrap:"wrap", gap:"0.35rem", marginBottom:"1.5rem" }}>
              {lgus.map(a => {
                const vc = a.velocity > 0 ? "#10b981" : a.velocity < 0 ? T.rose : T.muted;
                return (
                  <button key={a.id} onClick={() => setSelected(a)}
                    style={{ padding:"0.35rem 0.75rem", fontFamily:"DM Mono", fontSize:"0.56rem",
                      letterSpacing:"0.06em",
                      border:`1px solid ${selected?.id===a.id?T.amber:T.border}`,
                      background:selected?.id===a.id?`${T.amber}15`:"none",
                      color:selected?.id===a.id?T.amber:T.muted,
                      cursor:"pointer", transition:"all 0.2s",
                      display:"flex", alignItems:"center", gap:"0.35rem" }}>
                    <span style={{ color:vc }}>
                      {a.velocity > 0 ? "↑" : a.velocity < 0 ? "↓" : "→"}
                    </span>
                    {a.lgus?.name}
                  </button>
                );
              })}
            </div>

            {selected && (
              <div style={{ background:T.surface, border:`1px solid ${T.border}`, padding:"1.25rem" }}>
                <div style={{ fontFamily:"DM Mono", fontSize:"0.52rem", letterSpacing:"0.12em",
                  textTransform:"uppercase", color:T.muted, marginBottom:"0.75rem" }}>
                  Emotion Distribution · {selected.lgus?.name}
                </div>
                <div style={{ display:"flex", flexDirection:"column", gap:"0.5rem" }}>
                  {distEntries.map((e, i) => (
                    <EmotionBar key={e.key} name={e.name||e.key} pct={e.pct}
                      hex={e.hex||T.muted} inView={inView} delay={i*60} />
                  ))}
                </div>
              </div>
            )}
          </div>

          {selected && (
            <div>
              <div style={{ fontFamily:"DM Mono", fontSize:"0.54rem", letterSpacing:"0.14em",
                textTransform:"uppercase", color:T.muted, marginBottom:"0.75rem" }}>
                Metrics · {selected.lgus?.name}
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0.6rem", marginBottom:"1.25rem" }}>
                <ScoreCard label="ESI" value={selected.esi}
                  desc={selected.esi>0.6?"Stable":selected.esi>0.4?"Moderate":"Turbulent"}
                  color={selected.esi>0.6?"#10b981":selected.esi>0.4?T.amber:T.rose}
                  fill={(selected.esi||0)*100} />
                <ScoreCard label="HDR" value={selected.hdr}
                  desc={selected.hdr>1?"Hope-leaning":"Despair-leaning"}
                  color={selected.hdr>1?T.teal:T.rose}
                  fill={Math.min((selected.hdr||0)/2*100,100)} />
                <ScoreCard label="Velocity" value={selected.velocity!==null?`${selected.velocity>0?"+":""}${selected.velocity}`:"—"}
                  desc="7-day rate of change"
                  color={selected.velocity>0?"#10b981":selected.velocity<0?T.rose:T.muted}
                  fill={Math.abs(selected.velocity||0)*300} />
                <ScoreCard label="Submissions" value={selected.submission_count?.toLocaleString()}
                  desc="7-day window" color={T.text} fill={40} />
              </div>

              <div style={{ padding:"1rem", border:`1px solid ${T.border}`, background:T.bg }}>
                <div style={{ fontFamily:"DM Mono", fontSize:"0.52rem", letterSpacing:"0.12em",
                  textTransform:"uppercase", color:T.muted, marginBottom:"0.4rem" }}>
                  Velocity Reading
                </div>
                <p style={{ fontFamily:"'Playfair Display',serif", fontStyle:"italic",
                  fontSize:"0.9rem", lineHeight:1.6, color:T.text }}>
                  {selected.lgus?.name} is {
                    selected.velocity > 0.1 ? "rapidly stabilizing — emotional diversity increasing." :
                    selected.velocity < -0.1 ? "narrowing — one emotion starting to dominate." :
                    "holding steady — no significant emotional shift this week."
                  }
                </p>
                <div style={{ fontFamily:"DM Mono", fontSize:"0.5rem", color:T.muted, marginTop:"0.3rem" }}>
                  Computed from real submissions · Week {national?.week_number || "—"}, {new Date().getFullYear()}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* All cities comparison */}
      {lgus.length > 1 && (
        <div style={{ padding:bp==="mobile"?"2rem 1.25rem 0":"2.5rem 0 0" }}>
          <div style={{ fontFamily:"DM Mono", fontSize:"0.54rem", letterSpacing:"0.16em",
            textTransform:"uppercase", color:T.muted, marginBottom:"1rem" }}>
            All Active Cities · ESI Comparison
          </div>
          <div style={{ border:`1px solid ${T.border}` }}>
            {lgus.map((a, i) => {
              const em = EMOTION_MAP[a.dominant_emotion];
              const vc = a.velocity > 0 ? "#10b981" : a.velocity < 0 ? T.rose : T.muted;
              const esiColor = a.esi>0.6?"#10b981":a.esi>0.4?T.amber:T.rose;
              return (
                <div key={a.id} style={{ display:"grid",
                  gridTemplateColumns:"140px 1fr 60px", alignItems:"center",
                  gap:"1rem", padding:"0.85rem 1.1rem",
                  borderBottom:i<lgus.length-1?`1px solid ${T.border}`:"none",
                  background:selected?.id===a.id?T.surface2:"none",
                  cursor:"pointer", transition:"background 0.2s" }}
                  onClick={() => setSelected(a)}>
                  <div>
                    <div style={{ fontFamily:"DM Mono", fontSize:"0.54rem",
                      color:selected?.id===a.id?T.amber:T.text }}>{a.lgus?.name}</div>
                    <div style={{ fontFamily:"DM Mono", fontSize:"0.48rem",
                      color:vc, textTransform:"capitalize" }}>
                      {a.velocity > 0 ? "↑" : a.velocity < 0 ? "↓" : "→"} {a.dominant_emotion}
                    </div>
                  </div>
                  <div style={{ height:4, background:"rgba(255,255,255,0.05)",
                    borderRadius:2, position:"relative" }}>
                    <div style={{ position:"absolute", top:0, left:0, bottom:0,
                      width:`${(a.esi||0)*100}%`, background:esiColor,
                      borderRadius:2, transition:"width 1s" }} />
                  </div>
                  <div style={{ fontFamily:"DM Mono", fontSize:"0.6rem",
                    color:esiColor, textAlign:"right",
                    fontVariantNumeric:"tabular-nums" }}>{a.esi}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── PAGE: SEASONAL (Static — no live data needed) ────────────────────────────
const SEASONAL = [
  { month:"Jan", dominant:"Determination", hex:"#3b82f6", note:"New year resolve" },
  { month:"Feb", dominant:"Longing",       hex:"#6366f1", note:"Valentine & OFW separation" },
  { month:"Mar", dominant:"Anxiety",       hex:"#f59e0b", note:"Summer heat & transition" },
  { month:"Apr", dominant:"Relief",        hex:"#10b981", note:"Holy Week stillness" },
  { month:"May", dominant:"Hope",          hex:"#2dd4bf", note:"Election anticipation" },
  { month:"Jun", dominant:"Anxiety",       hex:"#f59e0b", note:"Typhoon season begins" },
  { month:"Jul", dominant:"Grief",         hex:"#8b5cf6", note:"Mid-year exhaustion" },
  { month:"Aug", dominant:"Anger",         hex:"#ef4444", note:"Political frustration" },
  { month:"Sep", dominant:"Longing",       hex:"#6366f1", note:"BER months, OFW season" },
  { month:"Oct", dominant:"Grief",         hex:"#8b5cf6", note:"Undas, loss & memory" },
  { month:"Nov", dominant:"Longing",       hex:"#6366f1", note:"Undas & Christmas longing" },
  { month:"Dec", dominant:"Hope",          hex:"#2dd4bf", note:"Christmas & family reunion" },
];

function SeasonalPage() {
  const bp = useBreakpoint();
  const [ref, inView] = useInView(0.05);
  const [hovered, setHovered] = useState(null);
  const [selected, setSelected] = useState(null);
  const currentMonth = new Date().getMonth();
  const active = selected !== null ? selected : hovered;
  const cols = bp==="mobile"?"repeat(4,1fr)":bp==="tablet"?"repeat(6,1fr)":"repeat(12,1fr)";

  return (
    <div>
      <div style={{ padding:bp==="mobile"?"0 1.25rem":"0" }}>
        <PageHeader label="Seasonal Fingerprint"
          title="The Philippines Has an Emotional Calendar."
          subtitle="These baselines are built from cultural and historical patterns. As PEI collects real data across full calendar years, this page will update to reflect actual seasonal emotion data." />
      </div>

      <div ref={ref} style={{ padding:bp==="mobile"?"0 1.25rem":"0" }}>
        <div style={{ display:"grid", gridTemplateColumns:cols, gap:1,
          background:T.border, border:`1px solid ${T.border}` }}>
          {SEASONAL.map((s, i) => {
            const isNow = i === currentMonth;
            const isActive = active === i;
            return (
              <div key={s.month}
                style={{ background:isNow?`${s.hex}22`:isActive?`${s.hex}15`:T.surface,
                  padding:bp==="mobile"?"0.85rem 0.3rem":"1.25rem 0.4rem",
                  textAlign:"center", cursor:"pointer", transition:"all 0.2s",
                  position:"relative", outline:isNow?`1px solid ${s.hex}`:"none",
                  opacity:inView?1:0, transform:inView?"none":"translateY(14px)",
                  transitionDelay:`${i*0.04}s` }}
                onMouseEnter={() => setHovered(i)}
                onMouseLeave={() => setHovered(null)}
                onClick={() => setSelected(selected===i?null:i)}>
                {isNow && (
                  <div style={{ position:"absolute", top:3, left:"50%",
                    transform:"translateX(-50%)", fontFamily:"DM Mono",
                    fontSize:"0.4rem", color:s.hex, letterSpacing:"0.08em" }}>NOW</div>
                )}
                <div style={{ fontFamily:"DM Mono", fontSize:"0.5rem", color:T.muted,
                  marginBottom:"0.5rem", marginTop:isNow?"0.5rem":0 }}>{s.month}</div>
                <div style={{ fontSize:"1.2rem", marginBottom:"0.4rem" }}>
                  {EMOTIONS.find(e=>e.name===s.dominant)?.emoji||"●"}
                </div>
                <div style={{ fontFamily:"DM Mono", fontSize:"0.44rem", color:s.hex,
                  letterSpacing:"0.06em", writingMode:"vertical-rl",
                  textOrientation:"mixed", transform:"rotate(180deg)",
                  margin:"0 auto", height:50, display:"flex", alignItems:"center" }}>
                  {s.dominant}
                </div>
              </div>
            );
          })}
        </div>

        {active !== null && (
          <div style={{ marginTop:1, background:T.surface, border:`1px solid ${T.border}`,
            borderTop:"none", padding:"1.5rem",
            display:"grid", gridTemplateColumns:bp==="mobile"?"1fr":bp==="tablet"?"1fr 1fr":"1fr 1fr 1fr",
            gap:"1.5rem" }}>
            <div>
              <div style={{ fontFamily:"DM Mono", fontSize:"0.52rem", letterSpacing:"0.12em",
                textTransform:"uppercase", color:T.muted, marginBottom:"0.4rem" }}>
                {SEASONAL[active].month} · Dominant Emotion
              </div>
              <div style={{ fontFamily:"'Playfair Display',serif", fontSize:"2rem",
                fontWeight:900, color:SEASONAL[active].hex, lineHeight:1 }}>
                {SEASONAL[active].dominant}
              </div>
              <div style={{ fontFamily:"DM Mono", fontSize:"0.56rem",
                color:T.muted, marginTop:"0.3rem" }}>{SEASONAL[active].note}</div>
            </div>
            <div>
              <div style={{ fontFamily:"DM Mono", fontSize:"0.52rem", letterSpacing:"0.12em",
                textTransform:"uppercase", color:T.muted, marginBottom:"0.4rem" }}>Cultural Context</div>
              <p style={{ fontFamily:"DM Mono", fontSize:"0.6rem", color:T.muted, lineHeight:1.7 }}>
                {active===0&&"January carries the energy of new beginnings — collective resolve to break patterns, start anew, face the year with intention."}
                {active===1&&"February intensifies longing — Valentine's Day merges with OFW separation anxiety. Distance makes the heart ache louder."}
                {active===2&&"The heat arrives. School transitions, career pivots, and summer uncertainty create a national undercurrent of anxiety."}
                {active===3&&"Holy Week brings stillness. Pilgrimage. Reflection. The country collectively exhales in an unusual, peaceful pause."}
                {active===4&&"Election season creates a paradox — hope and anxiety in tension. The future feels both possible and precarious."}
                {active===5&&"The first typhoons arrive. Anxiety becomes practical, immediate, survival-oriented rather than existential."}
                {active===6&&"Mid-year exhaustion. The initial energy of January has fully dissipated. A heavy collective tiredness sets in."}
                {active===7&&"Political grievances accumulate. Infrastructure failures, rising costs, broken promises — anger crystallizes."}
                {active===8&&"The BER months signal Christmas season, and with it, the longing for family, for those abroad, for simpler times."}
                {active===9&&"Undas. The Philippines stops to mourn collectively — ancestors, recent losses, national tragedies remembered."}
                {active===10&&"Longing peaks as OFWs prepare Christmas returns, families anticipate reunions, and December feels near but not yet."}
                {active===11&&"Christmas arrives. Despite everything, hope. The Filipino capacity for joy under pressure reaches its annual zenith."}
              </p>
            </div>
            <div>
              <div style={{ fontFamily:"DM Mono", fontSize:"0.52rem", letterSpacing:"0.12em",
                textTransform:"uppercase", color:T.muted, marginBottom:"0.4rem" }}>
                Baseline Source
              </div>
              <p style={{ fontFamily:"DM Mono", fontSize:"0.56rem", color:T.muted, lineHeight:1.7 }}>
                These patterns are derived from cultural and historical research.
                As PEI collects real submissions across full calendar years, actual data will
                replace these baselines month by month.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── PAGE: ETHICS ─────────────────────────────────────────────────────────────
function EthicsPage() {
  const bp = useBreakpoint();
  const [ref, inView] = useInView();
  const principles = [
    { icon:"◎", title:"No raw text exposed", body:"Submissions are processed for emotional signal only. Raw text is never stored publicly or shown individually. Words dissolve; the pattern survives.", color:T.teal },
    { icon:"◌", title:"Metadata stripped", body:"No IP address, no device fingerprint, no session ID stored permanently. Daily rotating salt means hashes become unrecoverable after midnight.", color:T.amber },
    { icon:"◈", title:"50-entry minimum", body:"A city only appears on the map when it reaches 50 submissions. No outlier data, no exposure of isolated individuals.", color:"#a78bfa" },
    { icon:"◉", title:"No individual visualization", body:"All outputs are aggregated at city level or above. The smallest unit of display is a community, never a person.", color:"#fb923c" },
    { icon:"◷", title:"Pattern survives. Person does not.", body:"The system retains emotional signal. What remains is the shape of collective feeling — never the individual behind it.", color:"#10b981" },
    { icon:"◰", title:"Pressure systems, not surveillance", body:"Like weather, not CCTV. The index shows where emotional fronts are building, not who is standing in them.", color:T.rose },
  ];

  return (
    <div>
      <div style={{ padding:bp==="mobile"?"0 1.25rem":"0" }}>
        <PageHeader label="Ethical Framework" title="We Built the Ethics First. The Product Second." />
      </div>
      <div ref={ref} style={{ display:"grid",
        gridTemplateColumns:bp==="mobile"?"1fr":bp==="tablet"?"1fr 1fr":"repeat(3,1fr)",
        gap:1, background:T.border, border:`1px solid ${T.border}` }}>
        {principles.map((p, i) => (
          <div key={i} style={{ background:T.bg, padding:"1.5rem",
            opacity:inView?1:0, transform:inView?"none":"translateY(16px)",
            transition:`all 0.5s ${i*0.08}s ease` }}>
            <div style={{ fontFamily:"'Playfair Display',serif", fontSize:"2rem",
              color:p.color, opacity:0.5, marginBottom:"0.5rem", lineHeight:1 }}>{p.icon}</div>
            <div style={{ fontFamily:"'Playfair Display',serif", fontSize:"0.95rem",
              fontWeight:700, marginBottom:"0.4rem" }}>{p.title}</div>
            <div style={{ fontFamily:"DM Mono", fontSize:"0.6rem",
              color:T.muted, lineHeight:1.7 }}>{p.body}</div>
          </div>
        ))}
      </div>

      <div style={{ padding:bp==="mobile"?"2rem 1.25rem 0":"2.5rem 0 0" }}>
        <blockquote style={{ fontFamily:"'Playfair Display',serif", fontStyle:"italic",
          fontSize:bp==="mobile"?"1.1rem":"1.5rem", lineHeight:1.5, letterSpacing:"-0.01em",
          borderLeft:`3px solid ${T.amber}`, paddingLeft:"1.25rem", margin:0,
          maxWidth:680 }}>
          "The Philippines is not a dataset to be exploited. It is a people to be witnessed.
          We built this to listen, not to sell the listening."
        </blockquote>
      </div>
    </div>
  );
}

// ─── PAGE: API ────────────────────────────────────────────────────────────────
function APIPage() {
  const bp = useBreakpoint();
  const [ref, inView] = useInView();
  const tiers = [
    { label:"Data API", icon:"⌘", target:"Universities · Media · Research Groups",
      desc:"Real-time access to aggregated emotional data via REST API. City-level, regional, and national endpoints.", price:"₱ 8,000 / mo", color:T.teal,
      features:["REST endpoints","All active LGU feeds","30-day historical","Webhooks","JSON + CSV export"] },
    { label:"Premium Dashboard", icon:"◈", target:"Journalists · Policy Teams · Analysts",
      desc:"Full trend history, exportable charts, deep analytics, custom date ranges, and city comparison tools.", price:"₱ 2,500 / mo", color:T.amber,
      features:["Unlimited date ranges","Correlation overlays","Custom comparison","Exportable charts","Priority support"] },
    { label:"Quarterly Reports", icon:"◉", target:"Corporations · Government · Foundations",
      desc:"Commissioned deep-dive reports. Q1–Q4 Emotional Climate Reports. Branded. Media-ready.", price:"Custom", color:"#a78bfa",
      features:["Quarterly PDF reports","Custom geographic scope","Media-ready graphics","Anomaly flagging","Dedicated analyst"] },
  ];

  return (
    <div>
      <div style={{ padding:bp==="mobile"?"0 1.25rem":"0" }}>
        <PageHeader label="Data Access & API" title="Insights, Not Individuals."
          subtitle="We monetize the aggregate signal — never the person who created it." />
      </div>
      <div ref={ref} style={{ display:"grid",
        gridTemplateColumns:bp==="mobile"?"1fr":bp==="tablet"?"1fr 1fr":"repeat(3,1fr)",
        gap:1, background:T.border, border:`1px solid ${T.border}` }}>
        {tiers.map((t, i) => (
          <div key={i} style={{ background:T.surface, padding:"1.75rem 1.4rem",
            position:"relative", overflow:"hidden",
            opacity:inView?1:0, transform:inView?"none":"translateY(20px)",
            transition:`all 0.6s ${i*0.12}s ease` }}>
            <div style={{ position:"absolute", top:0, left:0, right:0, height:2, background:t.color }} />
            <div style={{ fontFamily:"'Playfair Display',serif", fontSize:"1.6rem",
              color:t.color, opacity:0.3, marginBottom:"0.5rem", lineHeight:1 }}>{t.icon}</div>
            <div style={{ fontFamily:"DM Mono", fontSize:"0.54rem", letterSpacing:"0.14em",
              textTransform:"uppercase", color:t.color, marginBottom:"0.3rem" }}>{t.label}</div>
            <div style={{ fontFamily:"DM Mono", fontSize:"0.54rem", color:T.muted,
              marginBottom:"0.85rem", paddingBottom:"0.85rem",
              borderBottom:`1px solid ${T.border}` }}>{t.target}</div>
            <div style={{ fontFamily:"DM Mono", fontSize:"0.58rem", color:T.muted,
              lineHeight:1.7, marginBottom:"1.1rem" }}>{t.desc}</div>
            <div style={{ display:"flex", flexDirection:"column", gap:"0.35rem", marginBottom:"1.1rem" }}>
              {t.features.map(f => (
                <div key={f} style={{ display:"flex", alignItems:"center", gap:"0.5rem",
                  fontFamily:"DM Mono", fontSize:"0.56rem", color:T.muted }}>
                  <div style={{ width:5, height:5, borderRadius:"50%",
                    background:t.color, flexShrink:0 }} />
                  {f}
                </div>
              ))}
            </div>
            <div style={{ fontFamily:"'Playfair Display',serif", fontSize:"1.4rem",
              fontWeight:700, color:t.color, marginBottom:"0.75rem" }}>{t.price}</div>
            <button style={{ width:"100%", background:"none",
              border:`1px solid ${t.color}40`, color:t.color, padding:"0.6rem 0",
              fontFamily:"DM Mono", fontSize:"0.58rem", letterSpacing:"0.08em",
              textTransform:"uppercase", cursor:"pointer", transition:"all 0.2s" }}
              onMouseEnter={e=>e.currentTarget.style.background=`${t.color}12`}
              onMouseLeave={e=>e.currentTarget.style.background="none"}>
              Contact for Access →
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── FOOTER ───────────────────────────────────────────────────────────────────
function Footer({ navigate, openModal }) {
  const bp = useBreakpoint();
  return (
    <footer style={{ borderTop:`1px solid ${T.border}`,
      padding:`2.5rem ${bp==="mobile"?"1.25rem":"0"}`,
      background:T.surface, marginTop:"4rem" }}>
      <div style={{ display:"grid",
        gridTemplateColumns:bp==="mobile"?"1fr":bp==="tablet"?"1fr 1fr":"2fr 1fr 1fr",
        gap:bp==="mobile"?"2rem":"2.5rem", marginBottom:"2rem" }}>
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
        <div>
          <div style={{ fontFamily:"DM Mono", fontSize:"0.52rem", letterSpacing:"0.14em",
            textTransform:"uppercase", color:T.muted, marginBottom:"0.75rem" }}>Pages</div>
          {[{id:"dashboard",label:"Dashboard"},{id:"map",label:"City Map"},
            {id:"trends",label:"Trends"},{id:"seasonal",label:"Seasonal"},
            {id:"ethics",label:"Ethics"},{id:"api",label:"API"}].map(l => (
            <div key={l.id} onClick={() => navigate(l.id)}
              style={{ fontFamily:"DM Mono", fontSize:"0.58rem", color:T.muted,
                marginBottom:"0.4rem", cursor:"pointer", transition:"color 0.2s" }}
              onMouseEnter={e=>e.target.style.color=T.text}
              onMouseLeave={e=>e.target.style.color=T.muted}>{l.label}</div>
          ))}
        </div>
        <div>
          <div style={{ fontFamily:"DM Mono", fontSize:"0.52rem", letterSpacing:"0.14em",
            textTransform:"uppercase", color:T.muted, marginBottom:"0.75rem" }}>Legal</div>
          {["Privacy Policy","Anonymity Framework","Data Methodology","Research Access"].map(l => (
            <div key={l} style={{ fontFamily:"DM Mono", fontSize:"0.58rem",
              color:T.muted, marginBottom:"0.4rem", cursor:"pointer" }}>{l}</div>
          ))}
        </div>
      </div>
      <div style={{ borderTop:`1px solid ${T.border}`, paddingTop:"1.1rem",
        display:"flex", alignItems:"center", justifyContent:"space-between",
        flexWrap:"wrap", gap:"0.5rem",
        fontFamily:"DM Mono", fontSize:"0.5rem", color:T.muted }}>
        <span>© {new Date().getFullYear()} Philippines Emotional Index. All insights aggregated. No individuals exposed.</span>
        <span>Pattern survives. Person does not.</span>
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
  const currentPage = ["home","dashboard","map","trends","seasonal","ethics","api"].includes(page)
    ? page : "home";

  const pages = {
    home:      <HomePage navigate={navigate} openModal={openModal} />,
    dashboard: <DashboardPage navigate={navigate} />,
    map:       <MapPage openModal={openModal} />,
    trends:    <TrendsPage />,
    seasonal:  <SeasonalPage />,
    ethics:    <EthicsPage />,
    api:       <APIPage />,
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
