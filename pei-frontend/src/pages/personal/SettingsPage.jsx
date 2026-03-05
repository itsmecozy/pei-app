import { useState, useEffect, useRef } from "react";
import { useT } from "../../context/ThemeContext";
import { THEMES } from "../../hooks/useTheme";
import { useBreakpoint } from "../../hooks/useBreakpoint";
import { useNotifications } from "../../hooks/useNotifications";

const NOTIF_TIMES_KEY = "pei_notif_times";
const DEFAULT_TIMES   = ["20:00"];

// ── Custom Time Picker ────────────────────────────────────────────────────────
function TimePicker({ value, onChange, onClose }) {
  const T = useT();
  const [h, m]   = value.split(":").map(Number);
  const [hour,   setHour]   = useState(h % 12 || 12);
  const [minute, setMinute] = useState(m);
  const [period, setPeriod] = useState(h >= 12 ? "PM" : "AM");
  const [mode,   setMode]   = useState("scroll"); // "scroll" | "manual"
  const [manH,   setManH]   = useState(String(h % 12 || 12));
  const [manM,   setManM]   = useState(String(m).padStart(2,"0"));
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const confirm = () => {
    let finalH, finalM;
    if (mode === "manual") {
      finalH = Math.min(12, Math.max(1, parseInt(manH) || 12));
      finalM = Math.min(59, Math.max(0,  parseInt(manM) || 0));
    } else {
      finalH = hour;
      finalM = minute;
    }
    const h24 = period === "PM" ? (finalH === 12 ? 12 : finalH + 12) : (finalH === 12 ? 0 : finalH);
    onChange(`${String(h24).padStart(2,"0")}:${String(finalM).padStart(2,"0")}`);
    onClose();
  };

  const hours   = Array.from({length:12}, (_,i) => i+1);
  const minutes = [0,5,10,15,20,25,30,35,40,45,50,55];

  const ColLabel = ({label}) => (
    <div style={{ fontFamily:"DM Mono", fontSize:"0.44rem", letterSpacing:"0.12em",
      textTransform:"uppercase", color:T.muted, textAlign:"center", marginBottom:"0.4rem" }}>
      {label}
    </div>
  );

  const ScrollCol = ({items, selected, onSelect, format}) => (
    <div style={{ display:"flex", flexDirection:"column", gap:2, maxHeight:160,
      overflowY:"auto", scrollbarWidth:"none" }}>
      {items.map(v => {
        const isSel = v === selected;
        return (
          <div key={v} onClick={() => onSelect(v)}
            style={{ padding:"0.35rem 0.6rem", cursor:"pointer", textAlign:"center",
              fontFamily:"DM Mono", fontSize:"0.62rem",
              background: isSel ? T.amber : "none",
              color: isSel ? "#000" : T.muted,
              fontWeight: isSel ? 500 : 400,
              transition:"all 0.15s", borderRadius:2 }}
            onMouseEnter={e=>{ if(!isSel) e.currentTarget.style.background=T.surface2; }}
            onMouseLeave={e=>{ if(!isSel) e.currentTarget.style.background="none"; }}>
            {format ? format(v) : v}
          </div>
        );
      })}
    </div>
  );

  return (
    <div ref={ref} style={{ position:"absolute", zIndex:100, top:"calc(100% + 6px)", left:0,
      background:T.surface, border:`1px solid ${T.border}`,
      boxShadow:"0 8px 32px rgba(0,0,0,0.3)", width:260,
      animation:"dropIn 0.18s ease" }}>
      <div style={{ height:2, background:`linear-gradient(to right, ${T.amber}, ${T.teal})` }} />

      {/* Mode tabs */}
      <div style={{ display:"flex", borderBottom:`1px solid ${T.border}` }}>
        {["scroll","manual"].map(m => (
          <button key={m} onClick={() => setMode(m)}
            style={{ flex:1, padding:"0.45rem", background: mode===m ? `${T.amber}12` : "none",
              border:"none", borderBottom:`2px solid ${mode===m ? T.amber : "transparent"}`,
              color: mode===m ? T.amber : T.muted, fontFamily:"DM Mono",
              fontSize:"0.48rem", letterSpacing:"0.1em", textTransform:"uppercase",
              cursor:"pointer", transition:"all 0.15s" }}>
            {m === "scroll" ? "Scroll" : "Custom"}
          </button>
        ))}
      </div>

      <div style={{ padding:"0.75rem" }}>
        {mode === "scroll" ? (
          /* Scroll mode */
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 72px", gap:"0.5rem" }}>
            <div>
              <ColLabel label="Hour" />
              <ScrollCol items={hours} selected={hour} onSelect={setHour} />
            </div>
            <div>
              <ColLabel label="Min" />
              <ScrollCol items={minutes} selected={minute} onSelect={setMinute}
                format={v => String(v).padStart(2,"0")} />
            </div>
            <div>
              <ColLabel label="AM/PM" />
              {["AM","PM"].map(p => (
                <div key={p} onClick={() => setPeriod(p)}
                  style={{ padding:"0.4rem", cursor:"pointer", textAlign:"center",
                    fontFamily:"DM Mono", fontSize:"0.62rem", marginBottom:3,
                    background: period===p ? T.amber : "none",
                    color: period===p ? "#000" : T.muted,
                    transition:"all 0.15s", borderRadius:2 }}
                  onMouseEnter={e=>{ if(period!==p) e.currentTarget.style.background=T.surface2; }}
                  onMouseLeave={e=>{ if(period!==p) e.currentTarget.style.background="none"; }}>
                  {p}
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* Manual input mode */
          <div>
            <div style={{ display:"flex", alignItems:"center", gap:"0.5rem",
              justifyContent:"center", marginBottom:"0.75rem" }}>
              {/* Hour input */}
              <input
                type="number" min="1" max="12"
                value={manH}
                onChange={e => setManH(e.target.value)}
                onBlur={e => {
                  const v = Math.min(12, Math.max(1, parseInt(e.target.value)||12));
                  setManH(String(v));
                }}
                style={{ width:52, padding:"0.5rem", textAlign:"center",
                  background:T.surface2, border:`1px solid ${T.border}`,
                  color:T.text, fontFamily:"'Playfair Display',serif",
                  fontSize:"1.4rem", fontWeight:700, outline:"none" }}
              />
              <span style={{ fontFamily:"DM Mono", fontSize:"1.2rem", color:T.muted }}>:</span>
              {/* Minute input */}
              <input
                type="number" min="0" max="59"
                value={manM}
                onChange={e => setManM(e.target.value)}
                onBlur={e => {
                  const v = Math.min(59, Math.max(0, parseInt(e.target.value)||0));
                  setManM(String(v).padStart(2,"0"));
                }}
                style={{ width:52, padding:"0.5rem", textAlign:"center",
                  background:T.surface2, border:`1px solid ${T.border}`,
                  color:T.text, fontFamily:"'Playfair Display',serif",
                  fontSize:"1.4rem", fontWeight:700, outline:"none" }}
              />
              {/* AM/PM */}
              <div style={{ display:"flex", flexDirection:"column", gap:3 }}>
                {["AM","PM"].map(p => (
                  <div key={p} onClick={() => setPeriod(p)}
                    style={{ padding:"0.3rem 0.45rem", cursor:"pointer", textAlign:"center",
                      fontFamily:"DM Mono", fontSize:"0.56rem",
                      background: period===p ? T.amber : T.surface2,
                      border:`1px solid ${period===p ? T.amber : T.border}`,
                      color: period===p ? "#000" : T.muted,
                      transition:"all 0.15s" }}>
                    {p}
                  </div>
                ))}
              </div>
            </div>
            <div style={{ fontFamily:"DM Mono", fontSize:"0.48rem",
              color:T.muted, textAlign:"center", marginBottom:"0.3rem" }}>
              Type any hour (1–12) and minute (0–59)
            </div>
          </div>
        )}

        <button onClick={confirm}
          style={{ width:"100%", marginTop:"0.6rem", background:T.amber, color:"#000",
            border:"none", padding:"0.45rem", fontFamily:"DM Mono", fontSize:"0.54rem",
            fontWeight:500, letterSpacing:"0.08em", textTransform:"uppercase", cursor:"pointer" }}>
          Set Time
        </button>
      </div>
      <style>{`@keyframes dropIn{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:translateY(0)}}`}</style>
    </div>
  );
}

// ── Format time for display ───────────────────────────────────────────────────
function formatTime(t) {
  const [h, m] = t.split(":").map(Number);
  const p    = h >= 12 ? "PM" : "AM";
  const h12  = h % 12 || 12;
  return `${h12}:${String(m).padStart(2,"0")} ${p}`;
}

// ── Section header ────────────────────────────────────────────────────────────
function SectionHeader({ label }) {
  const T = useT();
  return (
    <div style={{ fontFamily:"DM Mono", fontSize:"0.5rem", letterSpacing:"0.14em",
      textTransform:"uppercase", color:T.muted, marginBottom:"1rem" }}>
      {label}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function SettingsPage({ themeId, setTheme }) {
  const T  = useT();
  const bp = useBreakpoint();

  const { permission: notifPermission, enable: enableNotif, disable: disableNotif, updateTimes: updateNotifTimes } = useNotifications();
  const [notifEnabled, setNotifEnabled] = useState(() => {
    try { return localStorage.getItem("pei_notif_enabled") === "true"; } catch { return false; }
  });
  const [times, setTimes] = useState(() => {
    try { return JSON.parse(localStorage.getItem(NOTIF_TIMES_KEY) || "null") || DEFAULT_TIMES; }
    catch { return DEFAULT_TIMES; }
  });
  const [pickerIndex, setPickerIndex] = useState(null);
  const [saved, setSaved]             = useState(false);

  const handleToggle = async () => {
    if (!notifEnabled) {
      const ok = await enableNotif(times);
      if (ok) setNotifEnabled(true);
    } else {
      await disableNotif();
      setNotifEnabled(false);
    }
  };

  const addTime = () => {
    if (times.length >= 4) return;
    const next = [...times, "08:00"];
    setTimes(next);
    updateNotifTimes(next);
  };

  const removeTime = (i) => {
    if (times.length <= 1) return;
    const next = times.filter((_,idx) => idx !== i);
    setTimes(next);
    updateNotifTimes(next);
  };

  const updateTime = (i, val) => {
    const next = times.map((t,idx) => idx===i ? val : t);
    setTimes(next);
    updateNotifTimes(next);
    setSaved(true);
    setTimeout(() => setSaved(false), 1800);
  };

  const isSupported = typeof Notification !== "undefined";

  // interval presets
  const INTERVALS = [
    { label:"Once a day", times:["20:00"] },
    { label:"Twice a day", times:["08:00","20:00"] },
    { label:"Every 8 hrs", times:["08:00","16:00","00:00"] },
    { label:"Every 6 hrs", times:["06:00","12:00","18:00","00:00"] },
  ];

  return (
    <div style={{ paddingBottom:"4rem" }}>
      <style>{`
        @keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
        div::-webkit-scrollbar{display:none}
      `}</style>

      {/* Header */}
      <div style={{ padding:"3rem 0 2rem", borderBottom:`1px solid ${T.border}`, marginBottom:"2rem" }}>
        <div style={{ display:"flex", alignItems:"center", gap:"0.5rem",
          fontFamily:"DM Mono", fontSize:"0.52rem", letterSpacing:"0.18em",
          textTransform:"uppercase", color:T.amber, marginBottom:"0.6rem" }}>
          <div style={{ width:20, height:1, background:T.amber }} />
          Settings
        </div>
        <h1 style={{ fontFamily:"'Playfair Display',serif",
          fontSize:"clamp(1.6rem,3.5vw,2.8rem)", fontWeight:900,
          letterSpacing:"-0.025em", lineHeight:1.1, color:T.text }}>
          Preferences
        </h1>
        <p style={{ fontFamily:"DM Mono", fontSize:"0.6rem", color:T.muted, marginTop:"0.5rem" }}>
          Appearance and notification settings. Saved automatically.
        </p>
      </div>

      {/* ── THEME ── */}
      <div style={{ animation:"fadeUp 0.35s both", marginBottom:"2.5rem" }}>
        <SectionHeader label="Theme" />
        <div style={{ display:"grid",
          gridTemplateColumns: bp==="mobile" ? "1fr 1fr" : "repeat(4,1fr)",
          gap:"1px", background:T.border, border:`1px solid ${T.border}` }}>
          {Object.values(THEMES).map(theme => {
            const isActive = themeId === theme.id;
            return (
              <div key={theme.id} onClick={() => setTheme(theme.id)}
                style={{ background: isActive ? `${T.amber}10` : T.surface,
                  padding:"1.25rem", cursor:"pointer", position:"relative",
                  overflow:"hidden", transition:"background 0.2s" }}
                onMouseEnter={e=>{ if(!isActive) e.currentTarget.style.background=T.surface2; }}
                onMouseLeave={e=>{ if(!isActive) e.currentTarget.style.background=T.surface; }}>
                <div style={{ position:"absolute", top:0, left:0, right:0, height:2,
                  background: isActive ? T.amber : "transparent", transition:"background 0.2s" }} />
                <div style={{ display:"flex", gap:4, marginBottom:"0.85rem" }}>
                  {theme.preview.map((color, i) => (
                    <div key={i} style={{ width: i===0?28:i===1?20:12, height:28,
                      background:color, border:"1px solid rgba(255,255,255,0.08)" }} />
                  ))}
                </div>
                <div style={{ display:"flex", alignItems:"center", gap:"0.5rem", marginBottom:"0.4rem" }}>
                  <div style={{ width:14, height:14, borderRadius:"50%", flexShrink:0,
                    border:`2px solid ${isActive ? T.amber : T.border}`,
                    background: isActive ? T.amber : "none", transition:"all 0.2s",
                    display:"flex", alignItems:"center", justifyContent:"center" }}>
                    {isActive && <div style={{ width:5, height:5, borderRadius:"50%", background:"#000" }} />}
                  </div>
                  <span style={{ fontFamily:"DM Mono", fontSize:"0.58rem",
                    letterSpacing:"0.06em", textTransform:"uppercase",
                    color: isActive ? T.amber : T.text }}>
                    {theme.label}
                  </span>
                </div>
                <p style={{ fontFamily:"DM Mono", fontSize:"0.5rem", color:T.muted, lineHeight:1.6 }}>
                  {theme.desc}
                </p>
              </div>
            );
          })}
        </div>
        <div style={{ marginTop:"1rem", padding:"0.65rem 1rem", border:`1px solid ${T.border}`,
          fontFamily:"DM Mono", fontSize:"0.52rem", color:T.muted, lineHeight:1.7 }}>
          <span style={{ color:T.teal }}>Live preview:</span>{" "}
          Changes apply instantly. Saved locally on this device.
        </div>
      </div>

      {/* ── NOTIFICATIONS ── */}
      <div style={{ animation:"fadeUp 0.4s 0.1s both" }}>
        <SectionHeader label="Daily Reminders" />

        <div style={{ border:`1px solid ${T.border}` }}>

          {/* Toggle */}
          <div style={{ padding:"1.1rem 1.25rem",
            borderBottom: notifEnabled ? `1px solid ${T.border}` : "none",
            display:"flex", alignItems:"center", justifyContent:"space-between", gap:"1rem" }}>
            <div>
              <div style={{ fontFamily:"DM Mono", fontSize:"0.58rem", color:T.text, marginBottom:"0.2rem" }}>
                Feeling reminders
              </div>
              <div style={{ fontFamily:"DM Mono", fontSize:"0.5rem", color:T.muted, lineHeight:1.6 }}>
                {!isSupported
                  ? "Not supported on this browser."
                  : notifPermission === "denied"
                  ? "Blocked — enable notifications in browser settings."
                  : notifEnabled
                  ? `${times.length} reminder${times.length>1?"s":""} active.`
                  : "Get a nudge to log how you're feeling."}
              </div>
            </div>
            {isSupported && notifPermission !== "denied" && (
              <div onClick={handleToggle}
                style={{ width:44, height:24, borderRadius:12, flexShrink:0,
                  background: notifEnabled ? T.amber : T.surface2,
                  border:`1px solid ${notifEnabled ? T.amber : T.border}`,
                  cursor:"pointer", position:"relative", transition:"all 0.25s" }}>
                <div style={{ position:"absolute", top:3,
                  left: notifEnabled ? 22 : 3, width:16, height:16,
                  borderRadius:"50%", background: notifEnabled ? "#000" : T.muted,
                  transition:"left 0.25s, background 0.25s" }} />
              </div>
            )}
          </div>

          {/* Time slots + interval presets */}
          {notifEnabled && (
            <>
              {/* Interval quick-select */}
              <div style={{ padding:"0.9rem 1.25rem", borderBottom:`1px solid ${T.border}`,
                background:T.surface2 }}>
                <div style={{ fontFamily:"DM Mono", fontSize:"0.46rem", letterSpacing:"0.1em",
                  textTransform:"uppercase", color:T.muted, marginBottom:"0.6rem" }}>
                  Quick presets
                </div>
                <div style={{ display:"flex", gap:"0.4rem", flexWrap:"wrap" }}>
                  {INTERVALS.map(preset => {
                    const isActive = JSON.stringify(preset.times) === JSON.stringify(times);
                    return (
                      <button key={preset.label} onClick={() => { setTimes(preset.times); updateNotifTimes(preset.times); }}
                        style={{ background: isActive ? T.amber : "none",
                          border:`1px solid ${isActive ? T.amber : T.border}`,
                          color: isActive ? "#000" : T.muted,
                          padding:"0.25rem 0.6rem", fontFamily:"DM Mono",
                          fontSize:"0.5rem", cursor:"pointer", transition:"all 0.2s" }}
                        onMouseEnter={e=>{ if(!isActive){ e.currentTarget.style.color=T.text; e.currentTarget.style.borderColor=T.text; }}}
                        onMouseLeave={e=>{ if(!isActive){ e.currentTarget.style.color=T.muted; e.currentTarget.style.borderColor=T.border; }}}>
                        {preset.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Time slots */}
              <div style={{ padding:"0.9rem 1.25rem", borderBottom:`1px solid ${T.border}` }}>
                <div style={{ fontFamily:"DM Mono", fontSize:"0.46rem", letterSpacing:"0.1em",
                  textTransform:"uppercase", color:T.muted, marginBottom:"0.6rem" }}>
                  Reminder times
                </div>
                <div style={{ display:"flex", flexDirection:"column", gap:"0.5rem" }}>
                  {times.map((t, i) => (
                    <div key={i} style={{ position:"relative", display:"flex",
                      alignItems:"center", gap:"0.5rem" }}>
                      {/* Time display button */}
                      <button onClick={() => setPickerIndex(pickerIndex===i ? null : i)}
                        style={{ flex:1, display:"flex", alignItems:"center",
                          justifyContent:"space-between",
                          background: pickerIndex===i ? `${T.amber}10` : T.surface2,
                          border:`1px solid ${pickerIndex===i ? T.amber : T.border}`,
                          color: pickerIndex===i ? T.amber : T.text,
                          padding:"0.55rem 0.85rem", cursor:"pointer",
                          fontFamily:"'Playfair Display',serif", fontSize:"1.1rem",
                          fontWeight:700, transition:"all 0.2s" }}>
                        <span>{formatTime(t)}</span>
                        <span style={{ fontFamily:"DM Mono", fontSize:"0.5rem",
                          color: pickerIndex===i ? T.amber : T.muted }}>
                          {pickerIndex===i ? "▲" : "▼"}
                        </span>
                      </button>

                      {/* Remove button */}
                      {times.length > 1 && (
                        <button onClick={() => removeTime(i)}
                          style={{ background:"none", border:`1px solid ${T.border}`,
                            color:T.muted, width:32, height:32, cursor:"pointer",
                            fontFamily:"DM Mono", fontSize:"0.7rem", flexShrink:0,
                            transition:"all 0.2s" }}
                          onMouseEnter={e=>{ e.currentTarget.style.color=T.rose; e.currentTarget.style.borderColor=T.rose; }}
                          onMouseLeave={e=>{ e.currentTarget.style.color=T.muted; e.currentTarget.style.borderColor=T.border; }}>
                          ✕
                        </button>
                      )}

                      {/* Custom time picker dropdown */}
                      {pickerIndex === i && (
                        <TimePicker
                          value={t}
                          onChange={(val) => { updateTime(i, val); setPickerIndex(null); }}
                          onClose={() => setPickerIndex(null)}
                        />
                      )}
                    </div>
                  ))}
                </div>

                {/* Add time button */}
                {times.length < 4 && (
                  <button onClick={addTime}
                    style={{ marginTop:"0.6rem", background:"none",
                      border:`1px dashed ${T.border}`, color:T.muted,
                      padding:"0.45rem 0.85rem", width:"100%",
                      fontFamily:"DM Mono", fontSize:"0.52rem",
                      letterSpacing:"0.08em", textTransform:"uppercase",
                      cursor:"pointer", transition:"all 0.2s" }}
                    onMouseEnter={e=>{ e.currentTarget.style.color=T.amber; e.currentTarget.style.borderColor=T.amber; }}
                    onMouseLeave={e=>{ e.currentTarget.style.color=T.muted; e.currentTarget.style.borderColor=T.border; }}>
                    + Add another time {times.length}/4
                  </button>
                )}
              </div>

              {/* iOS notice */}
              <div style={{ padding:"0.65rem 1.25rem", fontFamily:"DM Mono",
                fontSize:"0.48rem", color:T.muted, lineHeight:1.6 }}>
                <span style={{ color:T.rose }}>iOS note:</span>{" "}
                Push notifications are limited on iPhone Safari. Use Chrome on Android or desktop for best results.
                {saved && <span style={{ color:T.teal, marginLeft:"0.5rem" }}>✓ Saved</span>}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
