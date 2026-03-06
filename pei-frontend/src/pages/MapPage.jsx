import { useState, useEffect } from "react";
import { getLGUAggregations } from "../lib/supabase";
import { useT } from "../context/ThemeContext";
import { EMOTION_MAP } from "../constants/emotions";
import { useBreakpoint } from "../hooks/useBreakpoint";
import { useInView } from "../hooks/useInView";
import { PageHeader, EmotionBar, ScoreCard, Skeleton, EmptyState } from "../components/shared/ui/index";
import EmotionIcon from "../components/shared/EmotionIcon";

// Moved outside MapPage to prevent remount on every render
function SidebarContent({ selected, inView, period, onClose, bp, T }) {
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
            <button onClick={onClose}
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
          desc={`${period} window`} color={T.text} fill={40} />
      </div>
    </div>
  );
}

export default function MapPage({ openModal }) {
  const T = useT();
  const bp = useBreakpoint();
  const [lgus, setLgus]           = useState([]);
  const [loading, setLoading]     = useState(true);
  const [period, setPeriod]       = useState("7d");
  const [selected, setSelected]   = useState(null);
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

  return (
    <div>
      <div style={{ padding:bp==="mobile"?"0 1.25rem":"0" }}>
        <PageHeader label="Emotional Heatmap" title="Cities of Feeling"
          live={lgus.length > 0}
          subtitle="Each city appears once it reaches 50 submissions. Click to explore emotional composition and stability data." />
      </div>

      <div style={{ padding:bp==="mobile"?"0 1.25rem 1rem":"0 0 1rem",
        display:"flex", alignItems:"center", gap:"0.5rem", flexWrap:"wrap" }}>
        {["7d","30d","90d","all"].map(t => (
          <button key={t} onClick={() => setPeriod(t)}
            style={{ padding:"0.28rem 0.65rem", fontFamily:"DM Mono", fontSize:"0.56rem",
              letterSpacing:"0.06em", border:`1px solid ${period===t?T.amber:T.border}`,
              background:period===t?`${T.amber}15`:"none",
              color:period===t?T.amber:T.muted, cursor:"pointer", transition:"all 0.2s" }}>
            {t === 'all' ? 'ALL TIME' : t.toUpperCase()}
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
          onClick={() => setSidebarOpen(false)}>
          <div style={{ position:"absolute", right:0, top:0, bottom:0,
            width:"min(400px,92vw)", background:T.surface,
            borderLeft:`1px solid ${T.border}`, overflowY:"auto" }}
            onClick={e => e.stopPropagation()}>
            <SidebarContent
              selected={selected} inView={inView} period={period}
              onClose={() => setSidebarOpen(false)} bp={bp} T={T} />
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
            <SidebarContent
              selected={selected} inView={inView} period={period}
              onClose={() => setSidebarOpen(false)} bp={bp} T={T} />
          </div>
        )}
      </div>
    </div>
  );
}
