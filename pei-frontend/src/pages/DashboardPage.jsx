import { useState, useEffect } from "react";
import { getNational, getLGUAggregations, getProvinceAggregations } from "../lib/supabase";
import { useT } from "../context/ThemeContext";
import { EMOTIONS, EMOTION_MAP } from "../constants/emotions";
import { useBreakpoint } from "../hooks/useBreakpoint";
import { useInView } from "../hooks/useInView";
import { PageHeader, Skeleton, EmptyState } from "../components/shared/ui/index";
import EmotionIcon from "../components/shared/EmotionIcon";
import PhilippinesMap from "../components/shared/PhilippinesMap";

export default function DashboardPage({ navigate }) {
  const T   = useT();
  const bp  = useBreakpoint();
  const [ref, inView] = useInView();

  const [national,     setNational]     = useState(null);
  const [lgus,         setLgus]         = useState([]);
  const [provinceAggs, setProvinceAggs] = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [period,       setPeriod]       = useState("all");
  const [hoveredInfo,  setHoveredInfo]  = useState(null); // { name, type, data }

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

      {/* Philippine Map section */}
      <div style={{ marginTop:"1.5rem", border:`1px solid ${T.border}` }}>
        <div style={{ padding:"0.85rem 1.1rem", borderBottom:`1px solid ${T.border}`,
          display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <div style={{ fontFamily:"DM Mono", fontSize:"0.5rem", letterSpacing:"0.14em",
            textTransform:"uppercase", color:T.muted }}>
            Emotional Heatmap · {PERIOD_LABELS[period]}
          </div>
          <button onClick={() => navigate("map")}
            style={{ background:"none", border:`1px solid ${T.border}`, color:T.muted,
              fontFamily:"DM Mono", fontSize:"0.5rem", letterSpacing:"0.06em",
              padding:"0.25rem 0.6rem", cursor:"pointer" }}>
            Full Map →
          </button>
        </div>

        <div style={{ display:"flex", flexDirection:bp==="mobile"?"column":"row" }}>
          {/* Map */}
          <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center",
            padding:"1.5rem",
            borderRight:bp!=="mobile"?`1px solid ${T.border}`:"none",
            borderBottom:bp==="mobile"?`1px solid ${T.border}`:"none" }}>
            {loading
              ? <Skeleton height={380} width={220} />
              : <PhilippinesMap
                  provinceAggs={provinceAggs}
                  lgus={lgus}
                  selected={hoveredInfo?.type === "lgu" ? hoveredInfo.data : null}
                  onSelectLgu={lgu => setHoveredInfo({ name:lgu.lgus?.name, type:"lgu", data:lgu })}
                  onSelectProvince={pc => setHoveredInfo({ name:pc.name, type:"province", data:pc })}
                  width={bp==="mobile"?260:300}
                  T={T}
                />
            }
          </div>

          {/* Info panel */}
          <div style={{ width:bp==="mobile"?"100%":210, padding:"1.1rem",
            display:"flex", flexDirection:"column", gap:"0.6rem", flexShrink:0 }}>
            {hoveredInfo ? (
              <>
                <div style={{ fontFamily:"'Playfair Display',serif",
                  fontSize:"0.95rem", fontWeight:700, lineHeight:1.2 }}>
                  {hoveredInfo.name}
                </div>
                <div style={{ fontFamily:"DM Mono", fontSize:"0.5rem", color:T.muted }}>
                  {hoveredInfo.type === "province" ? "Province" : "City / Municipality"} ·{" "}
                  {(hoveredInfo.data.submission_count || hoveredInfo.data.count || 0).toLocaleString()} submissions
                </div>
                {(() => {
                  const dominant = hoveredInfo.data.dominant_emotion || hoveredInfo.data.dominant;
                  const em = EMOTION_MAP[dominant];
                  const dist = hoveredInfo.data.emotion_dist || hoveredInfo.data.dist || {};
                  const entries = Object.entries(dist)
                    .map(([k,v]) => ({ ...EMOTION_MAP[k], key:k, pct:Math.round(v*100) }))
                    .sort((a,b) => b.pct - a.pct).slice(0,5);
                  return (
                    <>
                      {em && (
                        <div style={{ display:"flex", alignItems:"center", gap:"0.4rem",
                          background:`${em.hex}12`, border:`1px solid ${em.hex}25`,
                          padding:"0.4rem 0.5rem" }}>
                          <EmotionIcon icon={em.icon} color={em.hex} size={12} />
                          <span style={{ fontFamily:"DM Mono", fontSize:"0.5rem",
                            color:em.hex, textTransform:"capitalize" }}>
                            {dominant} · {Math.round((dist[dominant]||0)*100)}%
                          </span>
                        </div>
                      )}
                      <div style={{ fontFamily:"DM Mono", fontSize:"0.5rem", display:"flex", gap:"0.5rem" }}>
                        <span style={{ color:esiColor(hoveredInfo.data.esi) }}>
                          ESI {hoveredInfo.data.esi}
                        </span>
                        <span style={{ color:T.muted }}>·</span>
                        <span style={{ color:hoveredInfo.data.hdr>1?T.teal:T.rose }}>
                          HDR {hoveredInfo.data.hdr}
                        </span>
                      </div>
                      <div style={{ display:"flex", flexDirection:"column", gap:"0.3rem" }}>
                        {entries.map((e,i) => (
                          <div key={e.key} style={{ display:"flex", alignItems:"center", gap:"0.4rem" }}>
                            <div style={{ flex:1, height:2, background:T.border, position:"relative" }}>
                              <div style={{ position:"absolute", left:0, top:0, height:"100%",
                                width:`${e.pct}%`, background:e.hex||T.muted,
                                transition:`width 0.5s ${i*0.04}s` }} />
                            </div>
                            <span style={{ fontFamily:"DM Mono", fontSize:"0.46rem",
                              color:e.hex||T.muted, width:24, textAlign:"right" }}>{e.pct}%</span>
                          </div>
                        ))}
                      </div>
                    </>
                  );
                })()}
                <button onClick={() => setHoveredInfo(null)}
                  style={{ background:"none", border:`1px solid ${T.border}`, color:T.muted,
                    fontFamily:"DM Mono", fontSize:"0.48rem", padding:"0.2rem 0.5rem",
                    cursor:"pointer", alignSelf:"flex-start", marginTop:"0.25rem" }}>
                  ← Back to legend
                </button>
              </>
            ) : (
              <>
                <div style={{ fontFamily:"DM Mono", fontSize:"0.48rem",
                  color:T.muted, marginBottom:"0.15rem" }}>
                  Emotion Legend
                </div>
                {EMOTIONS.map(em => (
                  <div key={em.key} style={{ display:"flex", alignItems:"center", gap:"0.45rem" }}>
                    <div style={{ width:7, height:7, borderRadius:"50%",
                      background:em.hex, flexShrink:0 }} />
                    <EmotionIcon icon={em.icon} color={em.hex} size={10} />
                    <span style={{ fontFamily:"DM Mono", fontSize:"0.48rem",
                      color:T.muted, textTransform:"capitalize" }}>{em.name}</span>
                  </div>
                ))}
                <div style={{ marginTop:"0.35rem", fontFamily:"DM Mono", fontSize:"0.46rem",
                  color:T.muted, borderTop:`1px solid ${T.border}`, paddingTop:"0.4rem" }}>
                  {provinceAggs.filter(p=>p.meets_threshold).length} provinces ·{" "}
                  {lgus.length} active LGUs
                  <br/>Click a province or city to explore
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
