import { T } from "../../constants/tokens";
import { useBreakpoint } from "../../hooks/useBreakpoint";

export default function PricingOverlay({ plan, navigate }) {
  const bp = useBreakpoint();

  const plans = [
    { id:"seasonal", label:"Seasonal", price:"₱49", duration:"3 months", color:T.amber },
    { id:"lifetime", label:"Lifetime", price:"₱99", duration:"forever",  color:"#a78bfa" },
  ];

  return (
    <div style={{ position:"fixed", inset:0, zIndex:250,
      display:"flex", alignItems:"center", justifyContent:"center",
      padding:"1.5rem" }}>

      {/* Blur backdrop */}
      <div style={{ position:"absolute", inset:0,
        backdropFilter:"blur(8px)", background:"rgba(7,9,15,0.75)" }} />

      {/* Popup */}
      <div style={{ position:"relative", background:T.surface,
        border:`1px solid ${T.border}`, maxWidth:460, width:"100%",
        animation:"modalIn 0.35s both", zIndex:1 }}>

        <div style={{ height:2,
          background:`linear-gradient(to right, ${T.amber}, #a78bfa)` }} />

        <div style={{ padding:"1.5rem" }}>
          <div style={{ fontFamily:"DM Mono", fontSize:"0.5rem", letterSpacing:"0.14em",
            textTransform:"uppercase", color:T.rose, marginBottom:"0.6rem" }}>
            {plan === "trial" ? "Trial Ended" : "Plan Expired"}
          </div>
          <div style={{ fontFamily:"'Playfair Display',serif",
            fontSize:"1.4rem", fontWeight:900, marginBottom:"0.5rem" }}>
            Your {plan === "trial" ? "7-day trial" : "seasonal plan"} has ended.
          </div>
          <p style={{ fontFamily:"DM Mono", fontSize:"0.58rem",
            color:T.muted, lineHeight:1.7, marginBottom:"1.5rem" }}>
            Unlock continued access to your personal emotional index.
            Your data is safe — it's waiting for you.
          </p>

          <div style={{ display:"grid",
            gridTemplateColumns:bp==="mobile"?"1fr":"1fr 1fr",
            gap:"1px", background:T.border, border:`1px solid ${T.border}`,
            marginBottom:"1.25rem" }}>
            {plans.map((p, i) => (
              <div key={i} style={{ background:T.bg, padding:"1.1rem",
                position:"relative", overflow:"hidden" }}>
                <div style={{ position:"absolute", top:0, left:0, right:0,
                  height:2, background:p.color }} />
                <div style={{ fontFamily:"DM Mono", fontSize:"0.48rem",
                  letterSpacing:"0.12em", textTransform:"uppercase",
                  color:p.color, marginBottom:"0.3rem" }}>{p.label}</div>
                <div style={{ fontFamily:"'Playfair Display',serif",
                  fontSize:"1.6rem", fontWeight:900, color:p.color,
                  lineHeight:1, marginBottom:"0.15rem" }}>{p.price}</div>
                <div style={{ fontFamily:"DM Mono", fontSize:"0.48rem",
                  color:T.muted }}>{p.duration}</div>
              </div>
            ))}
          </div>

          <div style={{ display:"flex", flexDirection:"column", gap:"0.5rem" }}>
            <button onClick={() => navigate("pricing")}
              style={{ width:"100%", background:T.amber, color:"#000", border:"none",
                padding:"0.65rem", fontFamily:"DM Mono", fontSize:"0.6rem",
                fontWeight:500, letterSpacing:"0.1em", textTransform:"uppercase",
                cursor:"pointer", transition:"all 0.2s" }}
              onMouseEnter={e=>e.currentTarget.style.background="#fff"}
              onMouseLeave={e=>e.currentTarget.style.background=T.amber}>
              Unlock Access →
            </button>
            <button onClick={() => navigate("home")}
              style={{ width:"100%", background:"none", border:`1px solid ${T.border}`,
                color:T.muted, padding:"0.55rem", fontFamily:"DM Mono",
                fontSize:"0.56rem", letterSpacing:"0.08em", textTransform:"uppercase",
                cursor:"pointer", transition:"all 0.2s" }}
              onMouseEnter={e=>e.currentTarget.style.color=T.text}
              onMouseLeave={e=>e.currentTarget.style.color=T.muted}>
              Back to Index
            </button>
          </div>
        </div>
      </div>
      <style>{`@keyframes modalIn{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}`}</style>
    </div>
  );
}
