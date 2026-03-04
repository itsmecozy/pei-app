import { useState, useEffect } from "react";
import { submitEmotion, searchLGUs } from "../../lib/supabase";
import { T } from "../../constants/tokens";
import { EMOTIONS } from "../../constants/emotions";
import { useBreakpoint } from "../../hooks/useBreakpoint";

export default function SubmissionModal({ open, onClose }) {
  const [step, setStep]             = useState(1);
  const [query, setQuery]           = useState("");
  const [lguResults, setLguResults] = useState([]);
  const [selectedLgu, setSelectedLgu] = useState(null);
  const [searching, setSearching]   = useState(false);
  const [emotion, setEmotion]       = useState(null);
  const [intensity, setIntensity]   = useState(3);
  const [text, setText]             = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone]             = useState(false);
  const [error, setError]           = useState(null);
  const bp = useBreakpoint();

  const reset = () => {
    setStep(1); setQuery(""); setLguResults([]); setSelectedLgu(null);
    setEmotion(null); setIntensity(3); setText(""); setDone(false); setError(null);
  };
  const handleClose = () => { onClose(); setTimeout(reset, 400); };

  useEffect(() => {
    if (query.length < 2) { setLguResults([]); return; }
    const t = setTimeout(async () => {
      setSearching(true);
      try {
        const results = await searchLGUs(query);
        setLguResults(results);
      } catch { setLguResults([]); }
      finally { setSearching(false); }
    }, 300);
    return () => clearTimeout(t);
  }, [query]);

  const handleSubmit = async () => {
    if (!selectedLgu || !emotion) return;
    setSubmitting(true);
    setError(null);
    try {
      const result = await submitEmotion({
        lgu_id: selectedLgu.id,
        emotion: emotion.toLowerCase(),
        intensity,
        text: text.trim() || undefined,
      });
      if (result.acknowledged) {
        setDone(true);
        setTimeout(handleClose, 2800);
      } else {
        setError(result.error || "Something went wrong. Please try again.");
      }
    } catch {
      setError("Connection error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.88)",
      backdropFilter:"blur(12px)", zIndex:300,
      display:"flex", alignItems:bp==="mobile"?"flex-end":"center",
      justifyContent:"center", padding:bp==="mobile"?"0":"2rem" }}
      onClick={e => { if(e.target===e.currentTarget) handleClose(); }}>
      <div style={{ background:T.surface, border:`1px solid ${T.border}`,
        maxWidth:520, width:"100%",
        animation:bp==="mobile"?"slideUp 0.3s ease":"modalIn 0.3s ease",
        borderRadius:bp==="mobile"?"16px 16px 0 0":"0" }}>

        <div style={{ padding:"1.25rem 1.5rem", borderBottom:`1px solid ${T.border}`,
          display:"flex", alignItems:"baseline", justifyContent:"space-between" }}>
          <span style={{ fontFamily:"'Playfair Display',serif", fontSize:"1.2rem", fontWeight:700 }}>
            Add to the Index
          </span>
          <button onClick={handleClose} style={{ background:"none", border:"none",
            color:T.muted, cursor:"pointer", fontSize:"1.1rem" }}>✕</button>
        </div>

        <div style={{ padding:"1.25rem 1.5rem" }}>
          {done ? (
            <div style={{ textAlign:"center", padding:"1.75rem 0" }}>
              <div style={{ fontSize:"3rem", marginBottom:"0.75rem",
                animation:"successPop 0.5s ease" }}>◉</div>
              <div style={{ fontFamily:"'Playfair Display',serif", fontSize:"1.1rem",
                fontWeight:700, marginBottom:"0.4rem" }}>You've been counted.</div>
              <p style={{ fontFamily:"DM Mono", fontSize:"0.62rem", color:T.muted, lineHeight:1.7 }}>
                Your feeling has been added to the national index.<br/>The Philippines felt you.
              </p>
            </div>
          ) : (
            <>
              {step === 1 && (
                <div>
                  <label style={{ fontFamily:"DM Mono", fontSize:"0.58rem",
                    letterSpacing:"0.12em", textTransform:"uppercase",
                    color:T.muted, display:"block", marginBottom:"0.6rem" }}>
                    Search your city or municipality
                  </label>
                  <input type="text" value={query} onChange={e => setQuery(e.target.value)}
                    placeholder="Type a city or municipality name..."
                    style={{ width:"100%", background:T.bg, border:`1px solid ${T.border}`,
                      color:T.text, padding:"0.7rem 0.9rem", fontFamily:"DM Mono",
                      fontSize:"0.72rem", outline:"none", boxSizing:"border-box", marginBottom:"0.5rem" }}
                    onFocus={e=>e.target.style.borderColor=T.amber}
                    onBlur={e=>e.target.style.borderColor=T.border}
                    autoFocus />
                  {searching && (
                    <div style={{ fontFamily:"DM Mono", fontSize:"0.56rem",
                      color:T.muted, padding:"0.5rem 0" }}>Searching...</div>
                  )}
                  {lguResults.length > 0 && (
                    <div style={{ border:`1px solid ${T.border}`, maxHeight:200,
                      overflowY:"auto", marginBottom:"0.5rem" }}>
                      {lguResults.map(lgu => (
                        <div key={lgu.id}
                          onClick={() => { setSelectedLgu(lgu); setQuery(lgu.name); setLguResults([]); }}
                          style={{ padding:"0.65rem 0.9rem", cursor:"pointer",
                            borderBottom:`1px solid ${T.border}`,
                            background: selectedLgu?.id===lgu.id ? T.surface2 : "none",
                            transition:"background 0.15s" }}
                          onMouseEnter={e=>e.currentTarget.style.background=T.surface2}
                          onMouseLeave={e=>e.currentTarget.style.background=selectedLgu?.id===lgu.id?T.surface2:"none"}>
                          <div style={{ fontFamily:"DM Mono", fontSize:"0.62rem", color:T.text }}>{lgu.name}</div>
                          <div style={{ fontFamily:"DM Mono", fontSize:"0.5rem", color:T.muted, marginTop:"0.15rem" }}>
                            {lgu.lgu_type === "city" ? "City" : "Municipality"} · {lgu.province} · {lgu.region}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {selectedLgu && (
                    <div style={{ background:`${T.amber}08`, border:`1px solid ${T.amber}20`,
                      padding:"0.6rem 0.7rem", fontFamily:"DM Mono", fontSize:"0.56rem",
                      color:T.muted, display:"flex", alignItems:"center", gap:"0.4rem" }}>
                      <span style={{ color:T.amber }}>✓</span>
                      {selectedLgu.name}, {selectedLgu.province}
                    </div>
                  )}
                  <div style={{ marginTop:"0.75rem", background:`${T.teal}08`,
                    border:`1px solid ${T.teal}15`, padding:"0.6rem 0.7rem",
                    fontFamily:"DM Mono", fontSize:"0.54rem", color:T.muted }}>
                    <span style={{ color:T.teal }}>Fully anonymous.</span> No IP. No device ID. No tracking.
                  </div>
                </div>
              )}

              {step === 2 && (
                <div>
                  <label style={{ fontFamily:"DM Mono", fontSize:"0.58rem",
                    letterSpacing:"0.12em", textTransform:"uppercase",
                    color:T.muted, display:"block", marginBottom:"0.65rem" }}>
                    What are you feeling?
                  </label>
                  <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)",
                    gap:"0.35rem", marginBottom:"1.1rem" }}>
                    {EMOTIONS.map(em => (
                      <div key={em.name} onClick={() => setEmotion(em.key)}
                        style={{ border:`1px solid ${emotion===em.key?em.hex:T.border}`,
                          background:emotion===em.key?`${em.hex}12`:T.bg,
                          padding:"0.6rem 0.35rem", cursor:"pointer",
                          textAlign:"center", transition:"all 0.2s" }}>
                        <div style={{ fontSize:"1.3rem", marginBottom:"0.2rem" }}>{em.emoji}</div>
                        <div style={{ fontFamily:"DM Mono", fontSize:"0.46rem",
                          color:emotion===em.key?em.hex:T.muted,
                          letterSpacing:"0.06em", textTransform:"uppercase" }}>{em.name}</div>
                      </div>
                    ))}
                  </div>
                  <label style={{ fontFamily:"DM Mono", fontSize:"0.58rem",
                    letterSpacing:"0.12em", textTransform:"uppercase",
                    color:T.muted, display:"block", marginBottom:"0.6rem" }}>Intensity</label>
                  <div style={{ position:"relative", height:36, display:"flex",
                    alignItems:"center", marginBottom:"0.4rem" }}>
                    <div style={{ position:"absolute", width:"100%", height:3,
                      background:"rgba(255,255,255,0.07)", borderRadius:2 }} />
                    <div style={{ position:"absolute", height:3, borderRadius:2,
                      background:`linear-gradient(to right,${T.teal},${T.amber})`,
                      width:`${((intensity-1)/4)*100}%`, transition:"width 0.2s" }} />
                    {[1,2,3,4,5].map(n => (
                      <button key={n} onClick={()=>setIntensity(n)}
                        style={{ position:"absolute", left:`${((n-1)/4)*100}%`,
                          transform:"translateX(-50%)", width:18, height:18, borderRadius:"50%",
                          border:`2px solid ${n<=intensity?T.amber:T.border}`,
                          background:n<=intensity?T.amber:T.bg,
                          cursor:"pointer", transition:"all 0.2s" }} />
                    ))}
                  </div>
                  <div style={{ display:"flex", justifyContent:"space-between",
                    fontFamily:"DM Mono", fontSize:"0.5rem", color:T.muted }}>
                    {["Subtle","Mild","Moderate","Strong","Intense"].map(l=><span key={l}>{l}</span>)}
                  </div>
                </div>
              )}

              {step === 3 && (
                <div>
                  <label style={{ fontFamily:"DM Mono", fontSize:"0.58rem",
                    letterSpacing:"0.12em", textTransform:"uppercase",
                    color:T.muted, display:"block", marginBottom:"0.5rem" }}>
                    Optional — A few words (max 150)
                  </label>
                  <textarea value={text} onChange={e=>setText(e.target.value.slice(0,150))}
                    placeholder="What's making you feel this way?"
                    style={{ width:"100%", background:T.bg, border:`1px solid ${T.border}`,
                      color:T.text, padding:"0.7rem 0.9rem", fontFamily:"DM Mono",
                      fontSize:"0.7rem", outline:"none", resize:"none",
                      height:100, lineHeight:1.6, boxSizing:"border-box" }}
                    onFocus={e=>e.target.style.borderColor=T.amber}
                    onBlur={e=>e.target.style.borderColor=T.border} />
                  <div style={{ textAlign:"right", fontFamily:"DM Mono", fontSize:"0.5rem",
                    color:150-text.length<30?T.rose:T.muted, marginTop:"0.2rem" }}>
                    {150-text.length}
                  </div>
                  <div style={{ fontFamily:"DM Mono", fontSize:"0.52rem", color:T.muted,
                    lineHeight:1.6, marginTop:"0.5rem", padding:"0.5rem 0.6rem",
                    border:`1px solid ${T.border}` }}>
                    Your words are processed for emotional signal only. Raw text is never stored.
                  </div>
                </div>
              )}

              {error && (
                <div style={{ marginTop:"0.75rem", padding:"0.6rem 0.7rem",
                  background:`${T.rose}10`, border:`1px solid ${T.rose}30`,
                  fontFamily:"DM Mono", fontSize:"0.56rem", color:T.rose }}>
                  {error}
                </div>
              )}
            </>
          )}
        </div>

        {!done && (
          <div style={{ padding:"0.9rem 1.5rem", borderTop:`1px solid ${T.border}`,
            display:"flex", alignItems:"center", justifyContent:"space-between" }}>
            <div style={{ display:"flex", gap:"0.3rem" }}>
              {[1,2,3].map(n=>(
                <div key={n} style={{ width:16, height:2,
                  background:n<=step?T.amber:T.border, transition:"background 0.3s" }} />
              ))}
            </div>
            <div style={{ display:"flex", gap:"0.45rem" }}>
              {step > 1 && (
                <button onClick={()=>setStep(s=>s-1)}
                  style={{ background:"none", border:`1px solid ${T.border}`,
                    color:T.muted, padding:"0.5rem 0.9rem", fontFamily:"DM Mono",
                    fontSize:"0.58rem", letterSpacing:"0.08em", textTransform:"uppercase",
                    cursor:"pointer" }}>Back</button>
              )}
              <button
                onClick={() => {
                  if (step === 1 && !selectedLgu) return;
                  if (step === 2 && !emotion) return;
                  if (step < 3) setStep(s => s + 1);
                  else handleSubmit();
                }}
                disabled={submitting || (step===1&&!selectedLgu) || (step===2&&!emotion)}
                style={{ background:T.amber, color:"#000", border:"none",
                  padding:"0.5rem 1rem", fontFamily:"DM Mono", fontSize:"0.58rem",
                  fontWeight:500, letterSpacing:"0.08em", textTransform:"uppercase",
                  cursor:"pointer", transition:"all 0.2s",
                  opacity:submitting||(step===1&&!selectedLgu)||(step===2&&!emotion)?0.45:1 }}
                onMouseEnter={e=>{ if(!submitting) e.currentTarget.style.background="#fff"; }}
                onMouseLeave={e=>e.currentTarget.style.background=T.amber}>
                {submitting ? "Submitting..." : step === 3 ? "Submit Anonymously" : "Continue →"}
              </button>
            </div>
          </div>
        )}
      </div>
      <style>{`
        @keyframes modalIn{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
        @keyframes slideUp{from{transform:translateY(100%)}to{transform:translateY(0)}}
        @keyframes successPop{0%{transform:scale(0);opacity:0}60%{transform:scale(1.2)}100%{transform:scale(1);opacity:1}}
      `}</style>
    </div>
  );
}
