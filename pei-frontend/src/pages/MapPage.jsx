import { useState, useEffect } from "react";
import { getLGUAggregations, getProvinceAggregations } from "../lib/supabase";
import { useT } from "../context/ThemeContext";
import { EMOTIONS, EMOTION_MAP } from "../constants/emotions";
import { useBreakpoint } from "../hooks/useBreakpoint";
import { useInView } from "../hooks/useInView";
import { PageHeader, EmotionBar, ScoreCard, Skeleton, EmptyState } from "../components/shared/ui/index";
import EmotionIcon from "../components/shared/EmotionIcon";
import PhilippinesMap from "../components/shared/PhilippinesMap";

const PERIOD_LABELS = {
  "7d":  "Week 1 · Days 1–7",
  "30d": "Month 1 · Days 1–30",
  "90d": "Quarter 1 · Days 1–90",
  "all": "All Time",
};

const NAV_H = 56; // fixed nav height on mobile

// ── City detail sidebar ───────────────────────────────────────────────────────
function SidebarContent({ selected, selectedProvince, inView, period, onClose, bp, T }) {
  const esiColor = v => v > 0.6 ? "#10b981" : v > 0.4 ? T.amber : T.rose;

  if (!selected && !selectedProvince) return (
    <div style={{ padding:"2rem 1.25rem" }}>
      <EmptyState icon="◉" title="Select a province or city"
        body="Click a province to see its dominant emotion. Click a city dot for detailed breakdown." />
    </div>
  );

  const isLgu = !!selected;
  const data  = selected || selectedProvince;
  const name  = isLgu ? data.lgus?.name : data.name;
  const dist  = data.emotion_dist || data.dist || {};
  const dominant = data.dominant_emotion || data.dominant;
  const em    = EMOTION_MAP[dominant];
  const distEntries = Object.entries(dist)
    .map(([key, pct]) => ({ key, pct: Math.round(pct*100), ...EMOTION_MAP[key] }))
    .sort((a,b) => b.pct - a.pct);

  return (
    <div>
      <div style={{ padding:"1.25rem", borderBottom:`1px solid ${T.border}` }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
          <div>
            <div style={{ fontFamily:"'Playfair Display',serif",
              fontSize:"1.2rem", fontWeight:700, lineHeight:1.2, marginBottom:"0.2rem" }}>
              {name}
            </div>
            <div style={{ fontFamily:"DM Mono", fontSize:"0.5rem", color:T.muted }}>
              {isLgu
                ? `${data.lgus?.provinces?.name || ""} · ${data.lgus?.lgu_type || "LGU"}`
                : "Province"
              } · {(data.submission_count || data.count || 0).toLocaleString()} submissions · {PERIOD_LABELS[period]}
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
              value={data.velocity!=null?`${data.velocity>0?"+":""}${data.velocity}`:"—"}
              desc="ESI rate of change"
              color={data.velocity>0?"#10b981":data.velocity<0?T.rose:T.muted}
              fill={Math.abs(data.velocity||0)*300} />
            <ScoreCard label="Submissions"
              value={data.submission_count?.toLocaleString()}
              desc={PERIOD_LABELS[period]} color={T.text} fill={40} />
          </>
        )}
      </div>
    </div>
  );
}

export default function MapPage({ openModal }) {
  const T   = useT();
  const bp  = useBreakpoint();
  const [ref, inView] = useInView(0.05);

  const [lgus,            setLgus]           = useState([]);
  const [provinceAggs,    setProvinceAggs]    = useState([]);
  const [loading,         setLoading]         = useState(true);
  const [period,          setPeriod]          = useState("all");
  const [selectedLgu,     setSelectedLgu]     = useState(null);
  const [selectedProv,    setSelectedProv]    = useState(null);
  const [sidebarOpen,     setSidebarOpen]     = useState(false);

  useEffect(() => {
    setLoading(true);
    Promise.all([getLGUAggregations(period), getProvinceAggregations(period)])
      .then(([lguData, provData]) => {
        setLgus(lguData);
        setProvinceAggs(provData);
        if (lguData.length > 0) { setSelectedLgu(lguData[0]); setSelectedProv(null); }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [period]);

  const handleLguSelect = (lgu) => {
    setSelectedLgu(lgu);
    setSelectedProv(null);
    if (bp !== "desktop") setSidebarOpen(true);
  };

  const handleProvSelect = (pc) => {
    setSelectedProv(pc);
    setSelectedLgu(null);
    if (bp !== "desktop") setSidebarOpen(true);
  };

  return (
    <div>
      <div style={{ padding:bp==="mobile"?"0 1.25rem":"0" }}>
        <PageHeader label="Emotional Heatmap" title="Cities of Feeling"
          live={lgus.length > 0}
          subtitle="Province boundaries colored by dominant emotion. City dots show active LGUs. Select to explore." />
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
        <span style={{ fontFamily:"DM Mono", fontSize:"0.5rem", color:T.muted }}>
          {PERIOD_LABELS[period]}
        </span>
      </div>

      {/* Mobile city quick-select */}
      {bp === "mobile" && lgus.length > 0 && (
        <div style={{ padding:"0 1.25rem 0.75rem", display:"flex", gap:"0.3rem", flexWrap:"wrap" }}>
          {lgus.map(a => {
            const em = EMOTION_MAP[a.dominant_emotion];
            return (
              <button key={a.id} onClick={() => handleLguSelect(a)}
                style={{ padding:"0.22rem 0.5rem", fontFamily:"DM Mono", fontSize:"0.5rem",
                  border:`1px solid ${selectedLgu?.id===a.id?(em?.hex||T.amber):T.border}`,
                  background:selectedLgu?.id===a.id?`${em?.hex||T.amber}15`:"none",
                  color:selectedLgu?.id===a.id?(em?.hex||T.amber):T.muted,
                  cursor:"pointer", transition:"all 0.2s" }}>
                {a.lgus?.name}
              </button>
            );
          })}
        </div>
      )}

      {/* Mobile sidebar — below nav */}
      {bp !== "desktop" && sidebarOpen && (
        <div style={{ position:"fixed", inset:0, top:NAV_H, zIndex:210,
          background:"rgba(0,0,0,0.75)", backdropFilter:"blur(4px)" }}
          onClick={() => setSidebarOpen(false)}>
          <div style={{ position:"absolute", right:0, top:0, bottom:0,
            width:"min(400px,92vw)", background:T.surface,
            borderLeft:`1px solid ${T.border}`, overflowY:"auto" }}
            onClick={e => e.stopPropagation()}>
            <SidebarContent selected={selectedLgu} selectedProvince={selectedProv}
              inView={inView} period={period}
              onClose={() => setSidebarOpen(false)} bp={bp} T={T} />
          </div>
        </div>
      )}

      {/* Main layout */}
      <div ref={ref} style={{ display:bp==="desktop"?"grid":"block",
        gridTemplateColumns:"1fr 340px", border:`1px solid ${T.border}` }}>

        {/* Map */}
        <div style={{ display:"flex", alignItems:"center", justifyContent:"center",
          padding:bp==="mobile"?"1.5rem 1rem":"2rem",
          borderRight:bp==="desktop"?`1px solid ${T.border}`:"none",
          borderBottom:bp==="mobile"?`1px solid ${T.border}`:"none" }}>
          {loading ? (
            <Skeleton height={460} width={280} />
          ) : lgus.length === 0 && provinceAggs.length === 0 ? (
            <EmptyState icon="◉" title="Map is waiting"
              body="Cities and provinces appear once they reach the submission threshold."
              cta="Submit Your Feeling" onCta={openModal} />
          ) : (
            <div style={{ width:"100%", maxWidth:bp==="mobile"?280:380 }}>
              <PhilippinesMap
                provinceAggs={provinceAggs}
                lgus={lgus}
                selected={selectedLgu}
                onSelectLgu={handleLguSelect}
                onSelectProvince={handleProvSelect}
                width={bp==="mobile"?280:380}
                T={T}
              />
              <div style={{ fontFamily:"DM Mono", fontSize:"0.48rem", color:T.muted,
                textAlign:"center", marginTop:"0.5rem" }}>
                {provinceAggs.filter(p=>p.meets_threshold).length} provinces ·{" "}
                {lgus.length} active {lgus.length===1?"LGU":"LGUs"} ·{" "}
                Click province or city dot
              </div>
            </div>
          )}
        </div>

        {/* Desktop sidebar */}
        {bp === "desktop" && (
          <div style={{ overflowY:"auto", maxHeight:680 }}>
            <SidebarContent selected={selectedLgu} selectedProvince={selectedProv}
              inView={inView} period={period} onClose={() => {}} bp={bp} T={T} />
          </div>
        )}
      </div>
    </div>
  );
}
