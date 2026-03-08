import { useState, useEffect, useMemo } from "react";
import { getLGUAggregations, getProvinceAggregations } from "../lib/supabase";
import { useT } from "../context/ThemeContext";
import { EMOTIONS, EMOTION_MAP } from "../constants/emotions";
import { useBreakpoint } from "../hooks/useBreakpoint";
import { useInView } from "../hooks/useInView";
import { PageHeader, EmotionBar, ScoreCard, Skeleton, EmptyState } from "../components/shared/ui/index";
import EmotionIcon from "../components/shared/EmotionIcon";
import { PH_PROVINCES } from "../constants/phProvinces";

// ── Province color matching (same as Dashboard) ───────────────────────────────
function buildProvinceColorMap(provinceAggs) {
  const colorMap = {};
  if (!provinceAggs?.length) return colorMap;
  for (const agg of provinceAggs) {
    const pname = (agg.provinces?.name || "").toLowerCase();
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
        emotion_dist: agg.emotion_dist,
      };
    }
  }
  return colorMap;
}

// ── Sidebar detail panel ─────────────────────────────────────────────────────
function SidebarContent({ selected, selectedProvince, inView, period, onClose, bp, T }) {
  const esiColor = v => v > 0.6 ? "#10b981" : v > 0.4 ? T.amber : T.rose;

  if (!selected && !selectedProvince) return (
    <div style={{ padding:"2rem 1.25rem" }}>
      <EmptyState icon="◉" title="Select a province or city"
        body="Hover over a province to see its dominant emotion. Click a city dot to see detailed data." />
    </div>
  );

  const data = selected || selectedProvince;
  const isLgu = !!selected;
  const name = isLgu ? data.lgus?.name : data.provinceName;
  const dist = data.emotion_dist || {};
  const dominant = data.dominant_emotion || data.dominant;
  const em = EMOTION_MAP[dominant];
  const distEntries = Object.entries(dist)
    .map(([key, pct]) => ({ key, pct: Math.round(pct*100), ...EMOTION_MAP[key] }))
    .sort((a,b) => b.pct - a.pct);

  return (
    <div>
      <div style={{ padding:"1.25rem", borderBottom:`1px solid ${T.border}` }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
          <div>
            <div style={{ fontFamily:"'Playfair Display',serif", fontSize:"1.2rem",
              fontWeight:700, lineHeight:1.2, marginBottom:"0.2rem" }}>{name}</div>
            <div style={{ fontFamily:"DM Mono", fontSize:"0.5rem", color:T.muted }}>
              {isLgu ? "City / Municipality" : "Province"} ·{" "}
              {(data.submission_count || data.count)?.toLocaleString()} submissions ·{" "}
              {period === "all" ? "All time" : period}
            </div>
          </div>
          {bp !== "desktop" && (
            <button onClick={onClose}
              style={{ background:"none", border:`1px solid ${T.border}`, color:T.muted,
                padding:"0.25rem 0.5rem", fontFamily:"DM Mono", fontSize:"0.5rem",
                cursor:"pointer", flexShrink:0, marginLeft:"0.5rem" }}>✕</button>
          )}
        </div>

        {em && (
          <div style={{ display:"flex", alignItems:"center", gap:"0.4rem",
            background:`${em.hex}10`, border:`1px solid ${em.hex}30`,
            padding:"0.5rem 0.65rem", marginTop:"0.75rem", marginBottom:"0.75rem" }}>
            <EmotionIcon icon={em.icon} color={em.hex} size={13} />
            <span style={{ fontFamily:"DM Mono", fontSize:"0.56rem",
              color:em.hex, textTransform:"capitalize" }}>
              {dominant} · {Math.round((dist[dominant]||0)*100)}%
            </span>
          </div>
        )}

        <div style={{ display:"flex", flexDirection:"column", gap:"0.45rem" }}>
          {distEntries.map((e, i) => (
            <EmotionBar key={e.key} name={e.name||e.key} pct={e.pct}
              hex={e.hex||T.muted} inView={inView} delay={i*50} />
          ))}
        </div>
      </div>

      <div style={{ padding:"1rem 1.25rem", display:"grid",
        gridTemplateColumns:"1fr 1fr", gap:"0.5rem" }}>
        <ScoreCard label="ESI" value={data.esi}
          desc={data.esi>0.6?"Stable":data.esi>0.4?"Moderate":"Turbulent"}
          color={esiColor(data.esi)} fill={(data.esi||0)*100} />
        <ScoreCard label="HDR" value={data.hdr}
          desc={data.hdr>1?"Hope-leaning":"Despair-leaning"}
          color={data.hdr>1?T.teal:T.rose} fill={Math.min((data.hdr||0)/2*100,100)} />
        {isLgu && (
          <>
            <ScoreCard label="Velocity"
              value={data.velocity!==null?`${data.velocity>0?"+":""}${data.velocity}`:"—"}
              desc="Rate of change"
              color={data.velocity>0?"#10b981":data.velocity<0?T.rose:T.muted}
              fill={Math.abs(data.velocity||0)*300} />
            <ScoreCard label="Submissions" value={data.submission_count?.toLocaleString()}
              desc={`${period === "all" ? "All time" : period} window`}
              color={T.text} fill={40} />
          </>
        )}
      </div>
    </div>
  );
}

export default function MapPage({ openModal }) {
  const T = useT();
  const bp = useBreakpoint();
  const [lgus, setLgus]                     = useState([]);
  const [provinceAggs, setProvinceAggs]      = useState([]);
  const [loading, setLoading]               = useState(true);
  const [period, setPeriod]                 = useState("all");
  const [selectedLgu, setSelectedLgu]       = useState(null);
  const [selectedProvince, setSelectedProvince] = useState(null);
  const [sidebarOpen, setSidebarOpen]       = useState(false);
  const [hoveredProvince, setHoveredProvince] = useState(null);
  const [ref, inView] = useInView(0.05);

  useEffect(() => {
    setLoading(true);
    Promise.all([getLGUAggregations(period), getProvinceAggregations(period)])
      .then(([lguData, provData]) => {
        setLgus(lguData);
        setProvinceAggs(provData);
        if (lguData.length > 0) setSelectedLgu(lguData[0]);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [period]);

  const provinceColorMap = useMemo(
    () => buildProvinceColorMap(provinceAggs),
    [provinceAggs]
  );

  const handleLguSelect = (lgu) => {
    setSelectedLgu(lgu);
    setSelectedProvince(null);
    if (bp !== "desktop") setSidebarOpen(true);
  };

  const handleProvinceSelect = (pc) => {
    setSelectedProvince(pc);
    setSelectedLgu(null);
    if (bp !== "desktop") setSidebarOpen(true);
  };

  // NAV_HEIGHT offset so sidebar doesn't get covered
  const NAV_H = 56;

  return (
    <div>
      <div style={{ padding:bp==="mobile"?"0 1.25rem":"0" }}>
        <PageHeader label="Emotional Heatmap" title="Cities of Feeling"
          live={lgus.length > 0}
          subtitle="Provinces colored by dominant emotion. Active cities shown as dots. Select to explore data." />
      </div>

      {/* Period selector */}
      <div style={{ padding:bp==="mobile"?"0 1.25rem 1rem":"0 0 1rem",
        display:"flex", alignItems:"center", gap:"0.35rem", flexWrap:"wrap" }}>
        {["7d","30d","90d","all"].map(t => (
          <button key={t} onClick={() => setPeriod(t)}
            style={{ padding:"0.28rem 0.65rem", fontFamily:"DM Mono", fontSize:"0.56rem",
              letterSpacing:"0.06em", border:`1px solid ${period===t?T.amber:T.border}`,
              background:period===t?`${T.amber}15`:"none",
              color:period===t?T.amber:T.muted, cursor:"pointer", transition:"all 0.2s" }}>
            {t === "all" ? "ALL TIME" : t.toUpperCase()}
          </button>
        ))}
        {/* City quick-select on mobile */}
        {bp === "mobile" && lgus.map(a => {
          const em = EMOTION_MAP[a.dominant_emotion];
          return (
            <button key={a.id} onClick={() => handleLguSelect(a)}
              style={{ padding:"0.25rem 0.55rem", fontFamily:"DM Mono", fontSize:"0.5rem",
                border:`1px solid ${selectedLgu?.id===a.id?(em?.hex||T.amber):T.border}`,
                background:selectedLgu?.id===a.id?`${em?.hex||T.amber}15`:"none",
                color:selectedLgu?.id===a.id?(em?.hex||T.amber):T.muted,
                cursor:"pointer", transition:"all 0.2s" }}>
              {a.lgus?.name}
            </button>
          );
        })}
      </div>

      {/* Mobile sidebar — offset below nav */}
      {bp !== "desktop" && sidebarOpen && (
        <div style={{ position:"fixed", inset:0, zIndex:210,
          background:"rgba(0,0,0,0.75)", backdropFilter:"blur(4px)",
          top: NAV_H }}
          onClick={() => setSidebarOpen(false)}>
          <div style={{ position:"absolute", right:0, top:0, bottom:0,
            width:"min(400px,92vw)", background:T.surface,
            borderLeft:`1px solid ${T.border}`, overflowY:"auto" }}
            onClick={e => e.stopPropagation()}>
            <SidebarContent selected={selectedLgu} selectedProvince={selectedProvince}
              inView={inView} period={period}
              onClose={() => setSidebarOpen(false)} bp={bp} T={T} />
          </div>
        </div>
      )}

      {/* Main layout */}
      <div ref={ref} style={{ display:bp==="desktop"?"grid":"block",
        gridTemplateColumns:"1fr 340px", border:`1px solid ${T.border}` }}>

        {/* Map area */}
        <div style={{ borderRight:bp==="desktop"?`1px solid ${T.border}`:"none",
          display:"flex", alignItems:"center", justifyContent:"center",
          padding:bp==="mobile"?"1.5rem 1rem":"2rem",
          borderBottom:bp==="mobile"?`1px solid ${T.border}`:"none" }}>
          {loading ? (
            <Skeleton height={420} width={260} />
          ) : lgus.length === 0 && provinceAggs.length === 0 ? (
            <EmptyState icon="◉" title="Map is waiting"
              body="Cities appear once they reach the submission threshold."
              cta="Submit Your Feeling" onCta={openModal} />
          ) : (
            <div style={{ width:"100%", maxWidth:bp==="mobile"?280:360 }}>
              <svg viewBox="0 0 300 500"
                style={{ width:"100%", filter:"drop-shadow(0 2px 32px rgba(0,0,0,0.55))" }}>

                {/* Province fills */}
                {PH_PROVINCES.map(prov => {
                  const pc = provinceColorMap[prov.id];
                  const isHov  = hoveredProvince === prov.id;
                  const isSel  = selectedProvince?.id === prov.id;
                  const active = isHov || isSel;
                  const fill   = pc?.hex || "#1a2535";
                  const opacity = pc ? (active ? 0.82 : 0.45) : 0.07;

                  // Scale paths from 560x760 → 300x500
                  const scaledD = prov.d.replace(/(-?\d+\.?\d*),(-?\d+\.?\d*)/g,
                    (_, x, y) => `${(parseFloat(x)*300/560).toFixed(1)},${(parseFloat(y)*500/760).toFixed(1)}`
                  );

                  return (
                    <path key={prov.id}
                      d={scaledD}
                      fill={fill}
                      fillOpacity={opacity}
                      stroke={active && pc ? fill : "rgba(255,255,255,0.12)"}
                      strokeWidth={active ? 1.2 : 0.4}
                      style={{ cursor: pc ? "pointer" : "default", transition:"all 0.2s",
                        filter: active && pc ? `drop-shadow(0 0 6px ${fill}70)` : "none" }}
                      onMouseEnter={() => setHoveredProvince(prov.id)}
                      onMouseLeave={() => setHoveredProvince(null)}
                      onClick={() => pc && handleProvinceSelect({ ...pc, id: prov.id })}
                    >
                      <title>{prov.name}{pc ? ` — ${pc.dominant}` : " — no data"}</title>
                    </path>
                  );
                })}

                {/* City dots */}
                {lgus.map(a => {
                  const em = EMOTION_MAP[a.dominant_emotion];
                  const isSel = selectedLgu?.id === a.id;
                  const lat = a.lgus?.lat;
                  const lng = a.lgus?.lng;
                  if (!lat || !lng) return null;
                  const x = ((lng - 116.5) / (127 - 116.5)) * 260 + 20;
                  const y = ((21.8 - lat) / (21.8 - 4.2)) * 460 + 20;
                  return (
                    <g key={a.id} onClick={() => handleLguSelect(a)} style={{ cursor:"pointer" }}>
                      <circle cx={x} cy={y} r={isSel?14:8}
                        fill={em?.hex||T.amber} opacity={0.18} style={{ transition:"r 0.2s" }} />
                      <circle cx={x} cy={y} r={isSel?6:4}
                        fill={em?.hex||T.amber} opacity={isSel?1:0.88}
                        stroke={isSel?"#fff":"rgba(255,255,255,0.35)"}
                        strokeWidth={isSel?1.5:0.5}
                        style={{ transition:"all 0.25s",
                          filter:isSel?`drop-shadow(0 0 7px ${em?.hex||T.amber})`:"none" }} />
                      {isSel && (
                        <text x={x+9} y={y+3} fill="rgba(255,255,255,0.85)"
                          fontSize="6.5" fontFamily="DM Mono">{a.lgus?.name}</text>
                      )}
                    </g>
                  );
                })}
              </svg>

              <div style={{ fontFamily:"DM Mono", fontSize:"0.48rem", color:T.muted,
                textAlign:"center", marginTop:"0.5rem" }}>
                {provinceAggs.filter(p=>p.meets_threshold).length} provinces ·{" "}
                {lgus.length} active {lgus.length===1?"LGU":"LGUs"}
              </div>
            </div>
          )}
        </div>

        {/* Desktop sidebar */}
        {bp === "desktop" && (
          <div style={{ overflowY:"auto", maxHeight:620 }}>
            <SidebarContent selected={selectedLgu} selectedProvince={selectedProvince}
              inView={inView} period={period}
              onClose={() => {}} bp={bp} T={T} />
          </div>
        )}
      </div>
    </div>
  );
}
