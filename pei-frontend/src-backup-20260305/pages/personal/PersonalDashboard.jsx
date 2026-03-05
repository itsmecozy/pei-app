import { useState, useEffect } from "react";
import { getPersonalSubmissions, getPersonalStats, signOut } from "../../lib/supabase";
import { T } from "../../constants/tokens";
import { EMOTION_MAP } from "../../constants/emotions";
import { useBreakpoint } from "../../hooks/useBreakpoint";
import { Skeleton, EmptyState } from "../../components/shared/ui/index";

function AnimatedBar({ pct, hex, delay = 0 }) {
  const [w, setW] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => {
      const start = Date.now();
      const tick = () => {
        const p = Math.min((Date.now() - start) / 900, 1);
        setW((1 - Math.pow(1 - p, 3)) * pct);
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }, delay);
    return () => clearTimeout(t);
  }, [pct, delay]);
  return (
    <div style={{ height:3, background:"rgba(255,255,255,0.05)", position:"relative", borderRadius:2 }}>
      <div style={{ position:"absolute", top:0, left:0, bottom:0,
        width:`${w}%`, background:hex, borderRadius:2 }} />
    </div>
  );
}

export default function PersonalDashboard({ user, profile, navigate }) {
  const bp = useBreakpoint();
  const [tab, setTab]                 = useState("overview");
  const [submissions, setSubmissions] = useState([]);
  const [stats, setStats]             = useState(null);
  const [loading, setLoading]         = useState(true);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      getPersonalSubmissions(user.id),
      getPersonalStats(user.id),
    ]).then(([subs, st]) => {
      setSubmissions(subs);
      setStats(st);
    }).finally(() => setLoading(false));
  }, [user]);

  const esiColor = v => v > 0.6 ? "#10b981" : v > 0.4 ? T.amber : T.rose;
  const sorted   = stats ? Object.entries(stats.dist).sort((a,b) => b[1]-a[1]) : [];

  const trialDaysLeft = () => {
    if (!profile || profile.plan !== "trial") return null;
    const days = Math.max(0, 7 - Math.floor((Date.now() - new Date(profile.trial_started_at)) / (1000*60*60*24)));
    return days;
  };
  const daysLeft = trialDaysLeft();

  return (
    <div>
      <style>{`@keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}`}</style>

      {/* Header */}
      <div style={{ padding:"3rem 0 2rem", borderBottom:`1px solid ${T.border}`, marginBottom:"1.5rem" }}>
        <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between",
          flexWrap:"wrap", gap:"1rem" }}>
          <div>
            <div style={{ display:"flex", alignItems:"center", gap:"0.5rem",
              fontFamily:"DM Mono", fontSize:"0.52rem", letterSpacing:"0.18em",
              textTransform:"uppercase", color:T.amber, marginBottom:"0.6rem" }}>
              <div style={{ width:20, height:1, background:T.amber }} />
              Your Personal Index · {new Date().toLocaleDateString("en-PH", { month:"long", year:"numeric" })}
            </div>
            <h1 style={{ fontFamily:"'Playfair Display',serif",
              fontSize:"clamp(1.6rem,3.5vw,2.8rem)", fontWeight:900,
              letterSpacing:"-0.025em", lineHeight:1.1, marginBottom:"0.4rem" }}>
              {loading
                ? "Loading your index..."
                : stats
                  ? <>You've felt more <em style={{ color:EMOTION_MAP[stats.dominant]?.hex }}>{stats.dominant}</em> lately.</>
                  : "Your index is empty."
              }
            </h1>
            <p style={{ fontFamily:"DM Mono", fontSize:"0.6rem", color:T.muted }}>
              {stats ? `${stats.count} personal entries` : "Submit your first feeling to start."} · Only you can see this.
            </p>
          </div>

          <div style={{ display:"flex", flexDirection:"column", gap:"0.5rem", alignItems:"flex-end" }}>
            {daysLeft !== null && (
              <div style={{ background:`${T.teal}10`, border:`1px solid ${T.teal}20`,
                padding:"0.4rem 0.75rem", fontFamily:"DM Mono", fontSize:"0.52rem", color:T.teal }}>
                {daysLeft} days left in trial
              </div>
            )}
            {profile?.plan === "trial" && (
              <button onClick={() => navigate("pricing")}
                style={{ background:T.amber, color:"#000", border:"none",
                  padding:"0.35rem 0.75rem", fontFamily:"DM Mono", fontSize:"0.52rem",
                  fontWeight:500, letterSpacing:"0.08em", textTransform:"uppercase", cursor:"pointer" }}>
                Unlock Full Access →
              </button>
            )}
            <button onClick={() => signOut().then(() => navigate("home"))}
              style={{ background:"none", border:`1px solid ${T.border}`,
                color:T.muted, padding:"0.3rem 0.65rem", fontFamily:"DM Mono",
                fontSize:"0.5rem", letterSpacing:"0.08em", cursor:"pointer", transition:"all 0.2s" }}
              onMouseEnter={e=>e.currentTarget.style.color=T.rose}
              onMouseLeave={e=>e.currentTarget.style.color=T.muted}>
              Sign Out
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display:"flex", gap:"0.25rem", marginBottom:"1.5rem" }}>
        {["overview","history","vs nation"].map(t => (
          <button key={t} onClick={() => setTab(t)}
            style={{ padding:"0.28rem 0.7rem", fontFamily:"DM Mono", fontSize:"0.54rem",
              letterSpacing:"0.08em", textTransform:"uppercase",
              border:`1px solid ${tab===t?T.amber:T.border}`,
              background:tab===t?`${T.amber}15`:"none",
              color:tab===t?T.amber:T.muted, cursor:"pointer", transition:"all 0.2s" }}>
            {t}
          </button>
        ))}
      </div>

      {/* OVERVIEW */}
      {tab === "overview" && (
        <div style={{ animation:"fadeUp 0.35s both" }}>
          <div style={{ display:"grid",
            gridTemplateColumns:bp==="mobile"?"1fr 1fr":"repeat(3,1fr)",
            border:`1px solid ${T.border}`, borderBottom:"none", marginBottom:"1px" }}>
            {[
              { label:"Personal ESI",  value:stats?.esi,   desc:"Your emotional stability",
                color:stats?.esi?esiColor(stats.esi):T.muted, fill:(stats?.esi||0)*100 },
              { label:"Personal HDR",  value:stats?.hdr,   desc:"Your hope vs despair ratio",
                color:stats?.hdr>1?T.teal:T.rose,            fill:Math.min((stats?.hdr||0)/2*100,100) },
              { label:"Total Entries", value:stats?.count, desc:"Your personal submissions",
                color:T.text,                                 fill:40 },
            ].map((m,i) => (
              <div key={i} style={{ padding:"1.1rem 1.25rem",
                borderRight:i<2?`1px solid ${T.border}`:"none",
                borderBottom:`1px solid ${T.border}`, position:"relative", overflow:"hidden" }}>
                <div style={{ position:"absolute", bottom:0, left:0, height:2,
                  width:`${m.fill||0}%`, background:m.color }} />
                <div style={{ fontFamily:"DM Mono", fontSize:"0.48rem", letterSpacing:"0.14em",
                  textTransform:"uppercase", color:T.muted, marginBottom:"0.35rem" }}>{m.label}</div>
                {loading
                  ? <Skeleton height={28} width={60} style={{ marginBottom:4 }} />
                  : <div style={{ fontFamily:"'Playfair Display',serif", fontSize:"1.7rem",
                      fontWeight:700, color:m.color, lineHeight:1 }}>{m.value ?? "—"}</div>
                }
                <div style={{ fontFamily:"DM Mono", fontSize:"0.48rem",
                  color:T.muted, marginTop:"0.2rem" }}>{m.desc}</div>
              </div>
            ))}
          </div>

          {loading ? <Skeleton height={200} /> : !stats ? (
            <EmptyState icon="◉" title="No entries yet"
              body="Submit your first feeling using the Submit Feeling button. Your personal index will appear here." />
          ) : (
            <div style={{ display:"grid", gridTemplateColumns:bp==="mobile"?"1fr":"1fr 1fr",
              gap:"1px", background:T.border, border:`1px solid ${T.border}`, marginBottom:"1px" }}>
              <div style={{ background:T.surface, padding:"1.25rem" }}>
                <div style={{ fontFamily:"DM Mono", fontSize:"0.5rem", letterSpacing:"0.14em",
                  textTransform:"uppercase", color:T.muted, marginBottom:"0.9rem" }}>
                  Your Emotion Distribution
                </div>
                <div style={{ display:"flex", flexDirection:"column", gap:"0.6rem" }}>
                  {sorted.map(([key, pct], i) => {
                    const em = EMOTION_MAP[key];
                    return (
                      <div key={key} style={{ display:"grid",
                        gridTemplateColumns:"110px 1fr 38px", alignItems:"center", gap:"0.5rem" }}>
                        <span style={{ fontFamily:"DM Mono", fontSize:"0.5rem",
                          color:T.muted, textTransform:"capitalize" }}>
                          {em?.emoji} {key}
                        </span>
                        <AnimatedBar pct={pct*100} hex={em?.hex||T.muted} delay={i*50} />
                        <span style={{ fontFamily:"DM Mono", fontSize:"0.54rem",
                          color:em?.hex||T.muted, textAlign:"right" }}>
                          {Math.round(pct*100)}%
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div style={{ background:T.surface, padding:"1.25rem" }}>
                <div style={{ fontFamily:"DM Mono", fontSize:"0.5rem", letterSpacing:"0.14em",
                  textTransform:"uppercase", color:T.muted, marginBottom:"0.9rem" }}>
                  Recent Entries
                </div>
                {submissions.slice(0,6).map((s,i) => {
                  const em = EMOTION_MAP[s.emotion];
                  return (
                    <div key={i} style={{ display:"flex", alignItems:"center", gap:"0.75rem",
                      padding:"0.5rem 0", borderBottom:i<5?`1px solid ${T.border}`:"none" }}>
                      <span style={{ fontFamily:"DM Mono", fontSize:"0.48rem",
                        color:T.muted, minWidth:44 }}>
                        {new Date(s.created_at).toLocaleDateString("en-PH", { month:"short", day:"numeric" })}
                      </span>
                      <span style={{ background:`${em?.hex}15`, border:`1px solid ${em?.hex}25`,
                        padding:"0.15rem 0.45rem", fontFamily:"DM Mono", fontSize:"0.48rem",
                        color:em?.hex, textTransform:"capitalize", whiteSpace:"nowrap" }}>
                        {em?.emoji} {s.emotion}
                      </span>
                      <div style={{ display:"flex", gap:2 }}>
                        {[1,2,3,4,5].map(n => (
                          <div key={n} style={{ width:5, height:5, borderRadius:"50%",
                            background:n<=s.intensity?em?.hex:"rgba(255,255,255,0.08)" }} />
                        ))}
                      </div>
                      <span style={{ fontFamily:"DM Mono", fontSize:"0.5rem", color:T.muted,
                        flex:1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                        {s.note || <span style={{ opacity:0.35 }}>No note</span>}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* HISTORY */}
      {tab === "history" && (
        <div style={{ animation:"fadeUp 0.35s both" }}>
          {loading ? <Skeleton height={300} /> : submissions.length === 0 ? (
            <EmptyState icon="◌" title="No entries yet" body="Your personal submissions will appear here." />
          ) : (
            <div style={{ border:`1px solid ${T.border}` }}>
              <div style={{ padding:"0.75rem 1.25rem", borderBottom:`1px solid ${T.border}` }}>
                <div style={{ fontFamily:"DM Mono", fontSize:"0.5rem", letterSpacing:"0.14em",
                  textTransform:"uppercase", color:T.muted }}>
                  All Entries · {submissions.length} total
                </div>
              </div>
              {submissions.map((s, i) => {
                const em = EMOTION_MAP[s.emotion];
                return (
                  <div key={i} style={{ padding:"0.85rem 1.25rem",
                    borderBottom:i<submissions.length-1?`1px solid ${T.border}`:"none",
                    display:"grid", gridTemplateColumns:"58px 155px 95px 1fr",
                    alignItems:"center", gap:"1rem", transition:"background 0.2s" }}
                    onMouseEnter={e=>e.currentTarget.style.background=T.surface2}
                    onMouseLeave={e=>e.currentTarget.style.background="none"}>
                    <div style={{ fontFamily:"DM Mono", fontSize:"0.5rem", color:T.muted }}>
                      {new Date(s.created_at).toLocaleDateString("en-PH", { month:"short", day:"numeric" })}
                    </div>
                    <div style={{ background:`${em?.hex}15`, border:`1px solid ${em?.hex}30`,
                      padding:"0.18rem 0.5rem", fontFamily:"DM Mono", fontSize:"0.5rem",
                      color:em?.hex, textTransform:"capitalize" }}>
                      {em?.emoji} {s.emotion}
                    </div>
                    <div style={{ display:"flex", gap:3 }}>
                      {[1,2,3,4,5].map(n => (
                        <div key={n} style={{ width:6, height:6, borderRadius:"50%",
                          background:n<=s.intensity?em?.hex:"rgba(255,255,255,0.08)" }} />
                      ))}
                    </div>
                    <div style={{ fontFamily:"DM Mono", fontSize:"0.56rem", color:T.muted }}>
                      {s.note || <span style={{ opacity:0.35, fontStyle:"italic" }}>No note</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* VS NATION */}
      {tab === "vs nation" && (
        <div style={{ animation:"fadeUp 0.35s both" }}>
          <div style={{ background:`${T.amber}08`, border:`1px solid ${T.amber}20`,
            padding:"0.75rem 1.1rem", marginBottom:"1.5rem",
            fontFamily:"DM Mono", fontSize:"0.56rem", color:T.muted, lineHeight:1.8 }}>
            <span style={{ color:T.amber }}>Privacy note: </span>
            Comparison uses only your aggregated personal stats vs. the anonymous national average.
          </div>
          {!stats ? (
            <EmptyState icon="◎" title="Not enough data yet"
              body="Submit a few feelings first and your stats will be compared to the national index here." />
          ) : (
            <div style={{ display:"grid", gridTemplateColumns:bp==="mobile"?"1fr":"1fr 1fr",
              gap:"1px", background:T.border, border:`1px solid ${T.border}` }}>
              {[
                { label:"ESI", you:stats.esi, nation:0.71, youColor:esiColor(stats.esi) },
                { label:"HDR", you:stats.hdr, nation:1.2,  youColor:stats.hdr>1?T.teal:T.rose },
              ].map((m,i) => (
                <div key={i} style={{ background:T.surface, padding:"1.25rem" }}>
                  <div style={{ fontFamily:"DM Mono", fontSize:"0.5rem", letterSpacing:"0.14em",
                    textTransform:"uppercase", color:T.muted, marginBottom:"1rem" }}>
                    {m.label} · You vs Nation
                  </div>
                  <div style={{ display:"flex", flexDirection:"column", gap:"0.7rem", marginBottom:"0.85rem" }}>
                    {[
                      { label:"You",         value:m.you,    color:m.youColor },
                      { label:"National avg", value:m.nation, color:T.muted },
                    ].map(r => (
                      <div key={r.label}>
                        <div style={{ display:"flex", justifyContent:"space-between",
                          fontFamily:"DM Mono", fontSize:"0.52rem", marginBottom:"0.3rem" }}>
                          <span style={{ color:T.muted }}>{r.label}</span>
                          <span style={{ color:r.color }}>{r.value}</span>
                        </div>
                        <AnimatedBar pct={Math.min(r.value/2*100,100)} hex={r.color} />
                      </div>
                    ))}
                  </div>
                  <div style={{ fontFamily:"DM Mono", fontSize:"0.54rem", color:T.muted, lineHeight:1.6 }}>
                    {m.label === "ESI"
                      ? stats.esi > 0.71
                        ? <span>You're <span style={{color:"#10b981"}}>more stable</span> than the national average.</span>
                        : <span>You're <span style={{color:T.rose}}>less stable</span> than the national average.</span>
                      : stats.hdr > 1.2
                        ? <span>You're more <span style={{color:T.teal}}>hope-leaning</span> than the national mood.</span>
                        : <span>You're more <span style={{color:T.rose}}>despair-leaning</span> than the national mood.</span>
                    }
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
