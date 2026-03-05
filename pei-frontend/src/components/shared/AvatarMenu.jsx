import { useState, useEffect, useRef } from "react";
import { useT } from "../../context/ThemeContext";
import { signOut } from "../../lib/supabase";

export default function AvatarMenu({ user, navigate, currentPage, onAuthClick }) {
  const T = useT();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const initial = user?.email?.[0]?.toUpperCase();

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => { setOpen(false); }, [currentPage]);

  const handleNav  = (dest) => { setOpen(false); navigate(dest); };
  const handleSignOut = async () => { setOpen(false); await signOut(); navigate("home"); };

  const signedInItems = [
    { label:"Profile",            icon:"◎", dest:"account"  },
    { label:"Personal Dashboard", icon:"▦", dest:"personal" },
    { label:"Settings",           icon:"⚙", dest:"settings" },
  ];

  const signedOutItems = [
    { label:"Settings", icon:"⚙", dest:"settings" },
  ];

  return (
    <div ref={ref} style={{ position:"relative", flexShrink:0 }}>
      {/* Avatar button */}
      <button onClick={() => setOpen(o => !o)}
        style={{ width:30, height:30, borderRadius:"50%", border:"none",
          background: user
            ? `linear-gradient(135deg, ${T.amber}, ${T.teal})`
            : T.surface2,
          display:"flex", alignItems:"center", justifyContent:"center",
          cursor:"pointer", transition:"all 0.2s",
          outline: open ? `2px solid ${T.amber}` : "none", outlineOffset:2,
          border: `1px solid ${T.border}` }}
        onMouseEnter={e=>e.currentTarget.style.opacity="0.85"}
        onMouseLeave={e=>e.currentTarget.style.opacity="1"}>
        {user
          ? <span style={{ fontFamily:"DM Mono", fontSize:"0.6rem", fontWeight:700, color:"#000" }}>{initial}</span>
          : <span style={{ color:T.muted, fontSize:"0.8rem" }}>◌</span>
        }
      </button>

      {/* Dropdown */}
      {open && (
        <div style={{ position:"absolute", top:"calc(100% + 8px)", right:0,
          background:T.surface, border:`1px solid ${T.border}`,
          minWidth:210, zIndex:500, animation:"dropIn 0.18s ease",
          boxShadow:`0 8px 32px rgba(0,0,0,0.25)` }}>

          {/* User info or guest */}
          <div style={{ padding:"0.75rem 1rem", borderBottom:`1px solid ${T.border}` }}>
            {user ? (
              <>
                <div style={{ fontFamily:"DM Mono", fontSize:"0.52rem", color:T.text,
                  overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                  {user.email}
                </div>
                <div style={{ fontFamily:"DM Mono", fontSize:"0.46rem", color:T.muted,
                  marginTop:"0.15rem", letterSpacing:"0.08em", textTransform:"uppercase" }}>
                  Signed in
                </div>
              </>
            ) : (
              <div style={{ fontFamily:"DM Mono", fontSize:"0.52rem",
                color:T.muted, letterSpacing:"0.06em" }}>
                Not signed in
              </div>
            )}
          </div>

          {/* Nav items */}
          {(user ? signedInItems : signedOutItems).map(item => (
            <button key={item.dest} onClick={() => handleNav(item.dest)}
              style={{ width:"100%", display:"flex", alignItems:"center",
                gap:"0.65rem", padding:"0.65rem 1rem",
                background: currentPage===item.dest ? `${T.amber}08` : "none",
                border:"none",
                borderLeft:`2px solid ${currentPage===item.dest ? T.amber : "transparent"}`,
                color: T.muted, cursor:"pointer",
                fontFamily:"DM Mono", fontSize:"0.56rem",
                textAlign:"left", transition:"all 0.15s" }}
              onMouseEnter={e=>{ e.currentTarget.style.color=T.text; e.currentTarget.style.background=T.surface2; }}
              onMouseLeave={e=>{ e.currentTarget.style.color=T.muted; e.currentTarget.style.background=currentPage===item.dest?`${T.amber}08`:"none"; }}>
              <span style={{ fontSize:"0.7rem", opacity:0.6, width:14,
                textAlign:"center", flexShrink:0 }}>{item.icon}</span>
              {item.label}
            </button>
          ))}

          {/* Sign in or Sign out */}
          <div style={{ borderTop:`1px solid ${T.border}` }}>
            {user ? (
              <button onClick={handleSignOut}
                style={{ width:"100%", display:"flex", alignItems:"center",
                  gap:"0.65rem", padding:"0.65rem 1rem", background:"none",
                  border:"none", color:T.muted, cursor:"pointer",
                  fontFamily:"DM Mono", fontSize:"0.56rem",
                  textAlign:"left", transition:"all 0.15s" }}
                onMouseEnter={e=>{ e.currentTarget.style.color=T.rose; e.currentTarget.style.background=`${T.rose}08`; }}
                onMouseLeave={e=>{ e.currentTarget.style.color=T.muted; e.currentTarget.style.background="none"; }}>
                <span style={{ fontSize:"0.7rem", opacity:0.6, width:14,
                  textAlign:"center", flexShrink:0 }}>→</span>
                Sign Out
              </button>
            ) : (
              <button onClick={() => { setOpen(false); onAuthClick(); }}
                style={{ width:"100%", display:"flex", alignItems:"center",
                  gap:"0.65rem", padding:"0.65rem 1rem", background:"none",
                  border:"none", color:T.amber, cursor:"pointer",
                  fontFamily:"DM Mono", fontSize:"0.56rem",
                  textAlign:"left", transition:"all 0.15s" }}
                onMouseEnter={e=>{ e.currentTarget.style.background=`${T.amber}08`; }}
                onMouseLeave={e=>{ e.currentTarget.style.background="none"; }}>
                <span style={{ fontSize:"0.7rem", opacity:0.6, width:14,
                  textAlign:"center", flexShrink:0 }}>◌</span>
                Sign In / Sign Up
              </button>
            )}
          </div>
        </div>
      )}
      <style>{`@keyframes dropIn{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:translateY(0)}}`}</style>
    </div>
  );
}
