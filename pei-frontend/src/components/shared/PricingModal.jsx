import { useState } from "react";
import { T } from "../../constants/tokens";
import { useBreakpoint } from "../../hooks/useBreakpoint";

const PLANS = [
  {
    id:       "seasonal",
    label:    "Seasonal",
    price:    "₱49",
    duration: "3 months",
    color:    T.amber,
    desc:     "Perfect for tracking your emotional patterns through a season.",
    features: [
      "Full personal dashboard",
      "90 days of access",
      "Emotion history & trends",
      "ESI & HDR tracking",
      "vs Nation comparison",
      "Priority support",
    ],
  },
  {
    id:       "lifetime",
    label:    "Lifetime",
    price:    "₱99",
    duration: "forever",
    color:    "#a78bfa",
    desc:     "One payment. Full access to your personal index, forever.",
    features: [
      "Everything in Seasonal",
      "Unlimited access",
      "All future features",
      "Early access to new tools",
      "Supporter badge on profile",
      "Thank you from the team",
    ],
    recommended: true,
  },
];

const PAYMENT_METHODS = [
  { id:"gcash",  label:"GCash",             icon:"📱", color:"#007AFF" },
  { id:"maya",   label:"Maya",              icon:"💙", color:"#00A8E8" },
  { id:"card",   label:"Credit/Debit Card", icon:"💳", color:T.teal   },
  { id:"bank",   label:"Bank Transfer",     icon:"🏦", color:T.muted  },
];

export default function PricingModal({ open, onClose, defaultPlan = "lifetime" }) {
  const bp = useBreakpoint();
  const [selectedPlan,    setSelectedPlan]    = useState(defaultPlan);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [step,            setStep]            = useState("plan"); // plan | payment | pending

  const plan = PLANS.find(p => p.id === selectedPlan);

  const handleClose = () => {
    setStep("plan");
    setSelectedPayment(null);
    onClose();
  };

  if (!open) return null;

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.88)",
      backdropFilter:"blur(12px)", zIndex:400,
      display:"flex", alignItems:"center", justifyContent:"center",
      padding: bp === "mobile" ? "0" : "2rem" }}
      onClick={e => { if (e.target === e.currentTarget) handleClose(); }}>

      <div style={{ background:T.surface, border:`1px solid ${T.border}`,
        maxWidth:640, width:"100%", maxHeight:bp==="mobile"?"100vh":"90vh",
        overflowY:"auto",
        borderRadius: bp === "mobile" ? "16px 16px 0 0" : "0",
        animation: bp === "mobile" ? "slideUp 0.35s ease" : "modalIn 0.3s ease",
        position: bp === "mobile" ? "fixed" : "relative",
        bottom: bp === "mobile" ? 0 : "auto",
      }}>

        {/* Top accent */}
        <div style={{ height:2,
          background:`linear-gradient(to right, ${T.amber}, #a78bfa)` }} />

        {/* Header */}
        <div style={{ padding:"1.25rem 1.5rem", borderBottom:`1px solid ${T.border}`,
          display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div>
            <div style={{ fontFamily:"DM Mono", fontSize:"0.5rem", letterSpacing:"0.14em",
              textTransform:"uppercase", color:T.amber, marginBottom:"0.2rem" }}>
              {step === "plan" ? "Choose Your Plan" : step === "payment" ? "Choose Payment" : "Payment Pending"}
            </div>
            <div style={{ fontFamily:"'Playfair Display',serif",
              fontSize:"1.1rem", fontWeight:700 }}>
              {step === "plan" ? "Unlock Your Personal Index" :
               step === "payment" ? `${plan?.label} · ${plan?.price}` :
               "Complete Your Payment"}
            </div>
          </div>
          <button onClick={handleClose}
            style={{ background:"none", border:"none", color:T.muted,
              cursor:"pointer", fontSize:"1.1rem", flexShrink:0 }}>✕</button>
        </div>

        {/* ── STEP 1: Plan selection ── */}
        {step === "plan" && (
          <div style={{ padding:"1.25rem 1.5rem" }}>
            <div style={{ display:"grid",
              gridTemplateColumns: bp === "mobile" ? "1fr" : "1fr 1fr",
              gap:"1px", background:T.border, border:`1px solid ${T.border}`,
              marginBottom:"1.25rem" }}>
              {PLANS.map(p => {
                const isSelected = selectedPlan === p.id;
                return (
                  <div key={p.id} onClick={() => setSelectedPlan(p.id)}
                    style={{ background: isSelected ? `${p.color}10` : T.bg,
                      padding:"1.25rem", cursor:"pointer", position:"relative",
                      overflow:"hidden", transition:"background 0.2s" }}>

                    {/* Top border accent */}
                    <div style={{ position:"absolute", top:0, left:0, right:0,
                      height:2, background: isSelected ? p.color : "transparent",
                      transition:"background 0.2s" }} />

                    {/* Recommended badge */}
                    {p.recommended && (
                      <div style={{ position:"absolute", top:"0.75rem", right:"0.75rem",
                        background:`${p.color}20`, border:`1px solid ${p.color}40`,
                        padding:"0.1rem 0.45rem", fontFamily:"DM Mono",
                        fontSize:"0.44rem", letterSpacing:"0.1em",
                        textTransform:"uppercase", color:p.color }}>
                        Best Value
                      </div>
                    )}

                    {/* Selection indicator */}
                    <div style={{ width:16, height:16, borderRadius:"50%",
                      border:`2px solid ${isSelected ? p.color : T.border}`,
                      background: isSelected ? p.color : "none",
                      marginBottom:"0.85rem", transition:"all 0.2s",
                      display:"flex", alignItems:"center", justifyContent:"center" }}>
                      {isSelected && (
                        <div style={{ width:6, height:6, borderRadius:"50%",
                          background:"#000" }} />
                      )}
                    </div>

                    <div style={{ fontFamily:"DM Mono", fontSize:"0.5rem",
                      letterSpacing:"0.12em", textTransform:"uppercase",
                      color:p.color, marginBottom:"0.3rem" }}>{p.label}</div>

                    <div style={{ fontFamily:"'Playfair Display',serif",
                      fontSize:"2rem", fontWeight:900, color:p.color,
                      lineHeight:1, marginBottom:"0.15rem" }}>{p.price}</div>

                    <div style={{ fontFamily:"DM Mono", fontSize:"0.5rem",
                      color:T.muted, marginBottom:"0.85rem" }}>{p.duration}</div>

                    <p style={{ fontFamily:"DM Mono", fontSize:"0.54rem",
                      color:T.muted, lineHeight:1.6, marginBottom:"0.85rem" }}>
                      {p.desc}
                    </p>

                    <div style={{ display:"flex", flexDirection:"column", gap:"0.35rem" }}>
                      {p.features.map((f, i) => (
                        <div key={i} style={{ display:"flex", alignItems:"center",
                          gap:"0.45rem", fontFamily:"DM Mono",
                          fontSize:"0.52rem", color:T.muted }}>
                          <span style={{ color:p.color, flexShrink:0, fontSize:"0.6rem" }}>✓</span>
                          {f}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Trial note */}
            <div style={{ background:`${T.teal}08`, border:`1px solid ${T.teal}20`,
              padding:"0.65rem 0.85rem", fontFamily:"DM Mono",
              fontSize:"0.54rem", color:T.muted, lineHeight:1.7,
              marginBottom:"1.25rem" }}>
              <span style={{ color:T.teal }}>Already tried it free?</span>{" "}
              Your 7-day trial data carries over. Nothing is lost when you upgrade.
            </div>

            <button onClick={() => setStep("payment")}
              style={{ width:"100%", background:plan?.color, color:"#000",
                border:"none", padding:"0.7rem", fontFamily:"DM Mono",
                fontSize:"0.62rem", fontWeight:500, letterSpacing:"0.1em",
                textTransform:"uppercase", cursor:"pointer", transition:"all 0.2s" }}
              onMouseEnter={e=>e.currentTarget.style.opacity="0.85"}
              onMouseLeave={e=>e.currentTarget.style.opacity="1"}>
              Continue with {plan?.label} · {plan?.price} →
            </button>
          </div>
        )}

        {/* ── STEP 2: Payment method ── */}
        {step === "payment" && (
          <div style={{ padding:"1.25rem 1.5rem" }}>

            {/* Plan summary */}
            <div style={{ background:`${plan?.color}08`, border:`1px solid ${plan?.color}20`,
              padding:"0.75rem 1rem", marginBottom:"1.25rem",
              display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <div>
                <div style={{ fontFamily:"DM Mono", fontSize:"0.48rem",
                  letterSpacing:"0.1em", textTransform:"uppercase",
                  color:plan?.color, marginBottom:"0.15rem" }}>{plan?.label}</div>
                <div style={{ fontFamily:"DM Mono", fontSize:"0.56rem", color:T.muted }}>
                  {plan?.duration} access
                </div>
              </div>
              <div style={{ fontFamily:"'Playfair Display',serif",
                fontSize:"1.5rem", fontWeight:900, color:plan?.color }}>
                {plan?.price}
              </div>
            </div>

            <div style={{ fontFamily:"DM Mono", fontSize:"0.5rem", letterSpacing:"0.12em",
              textTransform:"uppercase", color:T.muted, marginBottom:"0.75rem" }}>
              Select Payment Method
            </div>

            <div style={{ display:"flex", flexDirection:"column", gap:"0.5rem",
              marginBottom:"1.25rem" }}>
              {PAYMENT_METHODS.map(pm => {
                const isSelected = selectedPayment === pm.id;
                return (
                  <div key={pm.id} onClick={() => setSelectedPayment(pm.id)}
                    style={{ display:"flex", alignItems:"center", gap:"0.85rem",
                      padding:"0.85rem 1rem", cursor:"pointer",
                      border:`1px solid ${isSelected ? plan?.color : T.border}`,
                      background: isSelected ? `${plan?.color}08` : T.bg,
                      transition:"all 0.18s" }}>
                    <div style={{ width:16, height:16, borderRadius:"50%", flexShrink:0,
                      border:`2px solid ${isSelected ? plan?.color : T.border}`,
                      background: isSelected ? plan?.color : "none",
                      transition:"all 0.2s", display:"flex",
                      alignItems:"center", justifyContent:"center" }}>
                      {isSelected && (
                        <div style={{ width:6, height:6, borderRadius:"50%", background:"#000" }} />
                      )}
                    </div>
                    <span style={{ fontSize:"1.1rem" }}>{pm.icon}</span>
                    <span style={{ fontFamily:"DM Mono", fontSize:"0.6rem",
                      color: isSelected ? T.text : T.muted,
                      letterSpacing:"0.04em", transition:"color 0.2s" }}>
                      {pm.label}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Coming soon notice */}
            <div style={{ background:`${T.amber}08`, border:`1px solid ${T.amber}20`,
              padding:"0.65rem 0.85rem", fontFamily:"DM Mono",
              fontSize:"0.54rem", color:T.muted, lineHeight:1.7,
              marginBottom:"1.25rem" }}>
              <span style={{ color:T.amber }}>Payment integration coming soon.</span>{" "}
              We're setting up GCash, Maya, and card processing via PayMongo.
              To get early access now, email us at{" "}
              <span style={{ color:T.teal }}>support@pei.ph</span> and we'll
              manually activate your plan within 24 hours.
            </div>

            <div style={{ display:"flex", gap:"0.5rem" }}>
              <button onClick={() => setStep("plan")}
                style={{ background:"none", border:`1px solid ${T.border}`,
                  color:T.muted, padding:"0.6rem 1rem", fontFamily:"DM Mono",
                  fontSize:"0.56rem", letterSpacing:"0.08em", textTransform:"uppercase",
                  cursor:"pointer", transition:"all 0.2s" }}
                onMouseEnter={e=>e.currentTarget.style.color=T.text}
                onMouseLeave={e=>e.currentTarget.style.color=T.muted}>
                ← Back
              </button>
              <button
                disabled={!selectedPayment}
                onClick={() => setStep("pending")}
                style={{ flex:1, background: selectedPayment ? plan?.color : T.border,
                  color: selectedPayment ? "#000" : T.muted, border:"none",
                  padding:"0.6rem", fontFamily:"DM Mono", fontSize:"0.6rem",
                  fontWeight:500, letterSpacing:"0.1em", textTransform:"uppercase",
                  cursor: selectedPayment ? "pointer" : "not-allowed",
                  transition:"all 0.2s", opacity: selectedPayment ? 1 : 0.5 }}>
                Proceed to Pay →
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 3: Pending ── */}
        {step === "pending" && (
          <div style={{ padding:"2rem 1.5rem", textAlign:"center" }}>
            <div style={{ fontSize:"3rem", marginBottom:"1rem" }}>◉</div>
            <div style={{ fontFamily:"'Playfair Display',serif",
              fontSize:"1.3rem", fontWeight:700, marginBottom:"0.5rem" }}>
              Payment coming soon.
            </div>
            <p style={{ fontFamily:"DM Mono", fontSize:"0.6rem",
              color:T.muted, lineHeight:1.8, marginBottom:"1.5rem", maxWidth:380, margin:"0 auto 1.5rem" }}>
              We're still setting up our payment processor. To unlock your{" "}
              <span style={{ color:plan?.color }}>{plan?.label}</span> plan now,
              email us and we'll activate it manually within 24 hours.
            </p>

            <a href={`mailto:support@pei.ph?subject=PEI ${plan?.label} Plan Unlock&body=Hi, I'd like to unlock the ${plan?.label} plan (${plan?.price}). My account email is: `}
              style={{ display:"block", width:"100%", background:plan?.color, color:"#000",
                border:"none", padding:"0.65rem", fontFamily:"DM Mono",
                fontSize:"0.6rem", fontWeight:500, letterSpacing:"0.1em",
                textTransform:"uppercase", cursor:"pointer", textDecoration:"none",
                marginBottom:"0.5rem", boxSizing:"border-box" }}>
              Email support@pei.ph →
            </a>

            <button onClick={handleClose}
              style={{ width:"100%", background:"none", border:`1px solid ${T.border}`,
                color:T.muted, padding:"0.55rem", fontFamily:"DM Mono",
                fontSize:"0.56rem", letterSpacing:"0.08em", textTransform:"uppercase",
                cursor:"pointer" }}>
              Close
            </button>
          </div>
        )}
      </div>

      <style>{`
        @keyframes modalIn{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
        @keyframes slideUp{from{transform:translateY(100%)}to{transform:translateY(0)}}
      `}</style>
    </div>
  );
}
