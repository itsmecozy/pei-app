import { useState, useEffect } from "react";
import { getLGUAggregations } from "../lib/supabase";
import { useT } from "../context/ThemeContext";
import { EMOTION_MAP } from "../constants/emotions";
import { useBreakpoint } from "../hooks/useBreakpoint";
import { useInView } from "../hooks/useInView";
import { PageHeader, EmotionBar, ScoreCard, Skeleton, EmptyState } from "../components/shared/ui/index";
import EmotionIcon from "../components/shared/EmotionIcon";

// Philippines island SVG paths
const PH_REGIONS = [
  { id:"luzon",     d:"M130,20 L145,18 L158,25 L165,40 L162,55 L155,68 L150,80 L158,90 L165,105 L168,120 L160,135 L148,145 L140,155 L135,165 L128,175 L120,182 L112,178 L105,168 L100,155 L98,140 L102,125 L108,112 L112,98 L108,85 L102,72 L100,58 L105,44 L115,30 Z", label:"Luzon" },
  { id:"manila",    d:"M118,178 L128,175 L135,182 L138,192 L134,202 L126,208 L118,210 L112,205 L110,195 L112,185 Z", label:"Metro Manila" },
  { id:"palawan",   d:"M58,230 L68,225 L76,232 L80,248 L78,264 L72,278 L64,282 L56,274 L52,258 L54,242 Z", label:"Palawan" },
  { id:"cebu",      d:"M148,270 L158,265 L165,272 L168,282 L162,292 L155,296 L148,292 L142,285 L143,275 Z", label:"Cebu" },
  { id:"iloilo",    d:"M118,268 L130,264 L136,272 L134,282 L126,288 L118,285 L114,276 Z", label:"Iloilo" },
  { id:"tacloban",  d:"M170,265 L180,260 L188,267 L186,278 L178,283 L170,280 L166,272 Z", label:"Tacloban" },
  { id:"cdo",       d:"M120,340 L135,334 L148,340 L152,352 L145,360 L130,360 L118,354 L115,344 Z", label:"Cagayan de Oro" },
  { id:"zamboanga", d:"M95,375 L108,368 L118,373 L120,385 L112,394 L100,395 L92,386 L90,376 Z", label:"Zamboanga" },
  { id:"davao",     d:"M130,360 L155,352 L172,358 L182,370 L182,385 L170,398 L155,406 L138,402 L124,392 L118,378 L120,365 Z", label:"Davao" },
];

const REGION_CENTERS = {
  luzon:     { lat:16.5, lng:121.0 },
  manila:    { lat:14.6, lng:120.9 },
  palawan:   { lat:9.8,  lng:118.7 },
  cebu:      { lat:10.3, lng:123.9 },
  iloilo:    { lat:10.7, lng:122.6 },
  tacloban:  { lat:11.2, lng:124.9 },
  cdo:       { lat:8.5,  lng:124.6 },
  zamboanga: { lat:6.9,  lng:122.1 },
  davao:     { lat:7.1,  lng:125.6 },
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
  return lgus.reduce((best, lgu) => lguDist(lgu, center) < lguDist(best, center) ? lgu : best);
}

function SidebarContent({ selected, inView, period, onClose, bp, T }) {
  if (!selected) return (
    <div style={{ padding:"2rem 1.25rem" }}>
      <EmptyState icon="◉" title="Select a city"
        body="Click any active city dot on the map to explore its emotional data." />
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
            <button onClick={onClose}
              style={{ background:"none", border:`1px solid ${T.border}`, color:T.muted,
                padding:"0.25rem 0.5rem", fontFamily:"DM Mono", fontSize:"0.5rem", cursor:"pointer" }}>✕</button>
          )}
        </div>
        <div style={{ fontFamily:"DM Mono", fontSize:"0.54rem", color:T.muted, marginBottom:"0.85rem" }}>
          {selected.submission_count?.toLocaleString()} submissions · {period === "all" ? "All time" : period}
        </div>
        {em && (
          <div style={{ background:`${em.hex}10`, border:`1px solid ${em.hex}30`,
            padding:"0.5rem 0.65rem", marginBottom:"0.85rem",
            fontFamily:"DM Mono", fontSize:"0.56rem", color:em.hex, textTransform:"capitalize",
            display:"flex", alignItems:"center", gap:"0.4rem" }}>
            ◈ Dominant:
            <EmotionIcon icon={em.icon} color={em.hex} size={13} />
            {dominant} · {Math.round((dist[dominant]||0)*100)}%
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
        <ScoreCard label="ESI" value={selected.esi}
          desc={selected.esi>0.6?"Stable":selected.esi>0.4?"Moderate":"Turbulent"}
          color={selected.esi>0.6?"#10b981":selected.esi>0.4?T.amber:T.rose} fill={(selected.esi||0)*100} />
        <ScoreCard label="HDR" value={selected.hdr}
          desc={selected.hdr>1?"Hope-leaning":"Despair-leaning"}
          color={selected.hdr>1?T.teal:T.rose} fill={Math.min((selected.hdr||0)/2*100,100)} />
        <ScoreCard label="Velocity"
          value={selected.velocity!==null?`${selected.velocity>0?"+":""}${selected.velocity}`:"—"}
          desc="Rate of change"
          color={selected.velocity>0?"#10b981":selected.velocity<0?T.rose:T.muted}
          fill={Math.abs(selected.velocity||0)*300} />
        <ScoreCard label="Submissions" value={selected.submission_count?.toLocaleString()}
          desc={`${period === "all" ? "All time" : period} window`} color={T.text} fill={40} />
      </div>
    </div>
  );
}

export default function MapPage({ openModal }) {
  const T = useT();
  const bp = useBreakpoint();
  const [lgus, setLgus]               = useState([]);
  const [loading, setLoading]         = useState(true);
  const [period, setPeriod]           = useState("30d");
  const [selected, setSelected]       = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [hoveredRegion, setHoveredRegion] = useState(null);
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

  // Map region colors from nearest LGU
  const regionColors = {};
  PH_REGIONS.forEach(r => {
    const nearest = getNearestLgu(r.id, lgus);
    if (nearest) {
      const em = EMOTION_MAP[nearest.dominant_emotion];
      regionColors[r.id] = { hex: em?.hex || "#6b7280", lgu: nearest };
    }
  });

  return (
    <div>
      <div style={{ padding:bp==="mobile"?"0 1.25rem":"0" }}>
        <PageHeader label="Emotional Heatmap" title="Cities of Feeling"
          live={lgus.length > 0}
          subtitle="Each city appears once it reaches 10 submissions. Regions are colored by dominant emotion. Click a city dot to explore." />
      </div>

      {/* Period + city buttons */}
      <div style={{ padding:bp==="mobile"?"0 1.25rem 1rem":"0 0 1rem",
        display:"flex", alignItems:"center", gap:"0.5rem", flexWrap:"wrap" }}>
        {["7d","30d","90d","all"].map(t => (
          <button key={t} onClick={() => setPeriod(t)}
            style={{ padding:"0.28rem 0.65rem", fontFamily:"DM Mono", fontSize:"0.56rem",
              letterSpacing:"0.06em", border:`1px solid ${period===t?T.amber:T.border}`,
              background:period===t?`${T.amber}15`:"none",
              color:period===t?T.amber:T.muted, cursor:"pointer", transition:"all 0.2s" }}>
            {t === "all" ? "ALL TIME" : t.toUpperCase()}
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

      {/* Mobile sidebar overlay */}
      {bp !== "desktop" && sidebarOpen && (
        <div style={{ position:"fixed", inset:0, zIndex:210,
          background:"rgba(0,0,0,0.75)", backdropFilter:"blur(4px)" }}
          onClick={() => setSidebarOpen(false)}>
          <div style={{ position:"absolute", right:0, top:0, bottom:0,
            width:"min(400px,92vw)", background:T.surface,
            borderLeft:`1px solid ${T.border}`, overflowY:"auto" }}
            onClick={e => e.stopPropagation()}>
            <SidebarContent selected={selected} inView={inView} period={period}
              onClose={() => setSidebarOpen(false)} bp={bp} T={T} />
          </div>
        </div>
      )}

      {/* Main map area */}
      <div ref={ref} style={{ display:bp==="desktop"?"grid":"block",
        gridTemplateColumns:"1fr 360px", border:`1px solid ${T.border}`, minHeight:500 }}>

        {/* SVG Map */}
        <div style={{ borderRight:bp==="desktop"?`1px solid ${T.border}`:"none",
          display:"flex", alignItems:"center", justifyContent:"center",
          padding:bp==="mobile"?"1.5rem 1rem":"2rem" }}>
          {loading ? (
            <div style={{ textAlign:"center" }}>
              <Skeleton height={360} width={240} />
              <div style={{ fontFamily:"DM Mono", fontSize:"0.56rem",
                color:T.muted, marginTop:"1rem" }}>Loading map data...</div>
            </div>
          ) : (
            <div style={{ width:"100%", maxWidth:bp==="mobile"?260:340 }}>
              {lgus.length === 0 ? (
                <EmptyState icon="◉" title="Map is waiting"
                  body="Cities appear once they reach 10 anonymous submissions. Submit from your city to help build the index."
                  cta="Submit Your Feeling" onCta={openModal} />
              ) : (
                <>
                  <svg viewBox="0 0 300 500"
                    style={{ width:"100%", filter:"drop-shadow(0 0 32px rgba(0,0,0,0.5))" }}>

                    {/* Island region fills — colored by nearest LGU emotion */}
                    {PH_REGIONS.map(region => {
                      const rc = regionColors[region.id];
                      const isHovered = hoveredRegion === region.id;
                      const baseColor = rc?.hex || "#1a2035";
                      const opacity   = rc ? (isHovered ? 0.7 : 0.4) : 0.1;
                      return (
                        <path key={region.id}
                          d={region.d}
                          fill={baseColor}
                          fillOpacity={opacity}
                          stroke={isHovered ? baseColor : "rgba(255,255,255,0.1)"}
                          strokeWidth={isHovered ? 1.5 : 0.5}
                          style={{ cursor: rc ? "pointer" : "default", transition:"all 0.25s",
                            filter: isHovered && rc ? `drop-shadow(0 0 10px ${baseColor}80)` : "none" }}
                          onMouseEnter={() => setHoveredRegion(region.id)}
                          onMouseLeave={() => setHoveredRegion(null)}
                          onClick={() => rc && handleSelect(rc.lgu)}
                        />
                      );
                    })}

                    {/* Active LGU city dots */}
                    {lgus.map(a => {
                      const em = EMOTION_MAP[a.dominant_emotion];
                      const isSelected = selected?.id === a.id;
                      const lat = a.lgus?.lat;
                      const lng = a.lgus?.lng;
                      if (!lat || !lng) return null;
                      const x = ((lng - 116) / (127 - 116)) * 260 + 20;
                      const y = ((21.5 - lat) / (21.5 - 4.5)) * 460 + 20;
                      return (
                        <g key={a.id} onClick={() => handleSelect(a)} style={{ cursor:"pointer" }}>
                          {/* Pulse ring */}
                          <circle cx={x} cy={y} r={isSelected?16:11}
                            fill={em?.hex||T.amber} opacity={0.15}
                            style={{ transition:"all 0.3s" }} />
                          {/* Core dot */}
                          <circle cx={x} cy={y} r={isSelected?7:5}
                            fill={em?.hex||T.amber} opacity={isSelected?1:0.9}
                            stroke={isSelected?"#fff":"rgba(255,255,255,0.4)"}
                            strokeWidth={isSelected?1.5:0.5}
                            style={{ transition:"all 0.3s",
                              filter:isSelected?`drop-shadow(0 0 8px ${em?.hex||T.amber})`:"none" }} />
                          {/* Label */}
                          {isSelected && (
                            <text x={x+10} y={y+3} fill="rgba(255,255,255,0.85)"
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
                </>
              )}
            </div>
          )}
        </div>

        {/* Desktop sidebar */}
        {bp === "desktop" && (
          <div style={{ overflowY:"auto", maxHeight:600 }}>
            <SidebarContent selected={selected} inView={inView} period={period}
              onClose={() => setSidebarOpen(false)} bp={bp} T={T} />
          </div>
        )}
      </div>
    </div>
  );
}
