import { useState, useEffect, useMemo } from "react";
import { getNational, getLGUAggregations, getProvinceAggregations } from "../lib/supabase";
import { useT } from "../context/ThemeContext";
import { EMOTIONS, EMOTION_MAP } from "../constants/emotions";
import { useBreakpoint } from "../hooks/useBreakpoint";
import { useInView } from "../hooks/useInView";
import { PageHeader, Skeleton, EmptyState } from "../components/shared/ui/index";
import EmotionIcon from "../components/shared/EmotionIcon";
import PhilippinesMap from "../components/shared/PhilippinesMap";

// Demo data — shown when no real province data exists yet
// Province names must match normalized keys in phProvincePaths.js
const DEMO_LEADERS = {
  "cebu":           { hex:"#10B981", emotion:"Hope",          emotionKey:"hope",          pct:28, provinceName:"Cebu"           },
  "laguna":         { hex:"#34D399", emotion:"Relief",         emotionKey:"relief",         pct:24, provinceName:"Laguna"         },
  "davao del sur":  { hex:"#60A5FA", emotion:"Determination",  emotionKey:"determination",  pct:31, provinceName:"Davao del Sur"  },
  "benguet":        { hex:"#94A3B8", emotion:"Calm",           emotionKey:"calm",           pct:19, provinceName:"Benguet"        },
  "ilocos norte":   { hex:"#A78BFA", emotion:"Longing",        emotionKey:"longing",        pct:22, provinceName:"Ilocos Norte"   },
  "pampanga":       { hex:"#F472B6", emotion:"Regret",         emotionKey:"regret",         pct:17, provinceName:"Pampanga"       },
  "leyte":          { hex:"#FB923C", emotion:"Anxiety",        emotionKey:"anxiety",        pct:20, provinceName:"Leyte"          },
  "lanao del sur":  { hex:"#F87171", emotion:"Anger",          emotionKey:"anger",          pct:15, provinceName:"Lanao del Sur"  },
  "bukidnon":       { hex:"#818CF8", emotion:"Grief",          emotionKey:"grief",          pct:13, provinceName:"Bukidnon"       },
};


export default function DashboardPage({ navigate }) {
  const T   = useT();
  const bp  = useBreakpoint();
  const [ref, inView] = useInView();

  const [national,     setNational]     = useState(null);
  const [lgus,         setLgus]         = useState([]);
  const [provinceAggs, setProvinceAggs] = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [period,       setPeriod]       = useState("all");
  const [hoveredInfo,  setHoveredInfo]  = useState(null);

  // Compute top province per emotion for dashboard map
  const emotionLeaders = useMemo(() => {
    if (!provinceAggs.length) return null;
    const normalize = (s) => (s||"").toLowerCase().replace(/[^a-z0-9 ]/g,"").trim();
    const leaders = {};
    for (const em of EMOTIONS) {
      let best = null, bestPct = 0;
      for (const agg of provinceAggs) {
        const dist = agg.emotion_dist || {};
        const pct  = dist[em.key] || 0;
        if (pct > bestPct) { bestPct = pct; best = agg; }
      }
      if (best) {
        const key = normalize(best.provinces?.name || "");
        leaders[key] = {
          hex:          em.hex,
          emotion:      em.name,
          emotionKey:   em.key,
          pct:          Math.round(bestPct * 100),
          provinceName: best.provinces?.name,
        };
      }
    }
    return Object.keys(leaders).length ? leaders : null;
  }, [provinceAggs]);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      getNational(period),
      getLGUAggregations(period),
      getProvinceAggregations(period),
    ])
      .then(([nat, lguData, provData]) => {
        setNational(nat);
        setLgus(lguData);
        setProvinceAggs(provData);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [period]);

  const hasData  = national && national.submission_count > 0;
  const esiColor = v => v > 0.6 ? "#10b981" : v > 0.4 ? T.amber : T.rose;

  const nationalDist = national?.emotion_dist || {};
  const distEntries  = EMOTIONS
    .map(em => ({ ...em, pct: Math.round((nationalDist[em.key] || 0) * 100) }))
    .sort((a, b) => b.pct - a.pct)
    .filter(e => e.pct > 0);

  const PERIOD_LABELS = {
    "7d":  "Week 1 (Days 1–7)",
    "30d": "Month 1 (Days 1–30)",
    "90d": "Quarter 1 (Days 1–90)",
    "all": "All Time",
  };

  return (
    <div>
      <div style={{ padding:bp==="mobile"?"0 1.25rem":"0" }}>
        <PageHeader label="Dashboard" title="National Emotional Pulse" live={hasData}
          subtitle="Philippine Emotional Index — aggregated from anonymous submissions across all cities and municipalities." />
      </div>

      {/* Period selector */}
      <div style={{ padding:bp==="mobile"?"0 1.25rem 1.25rem":"0 0 1.25rem",
        display:"flex", gap:"0.25rem", flexWrap:"wrap" }}>
        {["7d","30d","90d","all"].map(t => (
          <button key={t} onClick={() => setPeriod(t)}
            style={{ padding:"0.28rem 0.65rem", fontFamily:"DM Mono", fontSize:"0.56rem",
              letterSpacing:"0.06em", border:`1px solid ${period===t?T.amber:T.border}`,
              background:period===t?`${T.amber}15`:"none",
              color:period===t?T.amber:T.muted, cursor:"pointer", transition:"all 0.2s" }}>
            {t === "all" ? "ALL TIME" : t.toUpperCase()}
          </button>
        ))}
        <span style={{ fontFamily:"DM Mono", fontSize:"0.5rem", color:T.muted,
          display:"flex", alignItems:"center", paddingLeft:"0.25rem" }}>
          {PERIOD_LABELS[period]}
        </span>
      </div>

      {/* Metric cards */}
      <div ref={ref} style={{ display:"grid",
        gridTemplateColumns:bp==="mobile"?"1fr 1fr":"repeat(4,1fr)",
        border:`1px solid ${T.border}`, borderBottom:"none" }}>
        {[
          { label:"Emotional Stability",  value:national?.esi,
            desc:"National ESI",
            color:national?.esi ? esiColor(national.esi) : T.muted },
          { label:"Hope / Despair Ratio", value:national?.hdr,
            desc:"National HDR",
            color:national?.hdr > 1 ? T.teal : T.rose },
          { label:"Dominant Emotion",     value:national?.dominant_emotion || null,
            desc:PERIOD_LABELS[period],
            color:EMOTION_MAP[national?.dominant_emotion]?.hex || T.muted },
          { label:"Total Submissions",    value:national?.submission_count?.toLocaleString(),
            desc:`${national?.active_lgus || 0} active LGUs`,
            color:T.text },
        ].map((m, i) => (
          <div key={i} style={{ padding:"1.5rem 1.25rem",
            borderRight:(bp!=="mobile"&&i<3)||(bp==="mobile"&&i%2===0)?`1px solid ${T.border}`:"none",
            borderBottom:`1px solid ${T.border}`,
            opacity:inView?1:0, transform:inView?"none":"translateY(12px)",
            transition:`all 0.5s ${i*0.08}s` }}>
            <div style={{ fontFamily:"DM Mono", fontSize:"0.52rem", letterSpacing:"0.14em",
              textTransform:"uppercase", color:T.muted, marginBottom:"0.5rem" }}>{m.label}</div>
            {loading
              ? <Skeleton height={32} width={80} />
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

      {/* Emotion distribution pulse bar */}
      {!loading && distEntries.length > 0 && (
        <div style={{ padding:bp==="mobile"?"1.25rem 1.25rem 0":"1.25rem 0 0" }}>
          <div style={{ fontFamily:"DM Mono", fontSize:"0.5rem", letterSpacing:"0.14em",
            textTransform:"uppercase", color:T.muted, marginBottom:"0.5rem" }}>
            National Emotion Distribution · {PERIOD_LABELS[period]}
          </div>
          <div style={{ display:"flex", height:6, gap:1, marginBottom:"0.6rem" }}>
            {distEntries.map(e => (
              <div key={e.key} style={{ flex:e.pct, background:e.hex, transition:"flex 0.8s ease" }}
                title={`${e.name}: ${e.pct}%`} />
            ))}
          </div>
          <div style={{ display:"flex", flexWrap:"wrap", gap:"0.75rem" }}>
            {distEntries.map(e => (
              <div key={e.key} style={{ display:"flex", alignItems:"center", gap:"0.3rem" }}>
                <div style={{ width:6, height:6, borderRadius:"50%", background:e.hex }} />
                <span style={{ fontFamily:"DM Mono", fontSize:"0.48rem",
                  color:T.muted, textTransform:"capitalize" }}>{e.name} {e.pct}%</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Emotion champions map */}
      <div style={{ marginTop:"1.5rem" }}>
        <div style={{ display:"flex", justifyContent:"space-between",
          alignItems:"center", marginBottom:"0.75rem" }}>
          <div>
            <p style={{ fontSize:"0.55rem", letterSpacing:"0.14em",
              textTransform:"uppercase", color:T.muted, marginBottom:2 }}>
              Emotional Geography
            </p>
            <p style={{ fontSize:"0.7rem", color:T.muted, lineHeight:1.5 }}>
              Top province for each emotion · {PERIOD_LABELS[period]}
            </p>
          </div>
          <button onClick={() => navigate("map")}
            style={{ background:"none", border:`1px solid ${T.border}`, color:T.muted,
              fontSize:"0.55rem", letterSpacing:"0.06em",
              padding:"0.25rem 0.6rem", cursor:"pointer" }}>
            Full map →
          </button>
        </div>

        <div style={{ display:"grid",
          gridTemplateColumns:bp==="mobile"?"1fr":"1fr 1fr",
          gap:"1.5rem", alignItems:"start" }}>

          {/* Read-only highlights map */}
          <div>
            {loading
              ? <Skeleton height={300} width="100%" />
              : <PhilippinesMap
                  provinceAggs={provinceAggs}
                  lgus={[]}
                  highlights={emotionLeaders || DEMO_LEADERS}
                  readOnly={true}
                  width={300}
                  T={T}
                />
            }
          </div>

          {/* Emotion leaders legend */}
          <div style={{ display:"flex", flexDirection:"column", gap:"0.5rem" }}>
            {loading ? <Skeleton height={200} width="100%" /> :
              (emotionLeaders || DEMO_LEADERS)
                ? EMOTIONS.map(em => {
                    // Find which province leads this emotion
                    const entry = Object.values(emotionLeaders)
                      .find(v => v.emotionKey === em.key);
                    return (
                      <div key={em.key}
                        style={{ display:"flex", alignItems:"center", gap:"0.6rem",
                          padding:"0.45rem 0",
                          borderBottom:`1px solid ${T.border}` }}>
                        <div style={{ width:8, height:8, borderRadius:"50%",
                          background:em.hex, flexShrink:0 }} />
                        <span style={{ fontSize:"0.7rem", fontWeight:500,
                          color:T.text, width:100, flexShrink:0,
                          textTransform:"capitalize" }}>{em.name}</span>
                        <span style={{ fontSize:"0.65rem", color:T.muted, flex:1 }}>
                          {entry ? entry.provinceName : "—"}
                        </span>
                        {entry && (
                          <span style={{ fontSize:"0.55rem", color:em.hex,
                            fontVariantNumeric:"tabular-nums", flexShrink:0 }}>
                            {entry.pct}%
                          </span>
                        )}
                      </div>
                    );
                  })
                : <p style={{ fontSize:"0.7rem", color:T.muted, lineHeight:1.6 }}>
                    No province data yet. Submit feelings to see the map come alive.
                  </p>
            }
          </div>
        </div>
      </div>
    </div>
  );
}
