import { useState, useEffect, useMemo } from "react";
import { getNational, getLGUAggregations, getProvinceAggregations } from "../lib/supabase";
import { useT } from "../context/ThemeContext";
import { EMOTIONS, EMOTION_MAP } from "../constants/emotions";
import { useBreakpoint } from "../hooks/useBreakpoint";
import { useInView } from "../hooks/useInView";
import { PageHeader, Skeleton, EmptyState } from "../components/shared/ui/index";
import EmotionIcon from "../components/shared/EmotionIcon";
import { PH_PROVINCES, REGION_LABELS } from "../constants/phProvinces";

// ── Province map coloring ─────────────────────────────────────────────────────
// Match province aggregations by fuzzy name match against PH_PROVINCES
function buildProvinceColorMap(provinceAggs) {
  const colorMap = {};
  if (!provinceAggs?.length) return colorMap;
  for (const agg of provinceAggs) {
    const pname = (agg.provinces?.name || "").toLowerCase();
    // Find matching province in our map data
    const match = PH_PROVINCES.find(p =>
      pname.includes(p.province_key) || p.province_key.includes(pname.split(" ")[0])
    );
    if (match && agg.dominant_emotion) {
      const em = EMOTION_MAP[agg.dominant_emotion];
      colorMap[match.id] = {
        hex: em?.hex || "#6b7280",
        dominant: agg.dominant_emotion,
        count: agg.submission_count,
        esi: agg.esi,
        hdr: agg.hdr,
        provinceName: agg.provinces?.name || match.name,
      };
    }
  }
  return colorMap;
}

export default function DashboardPage({ navigate }) {
  const T = useT();
  const bp = useBreakpoint();
  const [ref, inView]                 = useInView();
  const [national, setNational]       = useState(null);
  const [lgus, setLgus]               = useState([]);
  const [provinceAggs, setProvinceAggs] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [period, setPeriod]           = useState("all");
  const [hoveredProvince, setHoveredProvince] = useState(null);
  const [hoveredLgu, setHoveredLgu]   = useState(null);

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
  const distEntries = EMOTIONS
    .map(em => ({ ...em, pct: Math.round((nationalDist[em.key] || 0) * 100) }))
    .sort((a, b) => b.pct - a.pct)
    .filter(e => e.pct > 0);

  const provinceColorMap = useMemo(
    () => buildProvinceColorMap(provinceAggs),
    [provinceAggs]
  );

  const hoveredInfo = hoveredLgu
    ? { name: hoveredLgu.lgus?.name, type: "lgu", data: hoveredLgu }
    : hoveredProvince
    ? { name: hoveredProvince.provinceName, type: "province", data: hoveredProvince }
    : null;

  return (
    <div>
      <div style={{ padding:bp==="mobile"?"0 1.25rem":"0" }}>
        <PageHeader label="Dashboard" title="National Emotional Pulse" live={hasData}
          subtitle="Real-time aggregated data from anonymous submissions across Philippine cities and municipalities." />
      </div>

      {/* Period buttons */}
      <div style={{ padding:bp==="mobile"?"0 1.25rem 1.25rem":"0 0 1.25rem", display:"flex", gap:"0.25rem" }}>
        {["7d","30d","90d","all"].map(t => (
          <button key={t} onClick={() => setPeriod(t)}
            style={{ padding:"0.28rem 0.65rem", fontFamily:"DM Mono", fontSize:"0.56rem",
              letterSpacing:"0.06em", border:`1px solid ${period===t?T.amber:T.border}`,
              background:period===t?`${T.amber}15`:"none",
              color:period===t?T.amber:T.muted, cursor:"pointer", transition:"all 0.2s" }}>
            {t === "all" ? "ALL TIME" : t.toUpperCase()}
          </button>
        ))}
      </div>

      {/* Metric cards */}
      <div ref={ref} style={{ display:"grid",
        gridTemplateColumns:bp==="mobile"?"1fr 1fr":bp==="tablet"?"1fr 1fr":"repeat(4,1fr)",
        border:`1px solid ${T.border}`, borderBottom:"none" }}>
        {[
          { label:"Emotional Stability",  value:national?.esi,
            desc:"National ESI", color:national?.esi ? esiColor(national.esi) : T.muted },
          { label:"Hope / Despair Ratio", value:national?.hdr,
            desc:"National HDR", color:national?.hdr>1?T.teal:T.rose },
          { label:"Dominant Emotion",     value:national?.dominant_emotion || null,
            desc:"This period", color:EMOTION_MAP[national?.dominant_emotion]?.hex||T.muted },
          { label:"Total Submissions",    value:national?.submission_count?.toLocaleString(),
            desc:`${national?.active_lgus||0} active LGUs`, color:T.text },
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
                  color:m.color, lineHeight:1, textTransform:"capitalize" }}>{m.value ?? "—"}</div>
            }
            <div style={{ fontFamily:"DM Mono", fontSize:"0.52rem",
              color:T.muted, marginTop:"0.3rem" }}>{m.desc}</div>
          </div>
        ))}
      </div>

      {/* National pulse bar */}
      {!loading && distEntries.length > 0 && (
        <div style={{ padding:bp==="mobile"?"1.25rem 1.25rem 0":"1.25rem 0 0" }}>
          <div style={{ fontFamily:"DM Mono", fontSize:"0.5rem", letterSpacing:"0.14em",
            textTransform:"uppercase", color:T.muted, marginBottom:"0.5rem" }}>
            National Emotion Distribution
          </div>
          <div style={{ display:"flex", height:6, gap:1, marginBottom:"0.6rem" }}>
            {distEntries.map(e => (
              <div key={e.key} style={{ flex:e.pct, background:e.hex, transition:"flex 0.8s ease" }} />
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

      {/* ── Philippine Province Map ─────────────────────────────────── */}
      <div style={{ marginTop:"1.5rem", border:`1px solid ${T.border}` }}>
        <div style={{ padding:"0.85rem 1.1rem", borderBottom:`1px solid ${T.border}`,
          display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <div style={{ fontFamily:"DM Mono", fontSize:"0.5rem", letterSpacing:"0.14em",
            textTransform:"uppercase", color:T.muted }}>
            Emotional Heatmap · {period === "all" ? "All Time" : period.toUpperCase()}
          </div>
          <button onClick={() => navigate("map")}
            style={{ background:"none", border:`1px solid ${T.border}`, color:T.muted,
              fontFamily:"DM Mono", fontSize:"0.5rem", letterSpacing:"0.06em",
              padding:"0.25rem 0.6rem", cursor:"pointer", transition:"all 0.2s" }}>
            Full Map →
          </button>
        </div>

        <div style={{ display:"flex", flexDirection:bp==="mobile"?"column":"row" }}>
          {/* SVG Map */}
          <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center",
            padding:bp==="mobile"?"1.5rem 1rem":"1.5rem 1.5rem 1.5rem 1.5rem",
            borderRight:bp!=="mobile"?`1px solid ${T.border}`:"none",
            borderBottom:bp==="mobile"?`1px solid ${T.border}`:"none" }}>
            {loading ? <Skeleton height={380} width={220} /> : (
              <svg viewBox="0 0 300 500"
                style={{ width:"100%", maxWidth:bp==="mobile"?240:300,
                  filter:"drop-shadow(0 2px 24px rgba(0,0,0,0.5))" }}>

                {/* Province fills — colored by dominant emotion */}
                {PH_PROVINCES.map(prov => {
                  const pc = provinceColorMap[prov.id];
                  const isHov = hoveredProvince?.id === prov.id;
                  // Scale paths from viewBox 560x760 down to 300x500
                  const scaleX = 300 / 560;
                  const scaleY = 500 / 760;
                  // Transform path coordinates
                  const scaledD = prov.d.replace(/(-?\d+\.?\d*),(-?\d+\.?\d*)/g,
                    (_, x, y) => `${(parseFloat(x)*scaleX).toFixed(1)},${(parseFloat(y)*scaleY).toFixed(1)}`
                  );
                  const fill    = pc?.hex || "#1a2535";
                  const opacity = pc ? (isHov ? 0.85 : 0.5) : 0.08;

                  return (
                    <path key={prov.id}
                      d={scaledD}
                      fill={fill}
                      fillOpacity={opacity}
                      stroke={pc ? (isHov ? fill : "rgba(255,255,255,0.15)") : "rgba(255,255,255,0.06)"}
                      strokeWidth={isHov ? 1.5 : 0.5}
                      style={{ cursor: pc ? "pointer" : "default", transition:"all 0.2s",
                        filter: isHov && pc ? `drop-shadow(0 0 8px ${fill}80)` : "none" }}
                      onMouseEnter={() => pc && setHoveredProvince({ ...pc, id: prov.id })}
                      onMouseLeave={() => setHoveredProvince(null)}
                      onClick={() => pc && navigate("map")}
                    >
                      <title>{prov.name}{pc ? ` — ${pc.dominant}` : ""}</title>
                    </path>
                  );
                })}

                {/* Active LGU dots */}
                {lgus.map(a => {
                  const em = EMOTION_MAP[a.dominant_emotion];
                  const isAct = hoveredLgu?.id === a.id;
                  const lat = a.lgus?.lat;
                  const lng = a.lgus?.lng;
                  if (!lat || !lng) return null;
                  // Scale from real coords to 300x500 viewBox
                  const x = ((lng - 116.5) / (127 - 116.5)) * 260 + 20;
                  const y = ((21.8 - lat) / (21.8 - 4.2)) * 460 + 20;
                  return (
                    <g key={a.id}
                      onMouseEnter={() => setHoveredLgu(a)}
                      onMouseLeave={() => setHoveredLgu(null)}
                      onClick={() => navigate("map")} style={{ cursor:"pointer" }}>
                      <circle cx={x} cy={y} r={isAct?12:7}
                        fill={em?.hex||T.amber} opacity={0.15} style={{ transition:"r 0.2s" }} />
                      <circle cx={x} cy={y} r={isAct?5:3.5}
                        fill={em?.hex||T.amber} opacity={isAct?1:0.9}
                        stroke={isAct?"#fff":"rgba(255,255,255,0.3)"} strokeWidth={isAct?1.5:0.5}
                        style={{ transition:"all 0.2s",
                          filter:isAct?`drop-shadow(0 0 6px ${em?.hex})`:"none" }} />
                      {isAct && (
                        <text x={x+8} y={y+3} fill="rgba(255,255,255,0.85)"
                          fontSize="6" fontFamily="DM Mono">{a.lgus?.name}</text>
                      )}
                    </g>
                  );
                })}
              </svg>
            )}
          </div>

          {/* Info panel */}
          <div style={{ width:bp==="mobile"?"100%":200, padding:"1.1rem",
            display:"flex", flexDirection:"column", gap:"0.6rem" }}>
            {hoveredInfo ? (
              <>
                <div style={{ fontFamily:"'Playfair Display',serif",
                  fontSize:"0.9rem", fontWeight:700, lineHeight:1.2 }}>
                  {hoveredInfo.name}
                </div>
                {hoveredInfo.type === "province" ? (
                  <>
                    <div style={{ fontFamily:"DM Mono", fontSize:"0.5rem", color:T.muted }}>
                      Province · {hoveredInfo.data.count?.toLocaleString()} submissions
                    </div>
                    <div style={{ display:"flex", alignItems:"center", gap:"0.4rem",
                      background:`${hoveredInfo.data.hex}12`, border:`1px solid ${hoveredInfo.data.hex}25`,
                      padding:"0.4rem 0.5rem" }}>
                      <EmotionIcon icon={EMOTION_MAP[hoveredInfo.data.dominant]?.icon}
                        color={hoveredInfo.data.hex} size={12} />
                      <span style={{ fontFamily:"DM Mono", fontSize:"0.5rem",
                        color:hoveredInfo.data.hex, textTransform:"capitalize" }}>
                        {hoveredInfo.data.dominant}
                      </span>
                    </div>
                    <div style={{ fontFamily:"DM Mono", fontSize:"0.5rem", display:"flex", gap:"0.5rem" }}>
                      <span style={{ color:esiColor(hoveredInfo.data.esi) }}>ESI {hoveredInfo.data.esi}</span>
                      <span style={{ color:T.muted }}>·</span>
                      <span style={{ color:hoveredInfo.data.hdr>1?T.teal:T.rose }}>
                        HDR {hoveredInfo.data.hdr}
                      </span>
                    </div>
                  </>
                ) : (
                  <>
                    <div style={{ fontFamily:"DM Mono", fontSize:"0.5rem", color:T.muted }}>
                      {hoveredInfo.data.submission_count?.toLocaleString()} submissions
                    </div>
                    {(() => {
                      const em = EMOTION_MAP[hoveredInfo.data.dominant_emotion];
                      const dist = hoveredInfo.data.emotion_dist || {};
                      const entries = Object.entries(dist)
                        .map(([k,v]) => ({ ...EMOTION_MAP[k], key:k, pct:Math.round(v*100) }))
                        .sort((a,b) => b.pct - a.pct).slice(0,5);
                      return (
                        <>
                          <div style={{ display:"flex", alignItems:"center", gap:"0.4rem",
                            background:`${em?.hex||T.amber}12`, border:`1px solid ${em?.hex||T.amber}25`,
                            padding:"0.4rem 0.5rem" }}>
                            <EmotionIcon icon={em?.icon} color={em?.hex||T.amber} size={12} />
                            <span style={{ fontFamily:"DM Mono", fontSize:"0.5rem",
                              color:em?.hex||T.amber, textTransform:"capitalize" }}>
                              {hoveredInfo.data.dominant_emotion} · {Math.round((dist[hoveredInfo.data.dominant_emotion]||0)*100)}%
                            </span>
                          </div>
                          <div style={{ display:"flex", gap:"0.5rem", fontFamily:"DM Mono", fontSize:"0.5rem" }}>
                            <span style={{ color:esiColor(hoveredInfo.data.esi) }}>ESI {hoveredInfo.data.esi}</span>
                            <span style={{ color:T.muted }}>·</span>
                            <span style={{ color:hoveredInfo.data.hdr>1?T.teal:T.rose }}>HDR {hoveredInfo.data.hdr}</span>
                          </div>
                          <div style={{ display:"flex", flexDirection:"column", gap:"0.3rem", marginTop:"0.15rem" }}>
                            {entries.map((e,i) => (
                              <div key={e.key} style={{ display:"flex", alignItems:"center", gap:"0.4rem" }}>
                                <div style={{ flex:1, height:2, background:T.border, position:"relative" }}>
                                  <div style={{ position:"absolute", left:0, top:0, height:"100%",
                                    width:`${e.pct}%`, background:e.hex||T.muted,
                                    transition:`width 0.6s ${i*0.04}s` }} />
                                </div>
                                <span style={{ fontFamily:"DM Mono", fontSize:"0.46rem",
                                  color:e.hex||T.muted, width:24, textAlign:"right" }}>{e.pct}%</span>
                              </div>
                            ))}
                          </div>
                        </>
                      );
                    })()}
                  </>
                )}
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
                  {provinceAggs.filter(p=>p.meets_threshold).length > 0
                    ? `${provinceAggs.filter(p=>p.meets_threshold).length} provinces active`
                    : "No province data yet"}
                  {bp !== "mobile" ? " · Hover to explore" : " · Tap region"}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
