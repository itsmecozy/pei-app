import { useState } from "react";
import { signInWithEmail, signUpWithEmail, signInWithGoogle } from "../../lib/supabase";
import { T } from "../../constants/tokens";

export default function AuthModal({ open, onClose, defaultMode = "signup" }) {
  const [mode, setMode]       = useState(defaultMode);
  const [email, setEmail]     = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);
  const [done, setDone]       = useState(false);

  const reset = () => {
    setEmail(""); setPassword(""); setError(null); setDone(false); setLoading(false);
  };
  const handleClose = () => { reset(); onClose(); };

  const handleEmail = async () => {
    if (!email || !password) return;
    setLoading(true); setError(null);
    try {
      if (mode === "signup") {
        await signUpWithEmail(email, password);
        setDone(true);
      } else {
        await signInWithEmail(email, password);
        handleClose();
      }
    } catch (e) {
      setError(e.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setLoading(true); setError(null);
    try {
      await signInWithGoogle();
    } catch (e) {
      setError(e.message || "Google sign in failed.");
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.88)",
      backdropFilter:"blur(12px)", zIndex:400,
      display:"flex", alignItems:"center", justifyContent:"center", padding:"2rem" }}
      onClick={e => { if(e.target===e.currentTarget) handleClose(); }}>
      <div style={{ background:T.surface, border:`1px solid ${T.border}`,
        maxWidth:420, width:"100%", animation:"modalIn 0.3s ease" }}>

        {/* Header */}
        <div style={{ padding:"1.1rem 1.4rem", borderBottom:`1px solid ${T.border}`,
          display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <span style={{ fontFamily:"'Playfair Display',serif", fontSize:"1.1rem", fontWeight:700 }}>
            {mode === "signup" ? "Start Your Personal Index" : "Welcome Back"}
          </span>
          <button onClick={handleClose}
            style={{ background:"none", border:"none", color:T.muted, cursor:"pointer", fontSize:"1rem" }}>✕</button>
        </div>

        <div style={{ padding:"1.25rem 1.4rem" }}>
          {done ? (
            <div style={{ textAlign:"center", padding:"1.5rem 0" }}>
              <div style={{ fontSize:"2rem", color:T.teal, marginBottom:"0.6rem" }}>◉</div>
              <div style={{ fontFamily:"'Playfair Display',serif", fontSize:"1rem",
                fontWeight:700, marginBottom:"0.4rem" }}>Check your email.</div>
              <p style={{ fontFamily:"DM Mono", fontSize:"0.58rem", color:T.muted, lineHeight:1.7 }}>
                We sent a confirmation link to <span style={{ color:T.amber }}>{email}</span>.
                Click it to activate your 7-day free trial.
              </p>
            </div>
          ) : (
            <>
              {/* Google button */}
              <button onClick={handleGoogle} disabled={loading}
                style={{ width:"100%", background:T.surface2, border:`1px solid ${T.border}`,
                  color:T.text, padding:"0.65rem", fontFamily:"DM Mono", fontSize:"0.58rem",
                  letterSpacing:"0.06em", cursor:"pointer", transition:"all 0.2s",
                  display:"flex", alignItems:"center", justifyContent:"center", gap:"0.6rem",
                  marginBottom:"1rem" }}
                onMouseEnter={e=>e.currentTarget.style.borderColor=T.amber}
                onMouseLeave={e=>e.currentTarget.style.borderColor=T.border}>
                <svg width="16" height="16" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Continue with Google
              </button>

              <div style={{ display:"flex", alignItems:"center", gap:"0.75rem", marginBottom:"1rem" }}>
                <div style={{ flex:1, height:1, background:T.border }} />
                <span style={{ fontFamily:"DM Mono", fontSize:"0.5rem", color:T.muted }}>or</span>
                <div style={{ flex:1, height:1, background:T.border }} />
              </div>

              {/* Email */}
              <div style={{ display:"flex", flexDirection:"column", gap:"0.5rem", marginBottom:"0.75rem" }}>
                <input type="email" placeholder="Email address" value={email}
                  onChange={e=>setEmail(e.target.value)}
                  style={{ width:"100%", background:T.bg, border:`1px solid ${T.border}`,
                    color:T.text, padding:"0.6rem 0.75rem", fontFamily:"DM Mono",
                    fontSize:"0.65rem", outline:"none", boxSizing:"border-box" }}
                  onFocus={e=>e.target.style.borderColor=T.amber}
                  onBlur={e=>e.target.style.borderColor=T.border} />
                <input type="password" placeholder="Password (min 6 characters)" value={password}
                  onChange={e=>setPassword(e.target.value)}
                  onKeyDown={e=>e.key==="Enter"&&handleEmail()}
                  style={{ width:"100%", background:T.bg, border:`1px solid ${T.border}`,
                    color:T.text, padding:"0.6rem 0.75rem", fontFamily:"DM Mono",
                    fontSize:"0.65rem", outline:"none", boxSizing:"border-box" }}
                  onFocus={e=>e.target.style.borderColor=T.amber}
                  onBlur={e=>e.target.style.borderColor=T.border} />
              </div>

              {error && (
                <div style={{ padding:"0.5rem 0.65rem", background:`${T.rose}10`,
                  border:`1px solid ${T.rose}30`, fontFamily:"DM Mono",
                  fontSize:"0.54rem", color:T.rose, marginBottom:"0.75rem" }}>
                  {error}
                </div>
              )}

              <button onClick={handleEmail} disabled={loading || !email || !password}
                style={{ width:"100%", background:T.amber, color:"#000", border:"none",
                  padding:"0.6rem", fontFamily:"DM Mono", fontSize:"0.58rem",
                  fontWeight:500, letterSpacing:"0.08em", textTransform:"uppercase",
                  cursor:loading||!email||!password?"not-allowed":"pointer",
                  opacity:loading||!email||!password?0.5:1, transition:"all 0.2s",
                  marginBottom:"1rem" }}>
                {loading ? "Please wait..." : mode === "signup" ? "Start Free Trial →" : "Sign In →"}
              </button>

              <div style={{ textAlign:"center", fontFamily:"DM Mono",
                fontSize:"0.54rem", color:T.muted }}>
                {mode === "signup" ? (
                  <>Already have an account?{" "}
                    <span onClick={()=>setMode("signin")}
                      style={{ color:T.amber, cursor:"pointer" }}>Sign in</span>
                  </>
                ) : (
                  <>Don't have an account?{" "}
                    <span onClick={()=>setMode("signup")}
                      style={{ color:T.amber, cursor:"pointer" }}>Sign up</span>
                  </>
                )}
              </div>
            </>
          )}
        </div>

        {/* Trial info */}
        {!done && mode === "signup" && (
          <div style={{ padding:"0.85rem 1.4rem", borderTop:`1px solid ${T.border}`,
            display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:"0.5rem" }}>
            {[
              { label:"Free Trial", value:"7 days" },
              { label:"Seasonal",   value:"₱49 · 3 months" },
              { label:"Lifetime",   value:"₱99 · forever" },
            ].map((p,i) => (
              <div key={i} style={{ textAlign:"center" }}>
                <div style={{ fontFamily:"DM Mono", fontSize:"0.48rem",
                  letterSpacing:"0.1em", textTransform:"uppercase",
                  color:T.muted, marginBottom:"0.2rem" }}>{p.label}</div>
                <div style={{ fontFamily:"'Playfair Display',serif",
                  fontSize:"0.7rem", fontWeight:700,
                  color:i===0?T.teal:i===1?T.amber:"#a78bfa" }}>{p.value}</div>
              </div>
            ))}
          </div>
        )}
      </div>
      <style>{`
        @keyframes modalIn{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
      `}</style>
    </div>
  );
}
