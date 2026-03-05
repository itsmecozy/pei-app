import { useState } from "react";
import { useT } from "../../context/ThemeContext";
import { useBreakpoint } from "../../hooks/useBreakpoint";

export default function DonateButton() {
  const T  = useT();
  const bp = useBreakpoint();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const email = "blueskyhorizon.seven@gmail.com";

  const handleCopy = () => {
    navigator.clipboard.writeText(email).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <>
      {/* Floating button */}
      <button onClick={() => setOpen(true)}
        title="Support this project"
        style={{
          position:"fixed",
          bottom: bp === "mobile" ? "1.25rem" : "1.5rem",
          right:  bp === "mobile" ? "1.25rem" : "1.5rem",
          zIndex: 190,
          width: 44, height: 44, borderRadius:"50%",
          background: T.surface,
          border: `1px solid ${T.border}`,
          color: T.rose,
          fontSize:"1.1rem",
          cursor:"pointer",
          display:"flex", alignItems:"center", justifyContent:"center",
          boxShadow:`0 4px 20px rgba(0,0,0,0.25)`,
          transition:"all 0.2s",
          animation:"floatIn 0.4s 0.5s both",
        }}
        onMouseEnter={e => {
          e.currentTarget.style.background = T.rose;
          e.currentTarget.style.color = "#fff";
          e.currentTarget.style.transform = "scale(1.1)";
          e.currentTarget.style.borderColor = T.rose;
        }}
        onMouseLeave={e => {
          e.currentTarget.style.background = T.surface;
          e.currentTarget.style.color = T.rose;
          e.currentTarget.style.transform = "scale(1)";
          e.currentTarget.style.borderColor = T.border;
        }}>
        ♥
      </button>

      {/* Donate modal */}
      {open && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.82)",
          backdropFilter:"blur(10px)", zIndex:400,
          display:"flex", alignItems:"center", justifyContent:"center",
          padding:"1.5rem" }}
          onClick={e => { if (e.target === e.currentTarget) setOpen(false); }}>

          <div style={{ background:T.surface, border:`1px solid ${T.border}`,
            maxWidth:420, width:"100%",
            animation:"modalIn 0.3s ease" }}>

            {/* Top accent */}
            <div style={{ height:2, background:`linear-gradient(to right, ${T.rose}, ${T.amber})` }} />

            {/* Header */}
            <div style={{ padding:"1.25rem 1.5rem",
              borderBottom:`1px solid ${T.border}`,
              display:"flex", alignItems:"center", justifyContent:"space-between" }}>
              <div>
                <div style={{ fontFamily:"DM Mono", fontSize:"0.5rem",
                  letterSpacing:"0.14em", textTransform:"uppercase",
                  color:T.rose, marginBottom:"0.2rem" }}>
                  Support PEI
                </div>
                <div style={{ fontFamily:"'Playfair Display',serif",
                  fontSize:"1.1rem", fontWeight:700, color:T.text }}>
                  Keep the Index Running
                </div>
              </div>
              <button onClick={() => setOpen(false)}
                style={{ background:"none", border:"none", color:T.muted,
                  cursor:"pointer", fontSize:"1.1rem" }}>✕</button>
            </div>

            <div style={{ padding:"1.25rem 1.5rem" }}>
              {/* Message */}
              <p style={{ fontFamily:"DM Mono", fontSize:"0.58rem",
                color:T.muted, lineHeight:1.8, marginBottom:"1.25rem" }}>
                PEI is a free, independent project tracking the emotional state of the Philippines.
                No ads. No corporate backing. If it has been useful to you,
                any amount of support helps keep it alive.
              </p>

              {/* GCash option */}
              <div style={{ border:`1px solid ${T.border}`, marginBottom:"0.75rem",
                overflow:"hidden" }}>
                <div style={{ padding:"0.75rem 1rem",
                  borderBottom:`1px solid ${T.border}`,
                  background:T.surface2,
                  display:"flex", alignItems:"center", gap:"0.6rem" }}>
                  {/* GCash logo */}
                  <svg width="52" height="20" viewBox="0 0 80 32" fill="none">
                    <rect width="80" height="32" rx="4" fill="#007AFF"/>
                    <text x="8" y="22" fontFamily="Arial" fontWeight="800"
                      fontSize="16" fill="white" letterSpacing="-0.5">G</text>
                    <text x="22" y="22" fontFamily="Arial" fontWeight="700"
                      fontSize="13" fill="white">Cash</text>
                  </svg>
                  <span style={{ fontFamily:"DM Mono", fontSize:"0.54rem", color:T.muted }}>
                    Send to GCash
                  </span>
                </div>
                <div style={{ padding:"1rem", textAlign:"center" }}>
                  {/* QR placeholder — replace with real QR image later */}
                  <div style={{ width:120, height:120, margin:"0 auto 0.75rem",
                    background:T.surface2, border:`1px dashed ${T.border}`,
                    display:"flex", alignItems:"center", justifyContent:"center",
                    flexDirection:"column", gap:"0.35rem" }}>
                    <span style={{ fontSize:"1.8rem", opacity:0.3 }}>⊞</span>
                    <span style={{ fontFamily:"DM Mono", fontSize:"0.44rem",
                      color:T.muted, textAlign:"center", lineHeight:1.5 }}>
                      QR code<br/>coming soon
                    </span>
                  </div>
                  <div style={{ fontFamily:"DM Mono", fontSize:"0.52rem",
                    color:T.muted, lineHeight:1.6 }}>
                    Or send to:{" "}
                    <span style={{ color:T.text, fontWeight:500 }}>
                      blueskyhorizon.seven@gmail.com
                    </span>
                  </div>
                </div>
              </div>

              {/* Email option */}
              <div style={{ border:`1px solid ${T.border}`, marginBottom:"1.25rem" }}>
                <div style={{ padding:"0.75rem 1rem",
                  background:T.surface2, borderBottom:`1px solid ${T.border}`,
                  fontFamily:"DM Mono", fontSize:"0.5rem", letterSpacing:"0.1em",
                  textTransform:"uppercase", color:T.muted }}>
                  Send via Bank / Maya / Other
                </div>
                <div style={{ padding:"0.85rem 1rem" }}>
                  <p style={{ fontFamily:"DM Mono", fontSize:"0.54rem",
                    color:T.muted, lineHeight:1.7, marginBottom:"0.75rem" }}>
                    Email us and we'll send you account details for your preferred method.
                  </p>
                  <button onClick={handleCopy}
                    style={{ width:"100%", background: copied ? T.teal : "none",
                      border:`1px solid ${copied ? T.teal : T.border}`,
                      color: copied ? "#000" : T.muted,
                      padding:"0.5rem 0.75rem", fontFamily:"DM Mono",
                      fontSize:"0.54rem", letterSpacing:"0.06em",
                      cursor:"pointer", transition:"all 0.2s",
                      display:"flex", alignItems:"center",
                      justifyContent:"space-between", gap:"0.5rem" }}>
                    <span style={{ overflow:"hidden", textOverflow:"ellipsis",
                      whiteSpace:"nowrap", color: copied ? "#000" : T.text }}>
                      {email}
                    </span>
                    <span style={{ flexShrink:0, color: copied ? "#000" : T.amber }}>
                      {copied ? "Copied ✓" : "Copy"}
                    </span>
                  </button>
                </div>
              </div>

              {/* Footer note */}
              <p style={{ fontFamily:"DM Mono", fontSize:"0.5rem",
                color:T.muted, lineHeight:1.7, textAlign:"center" }}>
                Every contribution, big or small, goes directly into keeping PEI running.
                Thank you. ♥
              </p>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes floatIn{from{opacity:0;transform:scale(0.5)}to{opacity:1;transform:scale(1)}}
        @keyframes modalIn{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
      `}</style>
    </>
  );
}
