import { useState } from "react";
import { T } from "../../constants/tokens";
import { useBreakpoint } from "../../hooks/useBreakpoint";
import { signOut } from "../../lib/supabase";

function PlanBadge({ plan }) {
  const configs = {
    trial:    { label:"Free Trial",   color:T.teal,    bg:`${T.teal}12`    },
    seasonal: { label:"Seasonal",     color:T.amber,   bg:`${T.amber}12`   },
    lifetime: { label:"Lifetime",     color:"#a78bfa", bg:"#a78bfa12"      },
  };
  const c = configs[plan] || configs.trial;
  return (
    <span style={{ background:c.bg, border:`1px solid ${c.color}30`,
      padding:"0.2rem 0.65rem", fontFamily:"DM Mono", fontSize:"0.52rem",
      letterSpacing:"0.1em", textTransform:"uppercase", color:c.color }}>
      {c.label}
    </span>
  );
}

function DaysBar({ pct, color }) {
  const [w, setW] = useState(0);
  useState(() => {
    const t = setTimeout(() => setW(pct), 100);
    return () => clearTimeout(t);
  });
  return (
    <div style={{ height:4, background:"rgba(255,255,255,0.06)", borderRadius:2, overflow:"hidden" }}>
      <div style={{ height:"100%", width:`${w}%`, background:color,
        borderRadius:2, transition:"width 1s cubic-bezier(.4,0,.2,1)" }} />
    </div>
  );
}

export default function AccountPage({ user, profile, navigate }) {
  const bp = useBreakpoint();

  const getDaysLeft = () => {
    if (!profile) return null;
    if (profile.plan === "lifetime") return null;
    const started = new Date(profile.plan === "seasonal" && profile.plan_expires_at
      ? new Date(profile.plan_expires_at) - 90*24*60*60*1000
      : profile.trial_started_at);
    const expires = profile.plan === "seasonal" && profile.plan_expires_at
      ? new Date(profile.plan_expires_at)
      : new Date(new Date(profile.trial_started_at).getTime() + 7*24*60*60*1000);
    const days = Math.max(0, Math.ceil((expires - Date.now()) / (1000*60*60*24)));
    const total = profile.plan === "seasonal" ? 90 : 7;
    const used = total - days;
    return { days, total, pct: Math.min((used/total)*100, 100), expires };
  };

  const status = getDaysLeft();
  const plan = profile?.plan || "trial";

  const planColor = plan === "lifetime" ? "#a78bfa" : plan === "seasonal" ? T.amber : T.teal;

  const plans = [
    {
      id:"trial",
      label:"Free Trial",
      price:"Free",
      duration:"7 days",
      color:T.teal,
      features:["Full personal dashboard","Emotion history","ESI & HDR tracking","vs Nation comparison"],
    },
    {
      id:"seasonal",
      label:"Seasonal",
      price:"₱49",
      duration:"3 months",
      color:T.amber,
      features:["Everything in Trial","90 days of access","Seasonal pattern insights","Priority support"],
    },
    {
      id:"lifetime",
      label:"Lifetime",
      price:"₱99",
      duration:"forever",
      color:"#a78bfa",
      features:["Everything in Seasonal","Unlimited access","All future features","Early access to new tools"],
    },
  ];

  return (
    <div style={{ paddingBottom:"4rem" }}>
      <style>{`@keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}`}</style>

      {/* Header */}
      <div style={{ padding:"3rem 0 2rem", borderBottom:`1px solid ${T.border}`, marginBottom:"2rem" }}>
        <div style={{ display:"flex", alignItems:"center", gap:"0.5rem",
          fontFamily:"DM Mono", fontSize:"0.52rem", letterSpacing:"0.18em",
          textTransform:"uppercase", color:T.amber, marginBottom:"0.6rem" }}>
          <div style={{ width:20, height:1, background:T.amber }} />
          Account
        </div>
        <h1 style={{ fontFamily:"'Playfair Display',serif",
          fontSize:"clamp(1.6rem,3.5vw,2.8rem)", fontWeight:900,
          letterSpacing:"-0.025em", lineHeight:1.1 }}>
          Your Account
        </h1>
      </div>

      <div style={{ display:"grid",
        gridTemplateColumns:bp==="mobile"?"1fr":bp==="tablet"?"1fr":"1fr 1fr",
        gap:"1px", background:T.border, border:`1px solid ${T.border}`,
        marginBottom:"2rem", animation:"fadeUp 0.35s both" }}>

        {/* Profile card */}
        <div style={{ background:T.surface, padding:"1.5rem" }}>
          <div style={{ fontFamily:"DM Mono", fontSize:"0.5rem", letterSpacing:"0.14em",
            textTransform:"uppercase", color:T.muted, marginBottom:"1.1rem" }}>
            Profile
          </div>

          <div style={{ display:"flex", alignItems:"center", gap:"1rem", marginBottom:"1.25rem" }}>
            <div style={{ width:48, height:48, borderRadius:"50%",
              background:`linear-gradient(135deg, ${T.amber}, ${T.teal})`,
              display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
              <span style={{ fontFamily:"'Playfair Display',serif",
                fontSize:"1.3rem", fontWeight:700, color:"#000" }}>
                {user?.email?.[0]?.toUpperCase()}
              </span>
            </div>
            <div>
              <div style={{ fontFamily:"DM Mono", fontSize:"0.65rem",
                color:T.text, marginBottom:"0.3rem", wordBreak:"break-all" }}>
                {user?.email}
              </div>
              <PlanBadge plan={plan} />
            </div>
          </div>

          <div style={{ borderTop:`1px solid ${T.border}`, paddingTop:"1rem" }}>
            <div style={{ fontFamily:"DM Mono", fontSize:"0.48rem", letterSpacing:"0.1em",
              textTransform:"uppercase", color:T.muted, marginBottom:"0.4rem" }}>
              Member since
            </div>
            <div style={{ fontFamily:"DM Mono", fontSize:"0.6rem", color:T.text }}>
              {profile?.created_at
                ? new Date(profile.created_at).toLocaleDateString("en-PH", { month:"long", day:"numeric", year:"numeric" })
                : "—"}
            </div>
          </div>

          <button onClick={() => signOut().then(() => navigate("home"))}
            style={{ marginTop:"1.25rem", background:"none", border:`1px solid ${T.border}`,
              color:T.muted, padding:"0.4rem 0.9rem", fontFamily:"DM Mono",
              fontSize:"0.52rem", letterSpacing:"0.08em", textTransform:"uppercase",
              cursor:"pointer", transition:"all 0.2s", width:"100%" }}
            onMouseEnter={e=>e.currentTarget.style.borderColor=T.rose}
            onMouseLeave={e=>e.currentTarget.style.borderColor=T.border}>
            Sign Out
          </button>
        </div>

        {/* Plan status card */}
        <div style={{ background:T.surface, padding:"1.5rem" }}>
          <div style={{ fontFamily:"DM Mono", fontSize:"0.5rem", letterSpacing:"0.14em",
            textTransform:"uppercase", color:T.muted, marginBottom:"1.1rem" }}>
            Plan Status
          </div>

          {plan === "lifetime" ? (
            <div>
              <div style={{ display:"flex", alignItems:"center", gap:"0.75rem", marginBottom:"1rem" }}>
                <div style={{ fontSize:"2.5rem" }}>◉</div>
                <div>
                  <div style={{ fontFamily:"'Playfair Display',serif",
                    fontSize:"1.3rem", fontWeight:700, color:"#a78bfa" }}>
                    Lifetime Access
                  </div>
                  <div style={{ fontFamily:"DM Mono", fontSize:"0.54rem", color:T.muted }}>
                    Full access, forever. No expiry.
                  </div>
                </div>
              </div>
              <div style={{ background:"#a78bfa08", border:"1px solid #a78bfa20",
                padding:"0.75rem 1rem", fontFamily:"DM Mono", fontSize:"0.56rem",
                color:T.muted, lineHeight:1.7 }}>
                Thank you for supporting PEI. Your contribution helps keep the index running for all Filipinos.
              </div>
            </div>
          ) : (
            <div>
              <div style={{ marginBottom:"1.25rem" }}>
                <div style={{ display:"flex", justifyContent:"space-between",
                  alignItems:"baseline", marginBottom:"0.5rem" }}>
                  <div style={{ fontFamily:"'Playfair Display',serif",
                    fontSize:"1.5rem", fontWeight:700, color:planColor }}>
                    {status?.days ?? 0} days left
                  </div>
                  <div style={{ fontFamily:"DM Mono", fontSize:"0.5rem", color:T.muted }}>
                    of {status?.total} days
                  </div>
                </div>
                <DaysBar pct={100 - (status?.pct || 0)} color={planColor} />
                <div style={{ fontFamily:"DM Mono", fontSize:"0.5rem",
                  color:T.muted, marginTop:"0.4rem" }}>
                  {status?.days > 0
                    ? `Expires ${status.expires.toLocaleDateString("en-PH", { month:"long", day:"numeric", year:"numeric" })}`
                    : "Your plan has expired"}
                </div>
              </div>

              {status?.days <= 2 && (
                <div style={{ background:`${T.rose}08`, border:`1px solid ${T.rose}25`,
                  padding:"0.6rem 0.75rem", fontFamily:"DM Mono", fontSize:"0.54rem",
                  color:T.rose, marginBottom:"1rem", lineHeight:1.6 }}>
                  ⚠ Your {plan === "trial" ? "trial" : "plan"} is expiring soon. Upgrade to keep access.
                </div>
              )}

              <button onClick={() => navigate("pricing")}
                style={{ width:"100%", background:planColor, color:"#000", border:"none",
                  padding:"0.6rem", fontFamily:"DM Mono", fontSize:"0.58rem",
                  fontWeight:500, letterSpacing:"0.08em", textTransform:"uppercase",
                  cursor:"pointer", transition:"all 0.2s" }}
                onMouseEnter={e=>e.currentTarget.style.opacity="0.85"}
                onMouseLeave={e=>e.currentTarget.style.opacity="1"}>
                {plan === "trial" ? "Unlock Full Access →" : "Renew Plan →"}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Plans comparison */}
      {plan !== "lifetime" && (
        <div style={{ animation:"fadeUp 0.4s 0.1s both" }}>
          <div style={{ fontFamily:"DM Mono", fontSize:"0.5rem", letterSpacing:"0.14em",
            textTransform:"uppercase", color:T.muted, marginBottom:"1rem" }}>
            Choose a Plan
          </div>
          <div style={{ display:"grid",
            gridTemplateColumns:bp==="mobile"?"1fr":"repeat(3,1fr)",
            gap:"1px", background:T.border, border:`1px solid ${T.border}` }}>
            {plans.map((p, i) => {
              const isCurrent = p.id === plan;
              return (
                <div key={i} style={{ background:isCurrent?`${p.color}08`:T.surface,
                  padding:"1.5rem", position:"relative", overflow:"hidden" }}>
                  {isCurrent && (
                    <div style={{ position:"absolute", top:0, left:0, right:0,
                      height:2, background:p.color }} />
                  )}
                  <div style={{ fontFamily:"DM Mono", fontSize:"0.48rem", letterSpacing:"0.14em",
                    textTransform:"uppercase", color:p.color, marginBottom:"0.5rem" }}>
                    {isCurrent ? "Current Plan" : p.label}
                  </div>
                  <div style={{ fontFamily:"'Playfair Display',serif",
                    fontSize:"1.8rem", fontWeight:900, color:p.color,
                    lineHeight:1, marginBottom:"0.2rem" }}>
                    {p.price}
                  </div>
                  <div style={{ fontFamily:"DM Mono", fontSize:"0.5rem",
                    color:T.muted, marginBottom:"1.1rem" }}>
                    {p.duration}
                  </div>
                  <div style={{ display:"flex", flexDirection:"column", gap:"0.4rem", marginBottom:"1.25rem" }}>
                    {p.features.map((f,j) => (
                      <div key={j} style={{ display:"flex", alignItems:"center", gap:"0.5rem",
                        fontFamily:"DM Mono", fontSize:"0.54rem", color:T.muted }}>
                        <span style={{ color:p.color, flexShrink:0 }}>✓</span>
                        {f}
                      </div>
                    ))}
                  </div>
                  {!isCurrent && p.id !== "trial" && (
                    <button onClick={() => navigate("pricing")}
                      style={{ width:"100%", background:"none", border:`1px solid ${p.color}`,
                        color:p.color, padding:"0.5rem", fontFamily:"DM Mono",
                        fontSize:"0.54rem", letterSpacing:"0.08em", textTransform:"uppercase",
                        cursor:"pointer", transition:"all 0.2s" }}
                      onMouseEnter={e=>{ e.currentTarget.style.background=p.color; e.currentTarget.style.color="#000"; }}
                      onMouseLeave={e=>{ e.currentTarget.style.background="none"; e.currentTarget.style.color=p.color; }}>
                      Get {p.label} →
                    </button>
                  )}
                  {isCurrent && (
                    <div style={{ fontFamily:"DM Mono", fontSize:"0.5rem",
                      color:T.muted, textAlign:"center" }}>Active</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
