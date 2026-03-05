import { useState, useEffect } from "react";
import { T } from "../../constants/tokens";
import { useBreakpoint } from "../../hooks/useBreakpoint";
import AvatarMenu from "./AvatarMenu";

const NAV_ITEMS = [
  { id:"home",        label:"Home",        icon:"◎" },
  { id:"dashboard",   label:"Dashboard",   icon:"▦" },
  { id:"map",         label:"Map",         icon:"◈" },
  { id:"trends",      label:"Trends",      icon:"↗" },
  { id:"seasonal",    label:"Seasonal",    icon:"◌" },
  { id:"ethics",      label:"Ethics",      icon:"◇" },
  { id:"methodology", label:"Methodology", icon:"≡" },
];

function Sidebar({ navigate, currentPage, openModal, user, onAuthClick }) {
  return (
    <aside style={{ position:"fixed", top:0, left:0, bottom:0, width:220, zIndex:200,
      background:T.surface, borderRight:`1px solid ${T.border}`,
      display:"flex", flexDirection:"column", overflow:"hidden" }}>

      <div style={{ position:"absolute", inset:0, opacity:0.025, pointerEvents:"none",
        backgroundImage:`url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
        backgroundSize:"150px" }} />

      {/* Logo */}
      <div style={{ padding:"1.5rem 1.25rem 1rem", borderBottom:`1px solid ${T.border}` }}>
        <div style={{ display:"flex", alignItems:"center", gap:"0.5rem", cursor:"pointer" }}
          onClick={() => navigate("home")}>
          <span style={{ fontFamily:"'Playfair Display',serif", fontSize:"1.6rem",
            fontWeight:900, color:T.amber, letterSpacing:"-0.02em" }}>PEI</span>
          <div style={{ display:"flex", flexDirection:"column", gap:1 }}>
            <span style={{ fontFamily:"DM Mono", fontSize:"0.44rem", letterSpacing:"0.14em",
              textTransform:"uppercase", color:T.muted, lineHeight:1 }}>Philippines</span>
            <span style={{ fontFamily:"DM Mono", fontSize:"0.44rem", letterSpacing:"0.14em",
              textTransform:"uppercase", color:T.muted, lineHeight:1 }}>Emotional Index</span>
          </div>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:"0.35rem", marginTop:"0.6rem" }}>
          <span style={{ width:6, height:6, borderRadius:"50%", background:"#10b981",
            animation:"liveP 2s infinite", display:"inline-block", flexShrink:0 }} />
          <span style={{ fontFamily:"DM Mono", fontSize:"0.48rem",
            letterSpacing:"0.12em", color:"#10b981" }}>LIVE INDEX</span>
        </div>
      </div>

      {/* Nav items */}
      <nav style={{ flex:1, padding:"0.75rem 0", overflowY:"auto" }}>
        {NAV_ITEMS.map(item => {
          const isActive = currentPage === item.id;
          return (
            <button key={item.id} onClick={() => navigate(item.id)}
              style={{ width:"100%", display:"flex", alignItems:"center",
                gap:"0.75rem", padding:"0.6rem 1.25rem",
                background: isActive ? `${T.amber}10` : "none",
                border:"none", borderLeft:`2px solid ${isActive ? T.amber : "transparent"}`,
                color: isActive ? T.amber : T.muted, cursor:"pointer",
                fontFamily:"DM Mono", fontSize:"0.58rem", letterSpacing:"0.06em",
                textTransform:"uppercase", transition:"all 0.18s", textAlign:"left" }}
              onMouseEnter={e=>{ if(!isActive){ e.currentTarget.style.color=T.text; e.currentTarget.style.background="rgba(255,255,255,0.03)"; }}}
              onMouseLeave={e=>{ if(!isActive){ e.currentTarget.style.color=T.muted; e.currentTarget.style.background="none"; }}}>
              <span style={{ fontSize:"0.75rem", opacity:0.7, width:14,
                textAlign:"center", flexShrink:0 }}>{item.icon}</span>
              {item.label}
            </button>
          );
        })}
      </nav>

      {/* Bottom */}
      <div style={{ borderTop:`1px solid ${T.border}`, padding:"1rem 1.25rem" }}>
        {user ? (
          <div style={{ marginBottom:"0.75rem" }}>
            <div style={{ display:"flex", alignItems:"center",
              justifyContent:"space-between", gap:"0.5rem" }}>
              <div style={{ overflow:"hidden", flex:1 }}>
                <div style={{ fontFamily:"DM Mono", fontSize:"0.5rem", color:T.text,
                  overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                  {user.email}
                </div>
                <div style={{ fontFamily:"DM Mono", fontSize:"0.44rem", color:T.muted,
                  letterSpacing:"0.08em", textTransform:"uppercase", marginTop:"0.1rem" }}>
                  Signed in
                </div>
              </div>
              <AvatarMenu user={user} navigate={navigate} currentPage={currentPage} />
            </div>
          </div>
        ) : (
          <button onClick={onAuthClick}
            style={{ width:"100%", background:"none", border:`1px solid ${T.border}`,
              color:T.muted, padding:"0.45rem", fontFamily:"DM Mono", fontSize:"0.52rem",
              letterSpacing:"0.08em", textTransform:"uppercase", cursor:"pointer",
              marginBottom:"0.75rem", transition:"all 0.2s" }}
            onMouseEnter={e=>e.currentTarget.style.color=T.text}
            onMouseLeave={e=>e.currentTarget.style.color=T.muted}>
            Sign In
          </button>
        )}

        <button onClick={openModal}
          style={{ width:"100%", background:T.amber, color:"#000", border:"none",
            padding:"0.55rem", fontFamily:"DM Mono", fontSize:"0.56rem",
            fontWeight:500, letterSpacing:"0.1em", textTransform:"uppercase",
            cursor:"pointer", transition:"all 0.2s" }}
          onMouseEnter={e=>e.currentTarget.style.background="#fff"}
          onMouseLeave={e=>e.currentTarget.style.background=T.amber}>
          + Submit Feeling
        </button>
      </div>

      <style>{`@keyframes liveP{0%,100%{opacity:1}50%{opacity:0.3}}`}</style>
    </aside>
  );
}

function TopBar({ navigate, currentPage, openModal, user, onAuthClick }) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", h, { passive:true });
    return () => window.removeEventListener("scroll", h);
  }, []);

  return (
    <>
      <nav style={{ position:"fixed", top:0, left:0, right:0, zIndex:200, height:56,
        background: scrolled ? "rgba(7,9,15,0.97)" : "rgba(7,9,15,0.6)",
        backdropFilter:"blur(20px)",
        borderBottom:`1px solid ${scrolled ? T.border : "transparent"}`,
        transition:"all 0.3s", display:"flex", alignItems:"center",
        padding:"0 1rem", gap:"0.5rem" }}>

        <span style={{ fontFamily:"'Playfair Display',serif", fontSize:"1.2rem",
          fontWeight:900, color:T.amber, cursor:"pointer", flexShrink:0 }}
          onClick={() => navigate("home")}>PEI</span>

        <span style={{ width:5, height:5, borderRadius:"50%", background:"#10b981",
          animation:"liveP 2s infinite", display:"inline-block", flexShrink:0 }} />

        <div style={{ display:"flex", alignItems:"center", gap:"0.1rem",
          flex:1, overflowX:"auto", msOverflowStyle:"none", scrollbarWidth:"none" }}>
          {NAV_ITEMS.slice(1).map(n => {
            const isActive = currentPage === n.id;
            return (
              <button key={n.id} onClick={() => navigate(n.id)} style={{
                flexShrink:0, background: isActive ? `${T.amber}12` : "none",
                border:`1px solid ${isActive ? T.amber+"50" : "transparent"}`,
                fontFamily:"DM Mono", fontSize:"0.52rem", letterSpacing:"0.06em",
                textTransform:"uppercase", color: isActive ? T.amber : T.muted,
                cursor:"pointer", padding:"0.28rem 0.5rem", transition:"all 0.2s" }}>
                {n.label}
              </button>
            );
          })}
        </div>

        <div style={{ display:"flex", alignItems:"center", gap:"0.4rem", flexShrink:0 }}>
          <button onClick={openModal}
            style={{ background:T.amber, color:"#000", border:"none",
              padding:"0.3rem 0.55rem", fontFamily:"DM Mono", fontSize:"0.52rem",
              fontWeight:500, letterSpacing:"0.06em", cursor:"pointer" }}>+</button>
          {user
            ? <AvatarMenu user={user} navigate={navigate} currentPage={currentPage} />
            : <button onClick={onAuthClick}
                style={{ width:28, height:28, borderRadius:"50%", border:"none",
                  background:T.surface2, display:"flex", alignItems:"center",
                  justifyContent:"center", cursor:"pointer" }}>
                <span style={{ color:T.muted, fontSize:"0.65rem" }}>◌</span>
              </button>
          }
        </div>
      </nav>
      <style>{`
        @keyframes liveP{0%,100%{opacity:1}50%{opacity:0.3}}
        nav div::-webkit-scrollbar{display:none}
      `}</style>
    </>
  );
}

export default function Navigation({ navigate, currentPage, openModal, user, onAuthClick }) {
  const bp = useBreakpoint();
  if (bp === "desktop") {
    return <Sidebar navigate={navigate} currentPage={currentPage}
      openModal={openModal} user={user} onAuthClick={onAuthClick} />;
  }
  return <TopBar navigate={navigate} currentPage={currentPage}
    openModal={openModal} user={user} onAuthClick={onAuthClick} />;
}
