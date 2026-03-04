import { useState, useEffect } from "react";
import { T } from "../../constants/tokens";
import { useBreakpoint } from "../../hooks/useBreakpoint";

export default function Navigation({ navigate, currentPage, openModal, user, onAccountClick }) {
  const bp = useBreakpoint();
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", h, { passive: true });
    return () => window.removeEventListener("scroll", h);
  }, []);

  const navItems = [
    { id:"dashboard",   label:"Dashboard"   },
    { id:"map",         label:"Map"         },
    { id:"trends",      label:"Trends"      },
    { id:"seasonal",    label:"Seasonal"    },
    { id:"ethics",      label:"Ethics"      },
    { id:"methodology", label:"Methodology" },
  ];

  const initial = user?.email?.[0]?.toUpperCase() || "?";

  return (
    <>
      <nav style={{
        position:"fixed", top:0, left:0, right:0, zIndex:200,
        background: scrolled ? "rgba(7,9,15,0.97)" : "rgba(7,9,15,0.6)",
        backdropFilter:"blur(20px)",
        borderBottom:`1px solid ${scrolled ? T.border : "transparent"}`,
        transition:"all 0.3s"
      }}>
        <div style={{ display:"flex", alignItems:"center", height:60, padding:"0 1.25rem", gap:"0.75rem" }}>

          {/* Logo */}
          <div style={{ display:"flex", alignItems:"center", gap:"0.5rem", flexShrink:0 }}>
            <span style={{ fontFamily:"'Playfair Display',serif", fontSize:"1.3rem",
              fontWeight:900, color:T.amber, cursor:"pointer", letterSpacing:"-0.02em" }}
              onClick={() => navigate("home")}>PEI</span>
            {bp !== "mobile" && (
              <span style={{ fontFamily:"DM Mono", fontSize:"0.52rem", color:T.muted,
                letterSpacing:"0.12em", textTransform:"uppercase" }}>
                Philippines Emotional Index
              </span>
            )}
            <div style={{ display:"flex", alignItems:"center", gap:"0.25rem" }}>
              <span style={{ width:5, height:5, borderRadius:"50%", background:"#10b981",
                animation:"liveP 2s infinite", display:"inline-block" }} />
              {bp === "desktop" && (
                <span style={{ fontFamily:"DM Mono", fontSize:"0.48rem",
                  color:"#10b981", letterSpacing:"0.1em" }}>LIVE</span>
              )}
            </div>
          </div>

          {/* Nav links */}
          <div style={{ display:"flex", alignItems:"center", gap:"0.1rem",
            flex:1, overflowX:"auto", msOverflowStyle:"none", scrollbarWidth:"none" }}>
            {navItems.map(n => {
              const isActive = currentPage === n.id;
              return (
                <button key={n.id} onClick={() => navigate(n.id)} style={{
                  flexShrink:0,
                  background: isActive ? `${T.amber}12` : "none",
                  border: `1px solid ${isActive ? T.amber+"50" : "transparent"}`,
                  fontFamily:"DM Mono",
                  fontSize: bp === "mobile" ? "0.52rem" : "0.58rem",
                  letterSpacing:"0.08em", textTransform:"uppercase",
                  color: isActive ? T.amber : T.muted,
                  cursor:"pointer",
                  padding: bp === "mobile" ? "0.3rem 0.5rem" : "0.32rem 0.7rem",
                  transition:"all 0.2s", whiteSpace:"nowrap", position:"relative",
                }}
                  onMouseEnter={e=>{ if(!isActive) e.currentTarget.style.color=T.text; }}
                  onMouseLeave={e=>{ if(!isActive) e.currentTarget.style.color=T.muted; }}>
                  {n.label}
                  {isActive && (
                    <span style={{ position:"absolute", bottom:-1, left:"50%",
                      transform:"translateX(-50%)", width:"60%", height:1, background:T.amber }} />
                  )}
                </button>
              );
            })}
          </div>

          {/* Right side: Submit + Account */}
          <div style={{ display:"flex", alignItems:"center", gap:"0.5rem", flexShrink:0 }}>
            <button onClick={openModal} style={{
              background:T.amber, color:"#000", border:"none",
              padding: bp === "mobile" ? "0.32rem 0.6rem" : "0.38rem 0.9rem",
              fontFamily:"DM Mono",
              fontSize: bp === "mobile" ? "0.54rem" : "0.58rem",
              fontWeight:500, letterSpacing:"0.08em", textTransform:"uppercase",
              cursor:"pointer", transition:"all 0.2s"
            }}
              onMouseEnter={e=>e.currentTarget.style.background="#fff"}
              onMouseLeave={e=>e.currentTarget.style.background=T.amber}>
              {bp === "mobile" ? "+" : "Submit Feeling"}
            </button>

            {/* Account avatar */}
            <button onClick={onAccountClick}
              title={user ? `${user.email} · Personal Index` : "Sign in"}
              style={{
                width:30, height:30, borderRadius:"50%", border:"none",
                background: user
                  ? `linear-gradient(135deg, ${T.amber}, ${T.teal})`
                  : T.surface2,
                display:"flex", alignItems:"center", justifyContent:"center",
                cursor:"pointer", flexShrink:0, transition:"all 0.2s",
                outline: currentPage === "personal" ? `2px solid ${T.amber}` : "none",
                outlineOffset:2,
              }}
              onMouseEnter={e=>e.currentTarget.style.opacity="0.8"}
              onMouseLeave={e=>e.currentTarget.style.opacity="1"}>
              {user ? (
                <span style={{ fontFamily:"DM Mono", fontSize:"0.6rem",
                  fontWeight:700, color:"#000" }}>{initial}</span>
              ) : (
                <span style={{ color:T.muted, fontSize:"0.7rem" }}>◌</span>
              )}
            </button>
          </div>
        </div>
      </nav>
      <style>{`
        @keyframes liveP{0%,100%{opacity:1}50%{opacity:0.3}}
        @keyframes skeletonPulse{0%,100%{opacity:0.4}50%{opacity:0.8}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
        nav div::-webkit-scrollbar{display:none}
      `}</style>
    </>
  );
}
