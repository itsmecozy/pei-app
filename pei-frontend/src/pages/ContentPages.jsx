import { useState, useEffect } from "react";
import { getLGUAggregations } from "../lib/supabase";
import { useT } from "../context/ThemeContext";
import { EMOTIONS, EMOTION_MAP } from "../constants/emotions";
import { useBreakpoint } from "../hooks/useBreakpoint";
import { useInView } from "../hooks/useInView";
import { PageHeader, EmotionBar, ScoreCard, Skeleton, EmptyState } from "../components/shared/ui/index";
import EmotionIcon from "../components/shared/EmotionIcon";

// ─── TRENDS ───────────────────────────────────────────────────────────────────
export function TrendsPage() {
  const T = useT();
  const bp = useBreakpoint();
  const [lgus, setLgus]         = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading]   = useState(true);
  const [period, setPeriod]     = useState("30d");
  const [ref, inView]           = useInView(0.05);

  useEffect(() => {
    setLoading(true);
    getLGUAggregations(period)
      .then(data => {
        setLgus(data);
        setSelected(prev => {
          const match = prev && data.find(d => d.lgu_id === prev.lgu_id);
          return match || (data.length > 0 ? data[0] : null);
        });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [period]);

  const dist        = selected?.emotion_dist || {};
  const distEntries = Object.entries(dist)
    .map(([key, pct]) => ({ key, pct: Math.round(pct*100), ...EMOTION_MAP[key] }))
    .sort((a,b) => b.pct - a.pct);

  return (
    <div>
      <div style={{ padding:bp==="mobile"?"0 1.25rem":"0" }}>
        <PageHeader label="Emotional Velocity" title="How Fast Feelings Shift"
          live={lgus.length > 0}
          subtitle="Velocity tracks the rate of emotional change. A city moving from grief to hope in 7 days tells a different story than one taking 90." />
      </div>

      {/* Period selector */}
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

      {loading ? (
        <div style={{ padding:bp==="mobile"?"0 1.25rem":"0" }}><Skeleton height={200} /></div>
      ) : lgus.length === 0 ? (
        <div style={{ padding:bp==="mobile"?"0 1.25rem":"0" }}>
          <EmptyState icon="↗" title="No trend data yet"
            body="Trend analysis appears once cities start accumulating submissions." />
        </div>
      ) : (
        <div ref={ref} style={{ display:"grid",
          gridTemplateColumns:bp==="desktop"?"1fr 1fr":"1fr",
          gap:bp==="desktop"?"3rem":"2rem", padding:bp==="mobile"?"0 1.25rem":"0" }}>
          <div>
            <div style={{ fontFamily:"DM Mono", fontSize:"0.54rem", letterSpacing:"0.14em",
              textTransform:"uppercase", color:T.muted, marginBottom:"0.75rem" }}>Select City</div>
            <div style={{ display:"flex", flexWrap:"wrap", gap:"0.35rem", marginBottom:"1.5rem" }}>
              {lgus.map(a => {
                const vc = a.velocity > 0 ? "#10b981" : a.velocity < 0 ? T.rose : T.muted;
                return (
                  <button key={a.id} onClick={() => setSelected(a)}
                    style={{ padding:"0.35rem 0.75rem", fontFamily:"DM Mono", fontSize:"0.56rem",
                      letterSpacing:"0.06em",
                      border:`1px solid ${selected?.id===a.id?T.amber:T.border}`,
                      background:selected?.id===a.id?`${T.amber}15`:"none",
                      color:selected?.id===a.id?T.amber:T.muted,
                      cursor:"pointer", transition:"all 0.2s",
                      display:"flex", alignItems:"center", gap:"0.35rem" }}>
                    <span style={{ color:vc }}>{a.velocity > 0 ? "↑" : a.velocity < 0 ? "↓" : "→"}</span>
                    {a.lgus?.name}
                  </button>
                );
              })}
            </div>
            {selected && (
              <div style={{ background:T.surface, border:`1px solid ${T.border}`, padding:"1.25rem" }}>
                <div style={{ fontFamily:"DM Mono", fontSize:"0.52rem", letterSpacing:"0.12em",
                  textTransform:"uppercase", color:T.muted, marginBottom:"0.75rem" }}>
                  Emotion Distribution · {selected.lgus?.name}
                </div>
                <div style={{ display:"flex", flexDirection:"column", gap:"0.5rem" }}>
                  {distEntries.map((e, i) => (
                    <EmotionBar key={e.key} name={e.name||e.key} pct={e.pct}
                      hex={e.hex||T.muted} inView={inView} delay={i*60} />
                  ))}
                </div>
              </div>
            )}
          </div>

          {selected && (
            <div>
              <div style={{ fontFamily:"DM Mono", fontSize:"0.54rem", letterSpacing:"0.14em",
                textTransform:"uppercase", color:T.muted, marginBottom:"0.75rem" }}>
                Metrics · {selected.lgus?.name}
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0.6rem", marginBottom:"1.25rem" }}>
                <ScoreCard label="ESI" value={selected.esi}
                  desc={selected.esi>0.6?"Stable":selected.esi>0.4?"Moderate":"Turbulent"}
                  color={selected.esi>0.6?"#10b981":selected.esi>0.4?T.amber:T.rose}
                  fill={(selected.esi||0)*100} />
                <ScoreCard label="HDR" value={selected.hdr}
                  desc={selected.hdr>1?"Hope-leaning":"Despair-leaning"}
                  color={selected.hdr>1?T.teal:T.rose}
                  fill={Math.min((selected.hdr||0)/2*100,100)} />
                <ScoreCard label="Velocity"
                  value={selected.velocity!==null?`${selected.velocity>0?"+":""}${selected.velocity}`:"—"}
                  desc={`${period === "all" ? "All time" : period} rate of change`}
                  color={selected.velocity>0?"#10b981":selected.velocity<0?T.rose:T.muted}
                  fill={Math.abs(selected.velocity||0)*300} />
                <ScoreCard label="Submissions" value={selected.submission_count?.toLocaleString()}
                  desc={`${period === "all" ? "All time" : period} window`} color={T.text} fill={40} />
              </div>
              <div style={{ padding:"1rem", border:`1px solid ${T.border}`, background:T.bg }}>
                <div style={{ fontFamily:"DM Mono", fontSize:"0.52rem", letterSpacing:"0.12em",
                  textTransform:"uppercase", color:T.muted, marginBottom:"0.4rem" }}>Velocity Reading</div>
                <p style={{ fontFamily:"'Playfair Display',serif", fontStyle:"italic",
                  fontSize:"0.9rem", lineHeight:1.6, color:T.text }}>
                  {selected.lgus?.name} is {
                    selected.velocity > 0.1 ? "rapidly stabilizing — emotional diversity increasing." :
                    selected.velocity < -0.1 ? "narrowing — one emotion starting to dominate." :
                    "holding steady — no significant emotional shift this week."
                  }
                </p>
                <div style={{ fontFamily:"DM Mono", fontSize:"0.5rem", color:T.muted, marginTop:"0.3rem" }}>
                  Computed from real submissions · {new Date().toLocaleDateString("en-PH", { month:"long", year:"numeric" })}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {lgus.length > 1 && (
        <div style={{ padding:bp==="mobile"?"2rem 1.25rem 0":"2.5rem 0 0" }}>
          <div style={{ fontFamily:"DM Mono", fontSize:"0.54rem", letterSpacing:"0.16em",
            textTransform:"uppercase", color:T.muted, marginBottom:"1rem" }}>
            All Active Cities · ESI Comparison
          </div>
          <div style={{ border:`1px solid ${T.border}` }}>
            {lgus.map((a, i) => {
              const vc       = a.velocity > 0 ? "#10b981" : a.velocity < 0 ? T.rose : T.muted;
              const esiColor = a.esi>0.6?"#10b981":a.esi>0.4?T.amber:T.rose;
              return (
                <div key={a.id} style={{ display:"grid",
                  gridTemplateColumns:"140px 1fr 60px", alignItems:"center",
                  gap:"1rem", padding:"0.85rem 1.1rem",
                  borderBottom:i<lgus.length-1?`1px solid ${T.border}`:"none",
                  background:selected?.id===a.id?T.surface2:"none",
                  cursor:"pointer", transition:"background 0.2s" }}
                  onClick={() => setSelected(a)}>
                  <div>
                    <div style={{ fontFamily:"DM Mono", fontSize:"0.54rem",
                      color:selected?.id===a.id?T.amber:T.text }}>{a.lgus?.name}</div>
                    <div style={{ fontFamily:"DM Mono", fontSize:"0.48rem",
                      color:vc, textTransform:"capitalize" }}>
                      {a.velocity > 0 ? "↑" : a.velocity < 0 ? "↓" : "→"} {a.dominant_emotion}
                    </div>
                  </div>
                  <div style={{ height:4, background:"rgba(255,255,255,0.05)", borderRadius:2, position:"relative" }}>
                    <div style={{ position:"absolute", top:0, left:0, bottom:0,
                      width:`${(a.esi||0)*100}%`, background:esiColor, borderRadius:2, transition:"width 1s" }} />
                  </div>
                  <div style={{ fontFamily:"DM Mono", fontSize:"0.6rem",
                    color:esiColor, textAlign:"right", fontVariantNumeric:"tabular-nums" }}>{a.esi}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── SEASONAL ─────────────────────────────────────────────────────────────────
const SEASONAL = [
  { month:"Jan", dominant:"Determination", hex:"#3b82f6", note:"New year resolve" },
  { month:"Feb", dominant:"Longing",       hex:"#6366f1", note:"Valentine & OFW separation" },
  { month:"Mar", dominant:"Anxiety",       hex:"#f59e0b", note:"Summer heat & transition" },
  { month:"Apr", dominant:"Relief",        hex:"#10b981", note:"Holy Week stillness" },
  { month:"May", dominant:"Hope",          hex:"#2dd4bf", note:"Election anticipation" },
  { month:"Jun", dominant:"Anxiety",       hex:"#f59e0b", note:"Typhoon season begins" },
  { month:"Jul", dominant:"Grief",         hex:"#8b5cf6", note:"Mid-year exhaustion" },
  { month:"Aug", dominant:"Anger",         hex:"#ef4444", note:"Political frustration" },
  { month:"Sep", dominant:"Longing",       hex:"#6366f1", note:"BER months, OFW season" },
  { month:"Oct", dominant:"Grief",         hex:"#8b5cf6", note:"Undas, loss & memory" },
  { month:"Nov", dominant:"Longing",       hex:"#6366f1", note:"Undas & Christmas longing" },
  { month:"Dec", dominant:"Hope",          hex:"#2dd4bf", note:"Christmas & family reunion" },
];

const CULTURAL = [
  "January carries the energy of new beginnings — collective resolve to break patterns, start anew, face the year with intention.",
  "February intensifies longing — Valentine's Day merges with OFW separation anxiety. Distance makes the heart ache louder.",
  "The heat arrives. School transitions, career pivots, and summer uncertainty create a national undercurrent of anxiety.",
  "Holy Week brings stillness. Pilgrimage. Reflection. The country collectively exhales in an unusual, peaceful pause.",
  "Election season creates a paradox — hope and anxiety in tension. The future feels both possible and precarious.",
  "The first typhoons arrive. Anxiety becomes practical, immediate, survival-oriented rather than existential.",
  "Mid-year exhaustion. The initial energy of January has fully dissipated. A heavy collective tiredness sets in.",
  "Political grievances accumulate. Infrastructure failures, rising costs, broken promises — anger crystallizes.",
  "The BER months signal Christmas season, and with it, the longing for family, for those abroad, for simpler times.",
  "Undas. The Philippines stops to mourn collectively — ancestors, recent losses, national tragedies remembered.",
  "Longing peaks as OFWs prepare Christmas returns, families anticipate reunions, and December feels near but not yet.",
  "Christmas arrives. Despite everything, hope. The Filipino capacity for joy under pressure reaches its annual zenith.",
];

export function SeasonalPage() {
  const T = useT();
  const bp = useBreakpoint();
  const [ref, inView]       = useInView(0.05);
  const [hovered, setHovered] = useState(null);
  const [selected, setSelected] = useState(null);
  const currentMonth = new Date().getMonth();
  const active = selected !== null ? selected : hovered;
  const cols   = bp==="mobile"?"repeat(4,1fr)":bp==="tablet"?"repeat(6,1fr)":"repeat(12,1fr)";

  return (
    <div>
      <div style={{ padding:bp==="mobile"?"0 1.25rem":"0" }}>
        <PageHeader label="Seasonal Fingerprint"
          title="The Philippines Has an Emotional Calendar."
          subtitle="These baselines are built from cultural and historical patterns. As PEI collects real data across full calendar years, this page will update to reflect actual seasonal emotion data." />
      </div>

      <div ref={ref} style={{ padding:bp==="mobile"?"0 1.25rem":"0" }}>
        <div style={{ display:"grid", gridTemplateColumns:cols, gap:1,
          background:T.border, border:`1px solid ${T.border}` }}>
          {SEASONAL.map((s, i) => {
            const isNow    = i === currentMonth;
            const isActive = active === i;
            return (
              <div key={s.month}
                style={{ background:isNow?`${s.hex}22`:isActive?`${s.hex}15`:T.surface,
                  padding:bp==="mobile"?"0.85rem 0.3rem":"1.25rem 0.4rem",
                  textAlign:"center", cursor:"pointer", transition:"all 0.2s",
                  position:"relative", outline:isNow?`1px solid ${s.hex}`:"none",
                  opacity:inView?1:0, transform:inView?"none":"translateY(14px)",
                  transitionDelay:`${i*0.04}s` }}
                onMouseEnter={() => setHovered(i)}
                onMouseLeave={() => setHovered(null)}
                onClick={() => setSelected(selected===i?null:i)}>
                {isNow && (
                  <div style={{ position:"absolute", top:3, left:"50%",
                    transform:"translateX(-50%)", fontFamily:"DM Mono",
                    fontSize:"0.4rem", color:s.hex, letterSpacing:"0.08em" }}>NOW</div>
                )}
                <div style={{ fontFamily:"DM Mono", fontSize:"0.5rem", color:T.muted,
                  marginBottom:"0.5rem", marginTop:isNow?"0.5rem":0 }}>{s.month}</div>
                <div style={{ display:"flex", alignItems:"center", justifyContent:"center",
                  marginBottom:"0.4rem", height:"1.4rem" }}>
                  {(() => { const em = EMOTIONS.find(e=>e.name===s.dominant); return em
                    ? <EmotionIcon icon={em.icon} color={em.hex} size={18} />
                    : <span style={{ color:T.muted }}>●</span>; })()}
                </div>
                <div style={{ fontFamily:"DM Mono", fontSize:"0.44rem", color:s.hex,
                  letterSpacing:"0.06em", writingMode:"vertical-rl",
                  textOrientation:"mixed", transform:"rotate(180deg)",
                  margin:"0 auto", height:50, display:"flex", alignItems:"center" }}>
                  {s.dominant}
                </div>
              </div>
            );
          })}
        </div>

        {active !== null && (
          <div style={{ marginTop:1, background:T.surface, border:`1px solid ${T.border}`,
            borderTop:"none", padding:"1.5rem",
            display:"grid", gridTemplateColumns:bp==="mobile"?"1fr":bp==="tablet"?"1fr 1fr":"1fr 1fr 1fr",
            gap:"1.5rem" }}>
            <div>
              <div style={{ fontFamily:"DM Mono", fontSize:"0.52rem", letterSpacing:"0.12em",
                textTransform:"uppercase", color:T.muted, marginBottom:"0.4rem" }}>
                {SEASONAL[active].month} · Dominant Emotion
              </div>
              <div style={{ fontFamily:"'Playfair Display',serif", fontSize:"2rem",
                fontWeight:900, color:SEASONAL[active].hex, lineHeight:1 }}>
                {SEASONAL[active].dominant}
              </div>
              <div style={{ fontFamily:"DM Mono", fontSize:"0.56rem",
                color:T.muted, marginTop:"0.3rem" }}>{SEASONAL[active].note}</div>
            </div>
            <div>
              <div style={{ fontFamily:"DM Mono", fontSize:"0.52rem", letterSpacing:"0.12em",
                textTransform:"uppercase", color:T.muted, marginBottom:"0.4rem" }}>Cultural Context</div>
              <p style={{ fontFamily:"DM Mono", fontSize:"0.6rem", color:T.muted, lineHeight:1.7 }}>
                {CULTURAL[active]}
              </p>
            </div>
            <div>
              <div style={{ fontFamily:"DM Mono", fontSize:"0.52rem", letterSpacing:"0.12em",
                textTransform:"uppercase", color:T.muted, marginBottom:"0.4rem" }}>Baseline Source</div>
              <p style={{ fontFamily:"DM Mono", fontSize:"0.56rem", color:T.muted, lineHeight:1.7 }}>
                These patterns are derived from cultural and historical research.
                As PEI collects real submissions across full calendar years, actual data will replace these baselines month by month.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── ETHICS ───────────────────────────────────────────────────────────────────
export function EthicsPage() {
  const T = useT();
  const bp = useBreakpoint();
  const [ref, inView] = useInView();
  const principles = [
    { icon:"◎", title:"No raw text exposed",           body:"Submissions are processed for emotional signal only. Raw text is never stored publicly or shown individually. Words dissolve; the pattern survives.",                                                     color:T.teal    },
    { icon:"◌", title:"Metadata stripped",             body:"No IP address, no device fingerprint, no session ID stored permanently. Daily rotating salt means hashes become unrecoverable after midnight.",                                                         color:T.amber   },
    { icon:"◈", title:"50-entry minimum",              body:"A city only appears on the map when it reaches 50 submissions. No outlier data, no exposure of isolated individuals.",                                                                                  color:"#a78bfa" },
    { icon:"◉", title:"No individual visualization",  body:"All outputs are aggregated at city level or above. The smallest unit of display is a community, never a person.",                                                                                       color:"#fb923c" },
    { icon:"◷", title:"Pattern survives. Person does not.", body:"The system retains emotional signal. What remains is the shape of collective feeling — never the individual behind it.",                                                                           color:"#10b981" },
    { icon:"◰", title:"Pressure systems, not surveillance", body:"Like weather, not CCTV. The index shows where emotional fronts are building, not who is standing in them.",                                                                                       color:T.rose    },
  ];

  return (
    <div>
      <div style={{ padding:bp==="mobile"?"0 1.25rem":"0" }}>
        <PageHeader label="Ethical Framework" title="We Built the Ethics First. The Product Second." />
      </div>
      <div ref={ref} style={{ display:"grid",
        gridTemplateColumns:bp==="mobile"?"1fr":bp==="tablet"?"1fr 1fr":"repeat(3,1fr)",
        gap:1, background:T.border, border:`1px solid ${T.border}` }}>
        {principles.map((p, i) => (
          <div key={i} style={{ background:T.bg, padding:"1.5rem",
            opacity:inView?1:0, transform:inView?"none":"translateY(16px)",
            transition:`all 0.5s ${i*0.08}s ease` }}>
            <div style={{ fontFamily:"'Playfair Display',serif", fontSize:"2rem",
              color:p.color, opacity:0.5, marginBottom:"0.5rem", lineHeight:1 }}>{p.icon}</div>
            <div style={{ fontFamily:"'Playfair Display',serif", fontSize:"0.95rem",
              fontWeight:700, marginBottom:"0.4rem" }}>{p.title}</div>
            <div style={{ fontFamily:"DM Mono", fontSize:"0.6rem",
              color:T.muted, lineHeight:1.7 }}>{p.body}</div>
          </div>
        ))}
      </div>
      <div style={{ padding:bp==="mobile"?"2rem 1.25rem 0":"2.5rem 0 0" }}>
        <blockquote style={{ fontFamily:"'Playfair Display',serif", fontStyle:"italic",
          fontSize:bp==="mobile"?"1.1rem":"1.5rem", lineHeight:1.5, letterSpacing:"-0.01em",
          borderLeft:`3px solid ${T.amber}`, paddingLeft:"1.25rem", margin:0, maxWidth:680 }}>
          "The Philippines is not a dataset to be exploited. It is a people to be witnessed.
          We built this to listen, not to sell the listening."
        </blockquote>
      </div>
    </div>
  );
}

// ─── METHODOLOGY ──────────────────────────────────────────────────────────────
export function MethodologyPage() {
  const T = useT();
  const bp = useBreakpoint();
  const [ref, inView] = useInView();
  const sections = [
    { icon:"◈", title:"What is PEI?",             color:T.amber,   body:"The Philippines Emotional Index is a voluntary, anonymous emotional census. It collects self-reported emotions from Filipinos across 1,634 cities and municipalities and aggregates them into a real-time national pulse. It is not a scientific survey. It does not claim statistical representativeness. It is a mirror — reflecting what participating Filipinos choose to share." },
    { icon:"◉", title:"How is ESI calculated?",   color:T.teal,    body:"The Emotional Stability Index (ESI) is based on Shannon entropy — a measure of diversity. When submissions are spread evenly across all 8 emotions, ESI approaches 1.0 (stable, diverse). When one emotion dominates, ESI drops toward 0 (turbulent, uniform). ESI ranges from 0 to 1. Above 0.6 is considered stable. Below 0.4 is considered turbulent." },
    { icon:"◷", title:"How is HDR calculated?",   color:"#a78bfa", body:"The Hope / Despair Ratio (HDR) divides the proportion of hope-leaning emotions (hope, relief, determination) by despair-leaning emotions (grief, anger, anxiety, regret, longing). Calm is neutral and sits outside the ratio. An HDR above 1.0 means the city is hope-leaning. Below 1.0 means despair-leaning. Exactly 1.0 means perfect balance." },
    { icon:"↗", title:"What is Velocity?",         color:"#fb923c", body:"Velocity measures how fast ESI is changing. A positive velocity means emotional diversity is increasing — the city is stabilizing. A negative velocity means one emotion is starting to dominate. Velocity is computed by comparing the current period ESI against the equivalent previous period." },
    { icon:"◌", title:"What are the limitations?", color:T.rose,   body:"PEI has real limitations. Only Filipinos with internet access who choose to participate are represented. Submissions cannot be verified by location. The 50-submission threshold reduces noise but does not eliminate it. Coordinated submissions could skew results. We publish these limitations openly because honest data — even imperfect data — is more valuable than false precision." },
    { icon:"✓", title:"How is anonymity protected?", color:"#10b981", body:"No IP addresses are stored permanently. No device fingerprints are retained. Daily rotating salts mean yesterday's hashes are unrecoverable. Raw text from optional messages is never stored — only emotional signal. Cities appear only after 50 submissions, preventing individual exposure. The smallest unit of display is always a community." },
  ];

  return (
    <div>
      <div style={{ padding:bp==="mobile"?"0 1.25rem":"0" }}>
        <PageHeader label="Methodology" title="How the Index Works."
          subtitle="What PEI measures, how it measures it, and what it cannot tell you. Transparency is part of the product." />
      </div>
      <div ref={ref} style={{ display:"grid",
        gridTemplateColumns:bp==="mobile"?"1fr":bp==="tablet"?"1fr 1fr":"repeat(3,1fr)",
        gap:1, background:T.border, border:`1px solid ${T.border}` }}>
        {sections.map((s, i) => (
          <div key={i} style={{ background:T.bg, padding:"1.5rem",
            opacity:inView?1:0, transform:inView?"none":"translateY(16px)",
            transition:`all 0.5s ${i*0.08}s ease` }}>
            <div style={{ fontFamily:"'Playfair Display',serif", fontSize:"2rem",
              color:s.color, opacity:0.5, marginBottom:"0.5rem", lineHeight:1 }}>{s.icon}</div>
            <div style={{ fontFamily:"'Playfair Display',serif", fontSize:"0.95rem",
              fontWeight:700, marginBottom:"0.4rem" }}>{s.title}</div>
            <div style={{ fontFamily:"DM Mono", fontSize:"0.6rem",
              color:T.muted, lineHeight:1.7 }}>{s.body}</div>
          </div>
        ))}
      </div>
      <div style={{ padding:bp==="mobile"?"2rem 1.25rem 0":"2.5rem 0 0" }}>
        <blockquote style={{ fontFamily:"'Playfair Display',serif", fontStyle:"italic",
          fontSize:bp==="mobile"?"1.1rem":"1.5rem", lineHeight:1.5, letterSpacing:"-0.01em",
          borderLeft:`3px solid ${T.amber}`, paddingLeft:"1.25rem", margin:0, maxWidth:680 }}>
          "PEI is a voluntary emotional census — a living record of how Filipinos who choose to participate are feeling. It is not a scientific survey. It is a mirror, not a measurement."
        </blockquote>
      </div>
    </div>
  );
}
