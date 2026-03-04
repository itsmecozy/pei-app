import { useState, useEffect } from "react";
import { getNational, getLGUAggregations } from "../lib/supabase";
import { T } from "../constants/tokens";
import { EMOTION_MAP } from "../constants/emotions";
import { useBreakpoint } from "../hooks/useBreakpoint";
import { useInView } from "../hooks/useInView";
import { PageHeader, Skeleton, EmptyState } from "../components/shared/ui/index";

export default function DashboardPage({ navigate }) {
  const bp = useBreakpoint();
  const [ref, inView]           = useInView();
  const [national, setNational] = useState(null);
  const [lgus, setLgus]         = useState([]);
  const [loading, setLoading]   = useState(true);
  const [period, setPeriod]     = useState("7d");

  useEffect(() => {
    setLoading(true);
    Promise.all([getNational(period), getLGUAggregations(period)])
      .then(([nat, lguData]) => { setNational(nat); setLgus(lguData); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [period]);

  const hasData  = national && national.submission_count > 0;
  const esiColor = v => v > 0.6 ? "#10b981" : v > 0.4 ? T.amber : T.rose;

  return (
    <div>
      <div style={{ padding:bp==="mobile"?"0 1.25rem":"0" }}>
        <PageHeader label="Dashboard" title="National Emotional Pulse" live={hasData}
          subtitle="Real-time aggregated data from anonymous submissions across Philippine cities and municipalities." />
      </div>

      <div style={{ padding:bp==="mobile"?"0 1.25rem 1.25rem":"0 0 1.25rem", display:"flex", gap:"0.25rem" }}>
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

      <div ref={ref} style={{ display:"grid",
        gridTemplateColumns:bp==="mobile"?"1fr 1fr":bp==="tablet"?"1fr 1fr":"repeat(4,1fr)",
        border:`1px solid ${T.border}`, borderBottom:"none" }}>
        {[
          { label:"Emotional Stability",  value:national?.esi, desc:"National ESI",
            color:national?.esi ? esiColor(national.esi) : T.muted, fill:(national?.esi||0)*100 },
          { label:"Hope / Despair Ratio", value:national?.hdr, desc:"National HDR",
            color:national?.hdr>1?T.teal:T.rose, fill:Math.min((national?.hdr||0)/2*100,100) },
          { label:"Dominant Emotion",
            value:national?.dominant_emotion
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
                  color:m.color, lineHeight:1, textTransform:"capitalize" }}>{m.value ?? "—"}</div>
            }
            <div style={{ fontFamily:"DM Mono", fontSize:"0.52rem",
              color:T.muted, marginTop:"0.3rem" }}>{m.desc}</div>
          </div>
        ))}
      </div>

      <div style={{ padding:bp==="mobile"?"2rem 1.25rem":"2rem 0 0" }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"1rem" }}>
          <div style={{ fontFamily:"DM Mono", fontSize:"0.54rem", letterSpacing:"0.16em",
            textTransform:"uppercase", color:T.muted }}>Active Cities · {period}</div>
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
            body="Cities appear once they reach 50 submissions. Be the first to submit from your city."
            cta="Submit Your Feeling" onCta={() => navigate("home")} />
        ) : (
          <div style={{ display:"grid",
            gridTemplateColumns:bp==="mobile"?"1fr":bp==="tablet"?"1fr 1fr":"repeat(3,1fr)",
            gap:1, background:T.border, border:`1px solid ${T.border}` }}>
            {lgus.map(a => {
              const dist     = a.emotion_dist || {};
              const dominant = a.dominant_emotion;
              const em       = EMOTION_MAP[dominant];
              const vc       = a.velocity > 0 ? "#10b981" : a.velocity < 0 ? T.rose : T.muted;
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
                    <span style={{ color:vc }}>{a.velocity > 0 ? "↑" : a.velocity < 0 ? "↓" : "→"}</span>
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
