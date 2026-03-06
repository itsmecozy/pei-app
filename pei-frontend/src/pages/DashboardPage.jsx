import { useState, useEffect } from "react";
import { getNational, getLGUAggregations } from "../lib/supabase";
import { useT } from "../context/ThemeContext";
import { EMOTIONS, EMOTION_MAP } from "../constants/emotions";
import { useBreakpoint } from "../hooks/useBreakpoint";
import { useInView } from "../hooks/useInView";
import { PageHeader, Skeleton, EmptyState } from "../components/shared/ui/index";
import EmotionIcon from "../components/shared/EmotionIcon";

// Philippines island SVG paths (simplified but accurate shapes)
// Colored by dominant emotion of nearest active LGU
const PH_REGIONS = [
  { id:"luzon",    d:"M130,20 L145,18 L158,25 L165,40 L162,55 L155,68 L150,80 L158,90 L165,105 L168,120 L160,135 L148,145 L140,155 L135,165 L128,175 L120,182 L112,178 L105,168 L100,155 L98,140 L102,125 L108,112 L112,98 L108,85 L102,72 L100,58 L105,44 L115,30 Z", label:"Luzon" },
  { id:"manila",   d:"M118,178 L128,175 L135,182 L138,192 L134,202 L126,208 L118,210 L112,205 L110,195 L112,185 Z", label:"Metro Manila" },
  { id:"palawan",  d:"M58,230 L68,225 L76,232 L80,248 L78,264 L72,278 L64,282 L56,274 L52,258 L54,242 Z", label:"Palawan" },
  { id:"cebu",     d:"M148,270 L158,265 L165,272 L168,282 L162,292 L155,296 L148,292 L142,285 L143,275 Z", label:"Cebu" },
  { id:"iloilo",   d:"M118,268 L130,264 L136,272 L134,282 L126,288 L118,285 L114,276 Z", label:"Iloilo" },
  { id:"tacloban", d:"M170,265 L180,260 L188,267 L186,278 L178,283 L170,280 L166,272 Z", label:"Tacloban" },
  { id:"cdo",      d:"M120,340 L135,334 L148,340 L152,352 L145,360 L130,360 L118,354 L115,344 Z", label:"Cagayan de Oro" },
  { id:"zamboanga",d:"M95,375 L108,368 L118,373 L120,385 L112,394 L100,395 L92,386 L90,376 Z", label:"Zamboanga" },
  { id:"davao",    d:"M130,360 L155,352 L172,358 L182,370 L182,385 L170,398 L155,406 L138,402 L124,392 L118,378 L120,365 Z", label:"Davao" },
];

// Rough center coords for each region (to find nearest LGU)
const REGION_CENTERS = {
  luzon:    { lat: 16.5, lng: 121.0 },
  manila:   { lat: 14.6, lng: 120.9 },
  palawan:  { lat: 9.8,  lng: 118.7 },
  cebu:     { lat: 10.3, lng: 123.9 },
  iloilo:   { lat: 10.7, lng: 122.6 },
  tacloban: { lat: 11.2, lng: 124.9 },
  cdo:      { lat: 8.5,  lng: 124.6 },
  zamboanga:{ lat: 6.9,  lng: 122.1 },
  davao:    { lat: 7.1,  lng: 125.6 },
};

function lguDist(lgu, center) {
  const dlat = (lgu.lgus?.lat || 0) - center.lat;
  const dlng = (lgu.lgus?.lng || 0) - center.lng;
  return Math.sqrt(dlat*dlat + dlng*dlng);
}

function getNearestLgu(regionId, lgus) {
  if (!lgus.length) return null;
  const center = REGION_CENTERS[regionId];
  if (!center) return null;
  return lgus.reduce((best, lgu) =>
    lguDist(lgu, center) < lguDist(best, center) ? lgu : best
  );
}

export default function DashboardPage({ navigate }) {
  const T = useT();
  const bp = useBreakpoint();
  const [ref, inView]               = useInView();
  const [national, setNational]     = useState(null);
  const [lgus, setLgus]             = useState([]);
  const [loading, setLoading]       = useState(true);
  const [period, setPeriod]         = useState("7d");
  const [hoveredRegion, setHoveredRegion] = useState(null);
  const [hoveredLgu, setHoveredLgu] = useState(null);

  useEffect(() => {
    setLoading(true);
    Promise.all([getNational(period), getLGUAggregations(period)])
      .then(([nat, lguData]) => { setNational(nat); setLgus(lguData); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [period]);

  const hasData  = national && national.submission_count > 0;
  const esiColor = v => v > 0.6 ? "#10b981" : v > 0.4 ? T.amber : T.rose;

  // National emotion distribution sorted by pct
  const nationalDist = national?.emotion_dist || {};
  const distEntries = EMOTIONS
    .map(em => ({ ...em, pct: Math.round((nationalDist[em.key] || 0) * 100) }))
    .sort((a, b) => b.pct - a.pct)
    .filter(e => e.pct > 0);

  // Region color mapping
  const regionColors = {};
  PH_REGIONS.forEach(r => {
    const nearest = getNearestLgu(r.id, lgus);
    if (nearest) {
      const em = EMOTION_MAP[nearest.dominant_emotion];
      regionColors[r.id] = { hex: em?.hex || "#6b7280", lgu: nearest, em };
    }
  });

  const activeRegion = hoveredRegion
    ? { region: PH_REGIONS.find(r => r.id === hoveredRegion), ...regionColors[hoveredRegion] }
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
          { label:"Emotional Stability",  value:national?.esi, desc:"National ESI",
            color:national?.esi ? esiColor(national.esi) : T.muted },
          { label:"Hope / Despair Ratio", value:national?.hdr, desc:"National HDR",
            color:national?.hdr>1?T.teal:T.rose },
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

      {/* National Emotion Distribution pulse bar */}
      {!loading && distEntries.length > 0 && (
        <div style={{ padding:bp==="mobile"?"1.25rem 1.25rem 0":"1.25rem 0 0" }}>
          <div style={{ fontFamily:"DM Mono", fontSize:"0.5rem", letterSpacing:"0.14em",
            textTransform:"uppercase", color:T.muted, marginBottom:"0.5rem" }}>
            National Emotion Distribution
          </div>
          {/* Pulse bar */}
          <div style={{ display:"flex", height:6, gap:1, marginBottom:"0.6rem" }}>
            {distEntries.map(em => (
              <div key={em.key} style={{ flex:em.pct, background:em.hex,
                transition:"flex 1.2s cubic-bezier(0.4,0,0.2,1)" }} />
            ))}
          </div>
          {/* Legend */}
          <div style={{ display:"flex", flexWrap:"wrap", gap:"0.6rem" }}>
            {distEntries.map(em => (
              <div key={em.key} style={{ display:"flex", alignItems:"center", gap:"0.3rem" }}>
                <div style={{ width:7, height:7, borderRadius:"50%", background:em.hex }} />
                <span style={{ fontFamily:"DM Mono", fontSize:"0.5rem", color:T.muted,
                  textTransform:"capitalize" }}>{em.name} {em.pct}%</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Color-coded Philippines Map */}
      <div style={{ padding:bp==="mobile"?"1.5rem 1.25rem 2rem":"1.5rem 0 2rem" }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
          marginBottom:"1rem" }}>
          <div style={{ fontFamily:"DM Mono", fontSize:"0.54rem", letterSpacing:"0.16em",
            textTransform:"uppercase", color:T.muted }}>
            Emotional Heatmap · {period === "all" ? "All Time" : period.toUpperCase()}
          </div>
          <button onClick={() => navigate("map")}
            style={{ background:"none", border:`1px solid ${T.border}`, color:T.muted,
              padding:"0.28rem 0.65rem", fontFamily:"DM Mono", fontSize:"0.52rem",
              letterSpacing:"0.08em", cursor:"pointer", transition:"all 0.2s" }}
            onMouseEnter={e=>{e.currentTarget.style.borderColor=T.amber;e.currentTarget.style.color=T.amber}}
            onMouseLeave={e=>{e.currentTarget.style.borderColor=T.border;e.currentTarget.style.color=T.muted}}>
            Full Map →
          </button>
        </div>

        <div style={{ border:`1px solid ${T.border}`,
          display:"flex", flexDirection:bp==="mobile"?"column":"row" }}>

          {/* SVG Map */}
          <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center",
            padding:"1.5rem", minHeight:320 }}>
            {loading ? <Skeleton height={300} width={180} /> : (
              <svg viewBox="0 0 300 500"
                style={{ width:"100%", maxWidth:bp==="mobile"?220:280,
                  filter:"drop-shadow(0 0 32px rgba(0,0,0,0.4))" }}>

                {/* Island regions — filled by nearest LGU dominant emotion */}
                {PH_REGIONS.map(region => {
                  const rc = regionColors[region.id];
                  const isHovered = hoveredRegion === region.id;
                  const baseColor = rc?.hex || "#1a2035";
                  const opacity   = rc ? (isHovered ? 0.75 : 0.45) : 0.12;
                  return (
                    <path key={region.id}
                      d={region.d}
                      fill={baseColor}
                      fillOpacity={opacity}
                      stroke={isHovered ? baseColor : "rgba(255,255,255,0.08)"}
                      strokeWidth={isHovered ? 1.5 : 0.5}
                      style={{ cursor: rc ? "pointer" : "default",
                        transition:"all 0.25s",
                        filter: isHovered && rc ? `drop-shadow(0 0 8px ${baseColor}80)` : "none" }}
                      onMouseEnter={() => { setHoveredRegion(region.id); setHoveredLgu(rc?.lgu||null); }}
                      onMouseLeave={() => { setHoveredRegion(null); setHoveredLgu(null); }}
                      onClick={() => rc && navigate("map")}
                    />
                  );
                })}

                {/* Active LGU dots on top */}
                {lgus.map(a => {
                  const em = EMOTION_MAP[a.dominant_emotion];
                  const isActive = hoveredLgu?.id === a.id;
                  const lat = a.lgus?.lat;
                  const lng = a.lgus?.lng;
                  if (!lat || !lng) return null;
                  const x = ((lng - 116) / (127 - 116)) * 260 + 20;
                  const y = ((21.5 - lat) / (21.5 - 4.5)) * 460 + 20;
                  return (
                    <g key={a.id}
                      onMouseEnter={() => { setHoveredLgu(a); setHoveredRegion(null); }}
                      onMouseLeave={() => setHoveredLgu(null)}
                      onClick={() => navigate("map")}
                      style={{ cursor:"pointer" }}>
                      <circle cx={x} cy={y} r={isActive?14:9}
                        fill={em?.hex||T.amber} opacity={0.15}
                        style={{ transition:"r 0.2s" }} />
                      <circle cx={x} cy={y} r={isActive?6:4}
                        fill={em?.hex||T.amber} opacity={isActive?1:0.9}
                        stroke={isActive?"#fff":"none"} strokeWidth={isActive?1.5:0}
                        style={{ transition:"all 0.2s",
                          filter:isActive?`drop-shadow(0 0 6px ${em?.hex})`:"none" }} />
                      {isActive && (
                        <text x={x+9} y={y+3} fill="rgba(255,255,255,0.8)"
                          fontSize="7" fontFamily="DM Mono">{a.lgus?.name}</text>
                      )}
                    </g>
                  );
                })}
              </svg>
            )}
          </div>

          {/* Info panel */}
          <div style={{ width:bp==="mobile"?"100%":220,
            borderLeft:bp==="mobile"?"none":`1px solid ${T.border}`,
            borderTop:bp==="mobile"?`1px solid ${T.border}`:"none",
            padding:"1.25rem", display:"flex", flexDirection:"column", gap:"0.65rem" }}>

            {hoveredLgu ? (
              <>
                <div style={{ fontFamily:"'Playfair Display',serif", fontSize:"1rem", fontWeight:700 }}>
                  {hoveredLgu.lgus?.name}
                </div>
                <div style={{ fontFamily:"DM Mono", fontSize:"0.5rem", color:T.muted }}>
                  {hoveredLgu.submission_count?.toLocaleString()} submissions
                </div>
                {(() => {
                  const em   = EMOTION_MAP[hoveredLgu.dominant_emotion];
                  const dist = hoveredLgu.emotion_dist || {};
                  const entries = Object.entries(dist)
                    .map(([k,v]) => ({ ...EMOTION_MAP[k], key:k, pct:Math.round(v*100) }))
                    .sort((a,b) => b.pct - a.pct).slice(0,5);
                  return (
                    <>
                      <div style={{ display:"flex", alignItems:"center", gap:"0.4rem",
                        background:`${em?.hex||T.amber}12`,
                        border:`1px solid ${em?.hex||T.amber}25`,
                        padding:"0.4rem 0.5rem" }}>
                        <EmotionIcon icon={em?.icon} color={em?.hex||T.amber} size={13} />
                        <span style={{ fontFamily:"DM Mono", fontSize:"0.52rem",
                          color:em?.hex||T.amber, textTransform:"capitalize" }}>
                          {hoveredLgu.dominant_emotion} · {Math.round((dist[hoveredLgu.dominant_emotion]||0)*100)}%
                        </span>
                      </div>
                      <div style={{ display:"flex", gap:"0.5rem", fontFamily:"DM Mono", fontSize:"0.5rem" }}>
                        <span style={{ color:esiColor(hoveredLgu.esi) }}>ESI {hoveredLgu.esi}</span>
                        <span style={{ color:T.muted }}>·</span>
                        <span style={{ color:hoveredLgu.hdr>1?T.teal:T.rose }}>HDR {hoveredLgu.hdr}</span>
                      </div>
                      <div style={{ display:"flex", flexDirection:"column", gap:"0.35rem", marginTop:"0.25rem" }}>
                        {entries.map((e,i) => (
                          <div key={e.key} style={{ display:"flex", alignItems:"center", gap:"0.5rem" }}>
                            <div style={{ flex:1, height:3, background:`${T.border}`, position:"relative" }}>
                              <div style={{ position:"absolute", left:0, top:0, height:"100%",
                                width:`${e.pct}%`, background:e.hex||T.muted,
                                transition:`width 0.6s ${i*0.04}s ease` }} />
                            </div>
                            <span style={{ fontFamily:"DM Mono", fontSize:"0.48rem",
                              color:e.hex||T.muted, width:26, textAlign:"right" }}>{e.pct}%</span>
                          </div>
                        ))}
                      </div>
                    </>
                  );
                })()}
              </>
            ) : (
              <>
                <div style={{ fontFamily:"DM Mono", fontSize:"0.5rem", color:T.muted, marginBottom:"0.25rem" }}>
                  Emotion Legend
                </div>
                {EMOTIONS.map(em => (
                  <div key={em.key} style={{ display:"flex", alignItems:"center", gap:"0.5rem" }}>
                    <div style={{ width:8, height:8, borderRadius:"50%",
                      background:em.hex, flexShrink:0 }} />
                    <EmotionIcon icon={em.icon} color={em.hex} size={11} />
                    <span style={{ fontFamily:"DM Mono", fontSize:"0.5rem",
                      color:T.muted, textTransform:"capitalize" }}>{em.name}</span>
                  </div>
                ))}
                {lgus.length > 0 && (
                  <div style={{ marginTop:"0.5rem", fontFamily:"DM Mono", fontSize:"0.48rem",
                    color:T.muted, borderTop:`1px solid ${T.border}`, paddingTop:"0.5rem" }}>
                    {lgus.length} active {lgus.length===1?"LGU":"LGUs"}
                    {bp !== "mobile" ? " · Hover to explore" : " · Tap to explore"}
                  </div>
                )}
                {lgus.length === 0 && !loading && (
                  <div style={{ fontFamily:"DM Mono", fontSize:"0.5rem", color:T.muted,
                    fontStyle:"italic" }}>
                    No cities active yet for this period
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
