import { useState, useEffect } from "react";
import { useT } from "../../context/ThemeContext";
import { useBreakpoint } from "../../hooks/useBreakpoint";
import AvatarMenu from "./AvatarMenu";

// Primary nav — always visible on mobile top bar
const PRIMARY_NAV = [
  { id:"dashboard",   label:"Dashboard" },
  { id:"map",         label:"Map"       },
  { id:"trends",      label:"Trends"    },
];

// All nav items — shown in desktop sidebar + mobile "More" menu
const ALL_NAV = [
  { id:"dashboard",   label:"Dashboard"   },
  { id:"map",         label:"Map"         },
  { id:"trends",      label:"Trends"      },
  { id:"seasonal",    label:"Seasonal"    },
  { id:"ethics",      label:"Ethics"      },
  { id:"methodology", label:"Methodology" },
];

// ─── DESKTOP sidebar ──────────────────────────────────────────────────────────
function DesktopNav({ navigate, currentPage, openModal, user, profile, onAuthClick }) {
  const T = useT();
  return (
    <>
      <aside style={{ position:"fixed", top:0, left:0, bottom:0, width:200, zIndex:200,
        background:T.surface, borderRight:`1px solid ${T.border}`,
        display:"flex", flexDirection:"column" }}>

        {/* Logo */}
        <div style={{ padding:"1.25rem 1.1rem 0.9rem",
          borderBottom:`1px solid ${T.border}` }}>
          <div style={{ display:"flex", alignItems:"center", gap:6, cursor:"pointer",
            marginBottom:8 }} onClick={() => navigate("home")}>
            <span style={{ fontSize:"1.5rem", fontWeight:800,
              color:T.amber, letterSpacing:"-0.02em" }}>PEI</span>
            <div style={{ display:"flex", flexDirection:"column", gap:1 }}>
              <span style={{ fontSize:"0.42rem", letterSpacing:"0.14em",
                textTransform:"uppercase", color:T.muted, lineHeight:1 }}>Philippines</span>
              <span style={{ fontSize:"0.42rem", letterSpacing:"0.14em",
                textTransform:"uppercase", color:T.muted, lineHeight:1 }}>Emotional Index</span>
            </div>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:5 }}>
            <span style={{ width:5, height:5, borderRadius:"50%", background:"#10b981",
              animation:"liveP 2s infinite", display:"inline-block" }} />
            <span style={{ fontSize:"0.44rem", letterSpacing:"0.12em",
              color:"#10b981", textTransform:"uppercase" }}>Live Index</span>
          </div>
        </div>

        {/* Nav items */}
        <nav style={{ flex:1, padding:"0.5rem 0", overflowY:"auto" }}>
          {ALL_NAV.map(item => {
            const isActive = currentPage === item.id;
            return (
              <button key={item.id} onClick={() => navigate(item.id)}
                style={{ width:"100%", display:"flex", alignItems:"center",
                  padding:"0.55rem 1.1rem",
                  background: isActive ? `${T.amber}12` : "none",
                  border:"none",
                  borderLeft:`2px solid ${isActive ? T.amber : "transparent"}`,
                  color: isActive ? T.amber : T.muted,
                  cursor:"pointer", fontSize:"0.6rem", letterSpacing:"0.05em",
                  textTransform:"uppercase", transition:"all 0.15s", textAlign:"left" }}
                onMouseEnter={e => { if (!isActive) { e.currentTarget.style.color = T.text; }}}
                onMouseLeave={e => { if (!isActive) { e.currentTarget.style.color = T.muted; }}}>
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Submit */}
        <div style={{ borderTop:`1px solid ${T.border}`, padding:"0.9rem 1.1rem" }}>
          <button onClick={openModal}
            style={{ width:"100%", background:T.amber, color:"#000", border:"none",
              padding:"0.5rem", fontSize:"0.56rem", fontWeight:600,
              letterSpacing:"0.1em", textTransform:"uppercase", cursor:"pointer" }}>
            + How do you feel?
          </button>
        </div>
      </aside>

      {/* Top-right avatar bar */}
      <div style={{ position:"fixed", top:0, left:200, right:0, height:48, zIndex:199,
        display:"flex", alignItems:"center", justifyContent:"flex-end",
        padding:"0 1.25rem", borderBottom:`1px solid ${T.border}`,
        background:T.bg }}>
        <AvatarMenu user={user} profile={profile} navigate={navigate}
          currentPage={currentPage} onAuthClick={onAuthClick} />
      </div>

      <style>{`@keyframes liveP{0%,100%{opacity:1}50%{opacity:0.3}}`}</style>
    </>
  );
}

// ─── MOBILE top bar ───────────────────────────────────────────────────────────
function MobileNav({ navigate, currentPage, openModal, user, profile, onAuthClick }) {
  const T = useT();
  const [scrolled,  setScrolled]  = useState(false);
  const [menuOpen,  setMenuOpen]  = useState(false);

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", h, { passive:true });
    return () => window.removeEventListener("scroll", h);
  }, []);

  return (
    <>
      <nav style={{ position:"fixed", top:0, left:0, right:0, zIndex:200, height:52,
        background: scrolled ? `${T.bg}f5` : `${T.bg}99`,
        backdropFilter:"blur(20px)",
        borderBottom:`1px solid ${scrolled ? T.border : "transparent"}`,
        transition:"all 0.3s", display:"flex", alignItems:"center",
        padding:"0 1rem", gap:"0.5rem" }}>

        {/* Logo */}
        <span style={{ fontSize:"1.15rem", fontWeight:800, color:T.amber,
          cursor:"pointer", flexShrink:0, letterSpacing:"-0.02em" }}
          onClick={() => navigate("home")}>PEI</span>

        <span style={{ width:5, height:5, borderRadius:"50%", background:"#10b981",
          animation:"liveP 2s infinite", display:"inline-block", flexShrink:0 }} />

        {/* Primary nav — 3 items only */}
        <div style={{ display:"flex", alignItems:"center", gap:2, flex:1 }}>
          {PRIMARY_NAV.map(n => {
            const isActive = currentPage === n.id;
            return (
              <button key={n.id} onClick={() => navigate(n.id)}
                style={{ flexShrink:0,
                  background: isActive ? `${T.amber}15` : "none",
                  border:`1px solid ${isActive ? T.amber+"60" : "transparent"}`,
                  fontSize:"0.54rem", letterSpacing:"0.05em",
                  textTransform:"uppercase",
                  color: isActive ? T.amber : T.muted,
                  cursor:"pointer", padding:"0.28rem 0.6rem",
                  transition:"all 0.2s" }}>
                {n.label}
              </button>
            );
          })}

          {/* More button */}
          <button onClick={() => setMenuOpen(v => !v)}
            style={{ flexShrink:0, background:"none",
              border:`1px solid ${menuOpen ? T.border : "transparent"}`,
              fontSize:"0.54rem", letterSpacing:"0.05em",
              textTransform:"uppercase", color:T.muted,
              cursor:"pointer", padding:"0.28rem 0.6rem",
              transition:"all 0.2s" }}>
            More
          </button>
        </div>

        {/* Right actions */}
        <div style={{ display:"flex", alignItems:"center", gap:"0.4rem", flexShrink:0 }}>
          <button onClick={openModal}
            style={{ background:T.amber, color:"#000", border:"none",
              padding:"0.28rem 0.6rem", fontSize:"0.54rem",
              fontWeight:600, letterSpacing:"0.06em", cursor:"pointer" }}>+</button>
          <AvatarMenu user={user} profile={profile} navigate={navigate}
            currentPage={currentPage} onAuthClick={onAuthClick} />
        </div>
      </nav>

      {/* More dropdown */}
      {menuOpen && (
        <div style={{ position:"fixed", top:52, left:0, right:0, zIndex:199,
          background:T.surface, borderBottom:`1px solid ${T.border}`,
          padding:"0.5rem 1rem" }}
          onClick={() => setMenuOpen(false)}>
          {ALL_NAV.filter(n => !PRIMARY_NAV.find(p => p.id === n.id)).map(n => (
            <button key={n.id} onClick={() => navigate(n.id)}
              style={{ display:"block", width:"100%", textAlign:"left",
                background:"none", border:"none",
                padding:"0.6rem 0",
                borderBottom:`1px solid ${T.border}`,
                fontSize:"0.7rem", letterSpacing:"0.05em",
                textTransform:"uppercase",
                color: currentPage === n.id ? T.amber : T.muted,
                cursor:"pointer" }}>
              {n.label}
            </button>
          ))}
        </div>
      )}

      <style>{`
        @keyframes liveP{0%,100%{opacity:1}50%{opacity:0.3}}
      `}</style>
    </>
  );
}

export default function Navigation({ navigate, currentPage, openModal, user, profile, onAuthClick }) {
  const bp = useBreakpoint();
  if (bp === "desktop") {
    return <DesktopNav navigate={navigate} currentPage={currentPage}
      openModal={openModal} user={user} profile={profile} onAuthClick={onAuthClick} />;
  }
  return <MobileNav navigate={navigate} currentPage={currentPage}
    openModal={openModal} user={user} profile={profile} onAuthClick={onAuthClick} />;
}
