import { useState, useEffect } from "react";
import { getNational } from "../lib/supabase";
import { T } from "../constants/tokens";
import { EMOTIONS, EMOTION_MAP } from "../constants/emotions";
import { useBreakpoint } from "../hooks/useBreakpoint";
import { DataBadge, Skeleton } from "../components/shared/ui/index";

export default function HomePage({ navigate, openModal }) {
  const bp = useBreakpoint();
  const [national, setNational]       = useState(null);
  const [loading, setLoading]         = useState(true);
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

  const dist     = national?.emotion_dist || {};
  const dominant = national?.dominant_emotion || null;
  const hasData  = national && national.submission_count > 0;

  const pages = [
    { id:"dashboard",   label:"Dashboard",   icon:"◈", desc:"National metrics, city snapshots, ESI & HDR live.",                   color:T.amber   },
    { id:"map",         label:"Map",         icon:"◉", desc:"Emotional heatmap across all Philippine LGUs.",                       color:T.teal    },
    { id:"trends",      label:"Trends",      icon:"↗", desc:"Velocity charts tracking how fast emotions shift.",                   color:"#a78bfa" },
    { id:"seasonal",    label:"Seasonal",    icon:"◷", desc:"12-month emotional fingerprint of the Philippines.",                  color:"#fb923c" },
    { id:"ethics",      label:"Ethics",      icon:"✓", desc:"How we protect anonymity and handle data responsibly.",               color:"#10b981" },
    { id:"methodology", label:"Methodology", icon:"◎", desc:"How ESI and HDR are calculated. What this data is and isn't.",       color:"#ec4899" },
  ];

  return (
    <div style={{ minHeight:"100vh", display:"flex", flexDirection:"column" }}>
      <section style={{ flex:1, display:"flex", flexDirection:"column", justifyContent:"center",
        padding:bp==="mobile"?"5rem 1.25rem 3rem":"5rem 2.5rem 3rem",
        position:"relative", overflow:"hidden" }}>
        <div style={{ position:"absolute", top:"50%", left:"50%",
          transform:"translate(-50%,-50%)", fontFamily:"'Playfair Display',serif",
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
                        style={{ flex: pct * barProgress, background: em?.hex || T.muted,
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
                        <div style={{ width:7, height:7, borderRadius:"50%", background:em?.hex || T.muted }} />
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
