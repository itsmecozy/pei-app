import { useState, useEffect, useRef } from "react";
import { getPersonalSubmissions, getPersonalStats, updateStreak } from "../../lib/supabase";
import { useT } from "../../context/ThemeContext";
import { EMOTION_MAP } from "../../constants/emotions";
import { useBreakpoint } from "../../hooks/useBreakpoint";
import { Skeleton, EmptyState } from "../../components/shared/ui/index";

// ── Animated bar ──────────────────────────────────────────────────────────────
function formatDateTime(dateStr) {
  const d = new Date(dateStr);
  const date = d.toLocaleDateString("en-PH", { month:"short", day:"numeric", year:"numeric" });
  const time = d.toLocaleTimeString("en-PH", { hour:"numeric", minute:"2-digit", hour12:true });
  return { date, time, full: `${date} · ${time}` };
}

function AnimatedBar({ pct, hex, delay = 0 }) {
  const T = useT();
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
    <div style={{ height:3, background:"rgba(128,128,128,0.1)", position:"relative", borderRadius:2 }}>
      <div style={{ position:"absolute", top:0, left:0, bottom:0,
        width:`${w}%`, background:hex, borderRadius:2 }} />
    </div>
  );
}

// ── Emotion Heatmap ───────────────────────────────────────────────────────────
function EmotionHeatmap({ submissions }) {
  const T = useT();

  // Build a map of date → dominant emotion
  const dateMap = {};
  submissions.forEach(s => {
    const d = new Date(s.created_at).toISOString().slice(0, 10);
    if (!dateMap[d]) dateMap[d] = {};
    dateMap[d][s.emotion] = (dateMap[d][s.emotion] || 0) + 1;
  });

  // Get dominant emotion per day
  const dominantMap = {};
  Object.entries(dateMap).forEach(([date, emotions]) => {
    dominantMap[date] = Object.entries(emotions).sort((a,b) => b[1]-a[1])[0][0];
  });

  // Build last 12 weeks (84 days) grid
  const today = new Date();
  const days = [];
  for (let i = 83; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    days.push({ key, date: d, emotion: dominantMap[key] || null });
  }

  // Group into weeks
  const weeks = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }

  const [hovered, setHovered] = useState(null);

  return (
    <div style={{ background:T.surface, padding:"1.25rem",
      border:`1px solid ${T.border}` }}>
      <div style={{ display:"flex", justifyContent:"space-between",
        alignItems:"baseline", marginBottom:"0.9rem" }}>
        <div style={{ fontFamily:"DM Mono", fontSize:"0.5rem", letterSpacing:"0.14em",
          textTransform:"uppercase", color:T.muted }}>
          Emotion Calendar · Last 12 Weeks
        </div>
        {hovered && (
          <div style={{ fontFamily:"DM Mono", fontSize:"0.5rem", color:T.muted }}>
            {hovered.date.toLocaleDateString("en-PH", { month:"short", day:"numeric" })}
            {hovered.emotion && (
              <span style={{ color:EMOTION_MAP[hovered.emotion]?.hex, marginLeft:"0.4rem" }}>
                {EMOTION_MAP[hovered.emotion]?.emoji} {hovered.emotion}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Day-of-week labels */}
      <div style={{ display:"flex", gap:3, marginBottom:3 }}>
        <div style={{ width:10 }} /> {/* spacer */}
        {["S","M","T","W","T","F","S"].map((d,i) => (
          <div key={i} style={{ width:10, fontFamily:"DM Mono",
            fontSize:"0.4rem", color:T.muted, textAlign:"center" }}>{d}</div>
        ))}
      </div>

      {/* Grid */}
      <div style={{ display:"flex", gap:3 }}>
        {weeks.map((week, wi) => (
          <div key={wi} style={{ display:"flex", flexDirection:"column", gap:3 }}>
            {week.map((day, di) => {
              const em = day.emotion ? EMOTION_MAP[day.emotion] : null;
              const isToday = day.key === today.toISOString().slice(0,10);
              return (
                <div key={di}
                  onMouseEnter={() => setHovered(day)}
                  onMouseLeave={() => setHovered(null)}
                  style={{
                    width:10, height:10,
                    background: em ? `${em.hex}90` : T.surface2,
                    border: isToday ? `1px solid ${T.amber}` : `1px solid transparent`,
                    borderRadius:2,
                    cursor: em ? "pointer" : "default",
                    transition:"transform 0.1s",
                  }}
                  onMouseOver={e => { if(em) e.currentTarget.style.transform="scale(1.4)"; }}
                  onMouseOut={e => e.currentTarget.style.transform="scale(1)"}
                />
              );
            })}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div style={{ display:"flex", gap:"0.75rem", marginTop:"0.75rem", flexWrap:"wrap" }}>
        {Object.entries(EMOTION_MAP).slice(0,6).map(([key, em]) => (
          <div key={key} style={{ display:"flex", alignItems:"center", gap:3 }}>
            <div style={{ width:8, height:8, background:`${em.hex}90`, borderRadius:1 }} />
            <span style={{ fontFamily:"DM Mono", fontSize:"0.44rem",
              color:T.muted, textTransform:"capitalize" }}>{key}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Streak Card ───────────────────────────────────────────────────────────────
function StreakCard({ profile, submissions }) {
  const T = useT();

  const current = profile?.current_streak || 0;
  const longest = profile?.longest_streak || 0;

  // Calculate streak locally from submissions as fallback
  const calcStreak = () => {
    if (!submissions.length) return 0;
    const dates = [...new Set(
      submissions.map(s => new Date(s.created_at).toISOString().slice(0,10))
    )].sort().reverse();

    let streak = 0;
    let check = new Date();
    check.setHours(0,0,0,0);

    for (const d of dates) {
      const checkStr = check.toISOString().slice(0,10);
      if (d === checkStr) {
        streak++;
        check.setDate(check.getDate() - 1);
      } else if (d < checkStr) {
        break;
      }
    }
    return streak;
  };

  const displayStreak = current || calcStreak();

  return (
    <div style={{ background:T.surface, border:`1px solid ${T.border}`,
      padding:"1.25rem", display:"flex", alignItems:"center",
      gap:"1.25rem" }}>
      <div style={{ fontSize:"2.5rem", flexShrink:0,
        filter: displayStreak > 0 ? "none" : "grayscale(1) opacity(0.3)" }}>
        🔥
      </div>
      <div style={{ flex:1 }}>
        <div style={{ fontFamily:"DM Mono", fontSize:"0.48rem", letterSpacing:"0.14em",
          textTransform:"uppercase", color:T.muted, marginBottom:"0.25rem" }}>
          Current Streak
        </div>
        <div style={{ fontFamily:"'Playfair Display',serif", fontSize:"2rem",
          fontWeight:900, color:T.amber, lineHeight:1 }}>
          {displayStreak} <span style={{ fontSize:"0.9rem", color:T.muted,
            fontFamily:"DM Mono", fontWeight:400 }}>days</span>
        </div>
        {longest > 0 && (
          <div style={{ fontFamily:"DM Mono", fontSize:"0.48rem",
            color:T.muted, marginTop:"0.2rem" }}>
            Best: {longest} days
          </div>
        )}
      </div>
      {displayStreak >= 3 && (
        <div style={{ background:`${T.amber}10`, border:`1px solid ${T.amber}20`,
          padding:"0.3rem 0.6rem", fontFamily:"DM Mono", fontSize:"0.48rem",
          color:T.amber, letterSpacing:"0.08em", textTransform:"uppercase",
          alignSelf:"flex-start" }}>
          {displayStreak >= 30 ? "Legend 🏆" :
           displayStreak >= 14 ? "On fire 🔥" :
           displayStreak >= 7  ? "Week streak ⚡" : "Keep going!"}
        </div>
      )}
    </div>
  );
}

// ── Share Card Modal ──────────────────────────────────────────────────────────
function ShareCardModal({ open, onClose, submission, user }) {
  const T = useT();
  const canvasRef = useRef(null);
  const [generated, setGenerated] = useState(false);

  useEffect(() => {
    if (!open || !submission || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const em = EMOTION_MAP[submission.emotion];
    const W = 1080, H = 1080;
    canvas.width = W; canvas.height = H;

    // Background
    ctx.fillStyle = "#07090f";
    ctx.fillRect(0, 0, W, H);

    // Accent line top
    const grad = ctx.createLinearGradient(0,0,W,0);
    grad.addColorStop(0, em?.hex || "#f5a623");
    grad.addColorStop(1, "#07090f");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, 6);

    // Grain texture (subtle dots)
    ctx.globalAlpha = 0.03;
    for (let i = 0; i < 8000; i++) {
      ctx.fillStyle = "#fff";
      ctx.fillRect(Math.random()*W, Math.random()*H, 1, 1);
    }
    ctx.globalAlpha = 1;

    // Emotion emoji
    ctx.font = "180px serif";
    ctx.textAlign = "center";
    ctx.fillText(em?.emoji || "◉", W/2, 340);

    // Emotion label
    ctx.font = "bold 96px serif";
    ctx.fillStyle = em?.hex || "#f5a623";
    ctx.textAlign = "center";
    ctx.fillText(submission.emotion.toUpperCase(), W/2, 480);

    // Intensity dots
    const dotSize = 24, dotGap = 16;
    const totalW = 5 * dotSize + 4 * dotGap;
    const startX = (W - totalW) / 2;
    for (let i = 0; i < 5; i++) {
      ctx.beginPath();
      ctx.arc(startX + i*(dotSize+dotGap) + dotSize/2, 540, dotSize/2, 0, Math.PI*2);
      ctx.fillStyle = i < submission.intensity ? (em?.hex || "#f5a623") : "rgba(255,255,255,0.1)";
      ctx.fill();
    }

    // Note
    if (submission.note) {
      ctx.font = "36px monospace";
      ctx.fillStyle = "rgba(255,255,255,0.5)";
      ctx.textAlign = "center";
      const words = submission.note.split(" ");
      let line = "", lines = [];
      words.forEach(w => {
        const test = line + w + " ";
        if (ctx.measureText(test).width > W - 200) { lines.push(line); line = w + " "; }
        else line = test;
      });
      lines.push(line);
      lines.slice(0,3).forEach((l,i) => ctx.fillText(l.trim(), W/2, 630 + i*50));
    }

    // Date + LGU
    ctx.font = "32px monospace";
    ctx.fillStyle = "rgba(255,255,255,0.3)";
    ctx.textAlign = "center";
    const dateStr = new Date(submission.created_at).toLocaleDateString("en-PH", {
      month:"long", day:"numeric", year:"numeric"
    });
    ctx.fillText(dateStr, W/2, 820);

    // PEI branding
    ctx.font = "bold 48px serif";
    ctx.fillStyle = "#f5a623";
    ctx.textAlign = "center";
    ctx.fillText("PEI", W/2, 940);

    ctx.font = "28px monospace";
    ctx.fillStyle = "rgba(255,255,255,0.25)";
    ctx.fillText("Philippines Emotional Index · pei-app-eight.vercel.app", W/2, 985);

    setGenerated(true);
  }, [open, submission]);

  const handleDownload = () => {
    const canvas = canvasRef.current;
    const link = document.createElement("a");
    link.download = `pei-${submission?.emotion}-${new Date().toISOString().slice(0,10)}.jpg`;
    link.href = canvas.toDataURL("image/jpeg", 0.92);
    link.click();
  };

  if (!open) return null;

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.9)",
      backdropFilter:"blur(12px)", zIndex:500,
      display:"flex", alignItems:"center", justifyContent:"center",
      padding:"1.5rem" }}
      onClick={e => { if(e.target===e.currentTarget) onClose(); }}>

      <div style={{ background:T.surface, border:`1px solid ${T.border}`,
        maxWidth:480, width:"100%", animation:"modalIn 0.3s ease" }}>

        <div style={{ height:2,
          background:`linear-gradient(to right, ${EMOTION_MAP[submission?.emotion]?.hex||T.amber}, ${T.teal})` }} />

        <div style={{ padding:"1.25rem 1.5rem", borderBottom:`1px solid ${T.border}`,
          display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div style={{ fontFamily:"'Playfair Display',serif",
            fontSize:"1rem", fontWeight:700, color:T.text }}>
            Share Your Feeling
          </div>
          <button onClick={onClose}
            style={{ background:"none", border:"none", color:T.muted,
              cursor:"pointer", fontSize:"1.1rem" }}>✕</button>
        </div>

        <div style={{ padding:"1.25rem 1.5rem" }}>
          {/* Canvas preview */}
          <div style={{ width:"100%", aspectRatio:"1", marginBottom:"1rem",
            border:`1px solid ${T.border}`, overflow:"hidden" }}>
            <canvas ref={canvasRef}
              style={{ width:"100%", height:"100%", display:"block", objectFit:"cover" }} />
          </div>

          <div style={{ display:"flex", gap:"0.5rem" }}>
            <button onClick={handleDownload}
              style={{ flex:1, background:T.amber, color:"#000", border:"none",
                padding:"0.6rem", fontFamily:"DM Mono", fontSize:"0.58rem",
                fontWeight:500, letterSpacing:"0.08em", textTransform:"uppercase",
                cursor:"pointer", transition:"all 0.2s" }}
              onMouseEnter={e=>e.currentTarget.style.opacity="0.85"}
              onMouseLeave={e=>e.currentTarget.style.opacity="1"}>
              ↓ Save Image
            </button>
            <button onClick={onClose}
              style={{ background:"none", border:`1px solid ${T.border}`,
                color:T.muted, padding:"0.6rem 1rem", fontFamily:"DM Mono",
                fontSize:"0.56rem", letterSpacing:"0.08em", textTransform:"uppercase",
                cursor:"pointer" }}>
              Close
            </button>
          </div>

          <p style={{ fontFamily:"DM Mono", fontSize:"0.5rem", color:T.muted,
            lineHeight:1.6, marginTop:"0.75rem", textAlign:"center" }}>
            Save and share to your stories. Every share helps grow the index.
          </p>
        </div>
      </div>
      <style>{`@keyframes modalIn{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}`}</style>
    </div>
  );
}

// ── Main Dashboard ────────────────────────────────────────────────────────────
export default function PersonalDashboard({ user, profile, navigate }) {
  const T  = useT();
  const bp = useBreakpoint();
  const [tab,         setTab]         = useState("overview");
  const [submissions, setSubmissions] = useState([]);
  const [stats,       setStats]       = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [shareTarget, setShareTarget] = useState(null);

  useEffect(() => {
    if (!user?.id) return;
    setLoading(true);
    setSubmissions([]);
    setStats(null);
    Promise.all([
      getPersonalSubmissions(user.id),
      getPersonalStats(user.id),
    ]).then(([subs, st]) => {
      setSubmissions(subs);
      setStats(st);
      if (subs.length > 0) updateStreak(user.id).catch(() => {});
    }).finally(() => setLoading(false));
  }, [user?.id]);

  const esiColor = v => v > 0.6 ? "#10b981" : v > 0.4 ? T.amber : T.rose;
  const sorted   = stats ? Object.entries(stats.dist).sort((a,b) => b[1]-a[1]) : [];

  const trialDaysLeft = () => {
    if (!profile || profile.plan !== "trial") return null;
    return Math.max(0, 7 - Math.floor(
      (Date.now() - new Date(profile.trial_started_at)) / (1000*60*60*24)
    ));
  };
  const daysLeft = trialDaysLeft();

  return (
    <div>
      <style>{`
        @keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
      `}</style>

      {/* Header */}
      <div style={{ padding:"3rem 0 2rem", borderBottom:`1px solid ${T.border}`, marginBottom:"1.5rem" }}>
        <div style={{ display:"flex", alignItems:"flex-start",
          justifyContent:"space-between", flexWrap:"wrap", gap:"1rem" }}>
          <div>
            <div style={{ display:"flex", alignItems:"center", gap:"0.5rem",
              fontFamily:"DM Mono", fontSize:"0.52rem", letterSpacing:"0.18em",
              textTransform:"uppercase", color:T.amber, marginBottom:"0.6rem" }}>
              <div style={{ width:20, height:1, background:T.amber }} />
              Your Personal Index · {new Date().toLocaleDateString("en-PH", { month:"long", year:"numeric" })}
            </div>
            <h1 style={{ fontFamily:"'Playfair Display',serif",
              fontSize:"clamp(1.6rem,3.5vw,2.8rem)", fontWeight:900,
              letterSpacing:"-0.025em", lineHeight:1.1, marginBottom:"0.4rem",
              color:T.text }}>
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
                padding:"0.4rem 0.75rem", fontFamily:"DM Mono",
                fontSize:"0.52rem", color:T.teal }}>
                {daysLeft} days left in trial
              </div>
            )}
            {profile?.plan === "trial" && (
              <button onClick={() => navigate("pricing")}
                style={{ background:T.amber, color:"#000", border:"none",
                  padding:"0.35rem 0.75rem", fontFamily:"DM Mono", fontSize:"0.52rem",
                  fontWeight:500, letterSpacing:"0.08em", textTransform:"uppercase",
                  cursor:"pointer" }}>
                Unlock Full Access →
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Streak + Tabs row */}
      <div style={{ display:"flex", alignItems:"center",
        justifyContent:"space-between", flexWrap:"wrap",
        gap:"0.75rem", marginBottom:"1.5rem" }}>
        <div style={{ display:"flex", gap:"0.25rem" }}>
          {["overview","calendar","history","vs nation"].map(t => (
            <button key={t} onClick={() => setTab(t)}
              style={{ padding:"0.28rem 0.7rem", fontFamily:"DM Mono", fontSize:"0.54rem",
                letterSpacing:"0.08em", textTransform:"uppercase",
                border:`1px solid ${tab===t ? T.amber : T.border}`,
                background: tab===t ? `${T.amber}15` : "none",
                color: tab===t ? T.amber : T.muted,
                cursor:"pointer", transition:"all 0.2s" }}>
              {t}
            </button>
          ))}
        </div>

        {/* Mini streak badge */}
        {!loading && submissions.length > 0 && (
          <div style={{ display:"flex", alignItems:"center", gap:"0.4rem",
            background:`${T.amber}10`, border:`1px solid ${T.amber}20`,
            padding:"0.25rem 0.6rem" }}>
            <span>🔥</span>
            <span style={{ fontFamily:"DM Mono", fontSize:"0.52rem", color:T.amber }}>
              {profile?.current_streak || 0} day streak
            </span>
          </div>
        )}
      </div>

      {/* ── OVERVIEW ── */}
      {tab === "overview" && (
        <div style={{ animation:"fadeUp 0.35s both" }}>
          {/* Streak + stats row */}
          {!loading && submissions.length > 0 && (
            <div style={{ marginBottom:"1px" }}>
              <StreakCard profile={profile} submissions={submissions} />
            </div>
          )}

          <div style={{ display:"grid",
            gridTemplateColumns: bp==="mobile" ? "1fr 1fr" : "repeat(3,1fr)",
            border:`1px solid ${T.border}`, borderBottom:"none", marginBottom:"1px" }}>
            {[
              { label:"Personal ESI",  value:stats?.esi,   desc:"Your emotional stability",
                color:stats?.esi ? esiColor(stats.esi) : T.muted, fill:(stats?.esi||0)*100 },
              { label:"Personal HDR",  value:stats?.hdr,   desc:"Your hope vs despair ratio",
                color:stats?.hdr>1 ? T.teal : T.rose, fill:Math.min((stats?.hdr||0)/2*100,100) },
              { label:"Total Entries", value:stats?.count, desc:"Your personal submissions",
                color:T.text, fill:40 },
            ].map((m,i) => (
              <div key={i} style={{ padding:"1.1rem 1.25rem",
                borderRight: i<2 ? `1px solid ${T.border}` : "none",
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
              body="Submit your first feeling using the Submit Feeling button." />
          ) : (
            <div style={{ display:"grid",
              gridTemplateColumns: bp==="mobile" ? "1fr" : "1fr 1fr",
              gap:"1px", background:T.border, border:`1px solid ${T.border}`,
              marginBottom:"1px" }}>

              {/* Emotion distribution */}
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
                        gridTemplateColumns:"110px 1fr 38px",
                        alignItems:"center", gap:"0.5rem" }}>
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

              {/* Recent entries */}
              <div style={{ background:T.surface, padding:"1.25rem" }}>
                <div style={{ fontFamily:"DM Mono", fontSize:"0.5rem", letterSpacing:"0.14em",
                  textTransform:"uppercase", color:T.muted, marginBottom:"0.9rem" }}>
                  Recent Entries
                </div>
                {submissions.slice(0,6).map((s,i) => {
                  const em = EMOTION_MAP[s.emotion];
                  return (
                    <div key={i} style={{ display:"flex", alignItems:"center",
                      gap:"0.75rem", padding:"0.5rem 0",
                      borderBottom: i<5 ? `1px solid ${T.border}` : "none" }}>
                      <div style={{ fontFamily:"DM Mono", fontSize:"0.44rem",
                        color:T.muted, minWidth:52, lineHeight:1.5 }}>
                        <div>{formatDateTime(s.created_at).date}</div>
                        <div style={{ opacity:0.6 }}>{formatDateTime(s.created_at).time}</div>
                      </div>
                      <span style={{ background:`${em?.hex}15`, border:`1px solid ${em?.hex}25`,
                        padding:"0.15rem 0.45rem", fontFamily:"DM Mono", fontSize:"0.48rem",
                        color:em?.hex, textTransform:"capitalize", whiteSpace:"nowrap" }}>
                        {em?.emoji} {s.emotion}
                      </span>
                      <div style={{ display:"flex", gap:2 }}>
                        {[1,2,3,4,5].map(n => (
                          <div key={n} style={{ width:5, height:5, borderRadius:"50%",
                            background: n<=s.intensity ? em?.hex : "rgba(128,128,128,0.15)" }} />
                        ))}
                      </div>
                      <button onClick={() => setShareTarget(s)}
                        style={{ marginLeft:"auto", background:"none", border:"none",
                          color:T.muted, cursor:"pointer", fontSize:"0.7rem",
                          padding:"0.1rem 0.3rem", transition:"color 0.2s" }}
                        title="Share this feeling"
                        onMouseEnter={e=>e.currentTarget.style.color=T.amber}
                        onMouseLeave={e=>e.currentTarget.style.color=T.muted}>
                        ↗
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── CALENDAR / HEATMAP ── */}
      {tab === "calendar" && (
        <div style={{ animation:"fadeUp 0.35s both" }}>
          {loading ? <Skeleton height={200} /> : submissions.length === 0 ? (
            <EmptyState icon="◌" title="No entries yet"
              body="Your emotion calendar will appear here once you start submitting." />
          ) : (
            <>
              <EmotionHeatmap submissions={submissions} />
              <div style={{ marginTop:"1px" }}>
                <StreakCard profile={profile} submissions={submissions} />
              </div>
            </>
          )}
        </div>
      )}

      {/* ── HISTORY ── */}
      {tab === "history" && (
        <div style={{ animation:"fadeUp 0.35s both" }}>
          {loading ? <Skeleton height={300} /> : submissions.length === 0 ? (
            <EmptyState icon="◌" title="No entries yet"
              body="Your personal submissions will appear here." />
          ) : (
            <div style={{ border:`1px solid ${T.border}` }}>
              <div style={{ padding:"0.75rem 1.25rem",
                borderBottom:`1px solid ${T.border}` }}>
                <div style={{ fontFamily:"DM Mono", fontSize:"0.5rem", letterSpacing:"0.14em",
                  textTransform:"uppercase", color:T.muted }}>
                  All Entries · {submissions.length} total
                </div>
              </div>
              {submissions.map((s, i) => {
                const em = EMOTION_MAP[s.emotion];
                return (
                  <div key={i}
                    style={{ padding:"0.85rem 1.25rem",
                      borderBottom: i<submissions.length-1 ? `1px solid ${T.border}` : "none",
                      display:"grid",
                      gridTemplateColumns: bp==="mobile" ? "60px 1fr auto" : "72px 155px 95px 1fr auto",
                      alignItems:"center", gap:"0.75rem", transition:"background 0.2s" }}
                    onMouseEnter={e=>e.currentTarget.style.background=T.surface2}
                    onMouseLeave={e=>e.currentTarget.style.background="none"}>
                    <div style={{ fontFamily:"DM Mono", fontSize:"0.44rem",
                      color:T.muted, lineHeight:1.5 }}>
                      <div>{formatDateTime(s.created_at).date}</div>
                      <div style={{ opacity:0.6 }}>{formatDateTime(s.created_at).time}</div>
                    </div>
                    <div style={{ background:`${em?.hex}15`, border:`1px solid ${em?.hex}30`,
                      padding:"0.18rem 0.5rem", fontFamily:"DM Mono", fontSize:"0.5rem",
                      color:em?.hex, textTransform:"capitalize" }}>
                      {em?.emoji} {s.emotion}
                    </div>
                    {bp !== "mobile" && (
                      <div style={{ display:"flex", gap:3 }}>
                        {[1,2,3,4,5].map(n => (
                          <div key={n} style={{ width:6, height:6, borderRadius:"50%",
                            background: n<=s.intensity ? em?.hex : "rgba(128,128,128,0.15)" }} />
                        ))}
                      </div>
                    )}
                    {bp !== "mobile" && (
                      <div style={{ fontFamily:"DM Mono", fontSize:"0.56rem", color:T.muted,
                        overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                        {s.note || <span style={{ opacity:0.35, fontStyle:"italic" }}>No note</span>}
                      </div>
                    )}
                    {/* Share button */}
                    <button onClick={() => setShareTarget(s)}
                      style={{ background:"none", border:`1px solid ${T.border}`,
                        color:T.muted, padding:"0.2rem 0.5rem", fontFamily:"DM Mono",
                        fontSize:"0.5rem", letterSpacing:"0.06em", cursor:"pointer",
                        transition:"all 0.2s", whiteSpace:"nowrap" }}
                      onMouseEnter={e=>{ e.currentTarget.style.color=T.amber; e.currentTarget.style.borderColor=T.amber; }}
                      onMouseLeave={e=>{ e.currentTarget.style.color=T.muted; e.currentTarget.style.borderColor=T.border; }}>
                      ↗ Share
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── VS NATION ── */}
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
            <div style={{ display:"grid",
              gridTemplateColumns: bp==="mobile" ? "1fr" : "1fr 1fr",
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
                      { label:"You",          value:m.you,    color:m.youColor },
                      { label:"National avg", value:m.nation, color:T.muted    },
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
                  <div style={{ fontFamily:"DM Mono", fontSize:"0.54rem",
                    color:T.muted, lineHeight:1.6 }}>
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

      {/* Share Card Modal */}
      <ShareCardModal
        open={!!shareTarget}
        onClose={() => setShareTarget(null)}
        submission={shareTarget}
        user={user}
      />
    </div>
  );
}
