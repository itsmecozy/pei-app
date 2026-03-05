import { useState, useEffect } from "react";
import { useT } from "../../context/ThemeContext";
import { THEMES } from "../../hooks/useTheme";
import { useBreakpoint } from "../../hooks/useBreakpoint";

const NOTIF_KEY      = "pei_notif_enabled";
const NOTIF_TIME_KEY = "pei_notif_time";
const DEFAULT_TIME   = "20:00"; // 8PM

function SectionHeader({ label }) {
  const T = useT();
  return (
    <div style={{ fontFamily:"DM Mono", fontSize:"0.5rem", letterSpacing:"0.14em",
      textTransform:"uppercase", color:T.muted, marginBottom:"1rem" }}>
      {label}
    </div>
  );
}

export default function SettingsPage({ themeId, setTheme }) {
  const T  = useT();
  const bp = useBreakpoint();

  // ── Notification state ──
  const [notifEnabled, setNotifEnabled] = useState(() => {
    try { return localStorage.getItem(NOTIF_KEY) === "true"; } catch { return false; }
  });
  const [notifTime, setNotifTime] = useState(() => {
    try { return localStorage.getItem(NOTIF_TIME_KEY) || DEFAULT_TIME; } catch { return DEFAULT_TIME; }
  });
  const [notifPermission, setNotifPermission] = useState(
    typeof Notification !== "undefined" ? Notification.permission : "unsupported"
  );
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    try { localStorage.setItem(NOTIF_KEY,      String(notifEnabled)); } catch {}
    try { localStorage.setItem(NOTIF_TIME_KEY, notifTime);            } catch {}
    scheduleNotification(notifEnabled, notifTime);
  }, [notifEnabled, notifTime]);

  const scheduleNotification = (enabled, time) => {
    // Clear any existing scheduled notification
    const existingId = localStorage.getItem("pei_notif_timeout");
    if (existingId) clearTimeout(parseInt(existingId));
    if (!enabled) return;

    const [h, m]  = time.split(":").map(Number);
    const now     = new Date();
    const target  = new Date();
    target.setHours(h, m, 0, 0);
    if (target <= now) target.setDate(target.getDate() + 1); // schedule for tomorrow if past
    const msUntil = target.getTime() - now.getTime();

    const id = setTimeout(() => {
      if (Notification.permission === "granted") {
        new Notification("PEI — How are you feeling?", {
          body: "Take a moment to log your emotion for today.",
          icon: "/favicon.ico",
          badge: "/favicon.ico",
        });
      }
      // Reschedule for next day
      scheduleNotification(true, time);
    }, msUntil);

    try { localStorage.setItem("pei_notif_timeout", String(id)); } catch {}
  };

  const handleToggleNotif = async () => {
    if (!notifEnabled) {
      // Requesting permission
      if (notifPermission === "default") {
        const result = await Notification.requestPermission();
        setNotifPermission(result);
        if (result !== "granted") return;
      }
      if (notifPermission === "denied") return;
      setNotifEnabled(true);
    } else {
      setNotifEnabled(false);
    }
  };

  const handleSaveTime = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    scheduleNotification(notifEnabled, notifTime);
  };

  const isNotifSupported = typeof Notification !== "undefined";
  const [h, period]      = (() => {
    const [hr, mn] = notifTime.split(":").map(Number);
    const p        = hr >= 12 ? "PM" : "AM";
    const h12      = hr % 12 || 12;
    return [`${h12}:${String(mn).padStart(2,"0")}`, p];
  })();

  return (
    <div style={{ paddingBottom:"4rem" }}>
      <style>{`@keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}`}</style>

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
        <p style={{ fontFamily:"DM Mono", fontSize:"0.6rem",
          color:T.muted, marginTop:"0.5rem" }}>
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
        <div style={{ marginTop:"1rem", padding:"0.65rem 1rem",
          border:`1px solid ${T.border}`, fontFamily:"DM Mono",
          fontSize:"0.52rem", color:T.muted, lineHeight:1.7 }}>
          <span style={{ color:T.teal }}>Live preview:</span>{" "}
          Changes apply instantly. Saved locally on this device.
        </div>
      </div>

      {/* ── NOTIFICATIONS ── */}
      <div style={{ animation:"fadeUp 0.4s 0.1s both" }}>
        <SectionHeader label="Daily Reminder" />

        <div style={{ border:`1px solid ${T.border}` }}>

          {/* Toggle row */}
          <div style={{ padding:"1.1rem 1.25rem",
            borderBottom: notifEnabled ? `1px solid ${T.border}` : "none",
            display:"flex", alignItems:"center", justifyContent:"space-between", gap:"1rem" }}>
            <div>
              <div style={{ fontFamily:"DM Mono", fontSize:"0.58rem",
                color:T.text, marginBottom:"0.2rem" }}>
                Daily feeling reminder
              </div>
              <div style={{ fontFamily:"DM Mono", fontSize:"0.5rem", color:T.muted, lineHeight:1.6 }}>
                {!isNotifSupported
                  ? "Not supported on this browser."
                  : notifPermission === "denied"
                  ? "Notifications blocked. Enable in browser settings."
                  : notifEnabled
                  ? `Reminder set for ${h} ${period} daily.`
                  : "Get a nudge to log how you're feeling each day."}
              </div>
            </div>

            {/* Toggle switch */}
            {isNotifSupported && notifPermission !== "denied" && (
              <div onClick={handleToggleNotif}
                style={{ width:44, height:24, borderRadius:12, flexShrink:0,
                  background: notifEnabled ? T.amber : T.surface2,
                  border:`1px solid ${notifEnabled ? T.amber : T.border}`,
                  cursor:"pointer", position:"relative", transition:"all 0.25s" }}>
                <div style={{ position:"absolute", top:3,
                  left: notifEnabled ? 22 : 3,
                  width:16, height:16, borderRadius:"50%",
                  background: notifEnabled ? "#000" : T.muted,
                  transition:"left 0.25s, background 0.25s" }} />
              </div>
            )}
          </div>

          {/* Time picker — only shows when enabled */}
          {notifEnabled && (
            <div style={{ padding:"1.1rem 1.25rem",
              background:T.surface2, display:"flex",
              alignItems:"center", justifyContent:"space-between",
              flexWrap:"wrap", gap:"0.75rem" }}>
              <div>
                <div style={{ fontFamily:"DM Mono", fontSize:"0.52rem",
                  color:T.muted, marginBottom:"0.4rem", letterSpacing:"0.08em",
                  textTransform:"uppercase" }}>
                  Reminder time
                </div>
                <div style={{ fontFamily:"'Playfair Display',serif",
                  fontSize:"1.4rem", fontWeight:700, color:T.amber }}>
                  {h} <span style={{ fontSize:"0.8rem", color:T.muted,
                    fontFamily:"DM Mono", fontWeight:400 }}>{period}</span>
                </div>
              </div>

              <div style={{ display:"flex", alignItems:"center", gap:"0.75rem" }}>
                <input
                  type="time"
                  value={notifTime}
                  onChange={e => setNotifTime(e.target.value)}
                  style={{ background:T.surface, border:`1px solid ${T.border}`,
                    color:T.text, padding:"0.4rem 0.6rem",
                    fontFamily:"DM Mono", fontSize:"0.62rem",
                    outline:"none", cursor:"pointer" }}
                />
                <button onClick={handleSaveTime}
                  style={{ background: saved ? T.teal : T.amber,
                    color:"#000", border:"none",
                    padding:"0.4rem 0.85rem", fontFamily:"DM Mono",
                    fontSize:"0.54rem", fontWeight:500, letterSpacing:"0.08em",
                    textTransform:"uppercase", cursor:"pointer",
                    transition:"all 0.2s" }}>
                  {saved ? "Saved ✓" : "Save"}
                </button>
              </div>
            </div>
          )}

          {/* iOS notice */}
          {notifEnabled && (
            <div style={{ padding:"0.65rem 1.25rem",
              borderTop:`1px solid ${T.border}`,
              fontFamily:"DM Mono", fontSize:"0.48rem",
              color:T.muted, lineHeight:1.6 }}>
              <span style={{ color:T.rose }}>iOS note:</span>{" "}
              Browser notifications are limited on iPhone. For best results, use Chrome on Android or desktop.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
