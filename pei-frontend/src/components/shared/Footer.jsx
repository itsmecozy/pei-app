import { T } from "../../constants/tokens";
import { useBreakpoint } from "../../hooks/useBreakpoint";

function FLink({ label, page, navigate }) {
  return (
    <div onClick={() => navigate(page)}
      style={{ fontFamily:"DM Mono", fontSize:"0.58rem", color:T.muted,
        marginBottom:"0.4rem", cursor:"pointer", transition:"color 0.2s" }}
      onMouseEnter={e=>e.target.style.color=T.text}
      onMouseLeave={e=>e.target.style.color=T.muted}>
      {label}
    </div>
  );
}

export default function Footer({ navigate, openModal }) {
  const bp = useBreakpoint();
  return (
    <footer style={{ borderTop:`1px solid ${T.border}`, marginTop:"4rem", background:T.surface }}>
      <div style={{ maxWidth:1200, margin:"0 auto",
        padding:`2.5rem ${bp==="mobile"?"1.25rem":bp==="tablet"?"2rem":"3rem"}` }}>
        <div style={{ display:"grid",
          gridTemplateColumns:bp==="mobile"?"1fr":bp==="tablet"?"1fr 1fr":"2fr 1fr 1fr 1fr",
          gap:bp==="mobile"?"2rem":"2.5rem", marginBottom:"2rem" }}>

          <div>
            <div style={{ fontFamily:"'Playfair Display',serif", fontSize:"1.4rem",
              fontWeight:900, color:T.amber, marginBottom:"0.4rem" }}>PEI</div>
            <div style={{ fontFamily:"DM Mono", fontSize:"0.58rem", color:T.muted,
              lineHeight:1.7, maxWidth:300 }}>
              Philippines Emotional Index — A real-time emotional census powered by voluntary, anonymous submissions.
            </div>
            <button onClick={openModal} style={{ marginTop:"1rem", background:T.amber,
              color:"#000", border:"none", padding:"0.5rem 1rem", fontFamily:"DM Mono",
              fontSize:"0.58rem", fontWeight:500, letterSpacing:"0.08em",
              textTransform:"uppercase", cursor:"pointer", transition:"all 0.2s" }}
              onMouseEnter={e=>e.currentTarget.style.background="#fff"}
              onMouseLeave={e=>e.currentTarget.style.background=T.amber}>
              Submit Your Feeling →
            </button>
          </div>

          <div>
            <div style={{ fontFamily:"DM Mono", fontSize:"0.52rem", letterSpacing:"0.14em",
              textTransform:"uppercase", color:T.muted, marginBottom:"0.75rem" }}>Pages</div>
            <FLink label="Dashboard"   page="dashboard"   navigate={navigate} />
            <FLink label="City Map"    page="map"         navigate={navigate} />
            <FLink label="Trends"      page="trends"      navigate={navigate} />
            <FLink label="Seasonal"    page="seasonal"    navigate={navigate} />
            <FLink label="Ethics"      page="ethics"      navigate={navigate} />
            <FLink label="Methodology" page="methodology" navigate={navigate} />
          </div>

          <div>
            <div style={{ fontFamily:"DM Mono", fontSize:"0.52rem", letterSpacing:"0.14em",
              textTransform:"uppercase", color:T.muted, marginBottom:"0.75rem" }}>Legal</div>
            <FLink label="Privacy Policy"      page="privacy"          navigate={navigate} />
            <FLink label="Anonymity Framework" page="anonymity"        navigate={navigate} />
            <FLink label="Data Methodology"    page="data-methodology" navigate={navigate} />
            <FLink label="Research Access"     page="research-access"  navigate={navigate} />
          </div>

          <div>
            <div style={{ fontFamily:"DM Mono", fontSize:"0.52rem", letterSpacing:"0.14em",
              textTransform:"uppercase", color:T.muted, marginBottom:"0.75rem" }}>Documentation</div>
            <FLink label="API Reference"   page="methodology"     navigate={navigate} />
            <FLink label="Data Access"     page="methodology"     navigate={navigate} />
            <FLink label="Research Portal" page="research-access" navigate={navigate} />
            <FLink label="Contact Us"      page="contact"         navigate={navigate} />
          </div>
        </div>

        <div style={{ borderTop:`1px solid ${T.border}`, paddingTop:"1.1rem",
          display:"flex", alignItems:"center", justifyContent:"space-between",
          flexWrap:"wrap", gap:"0.5rem",
          fontFamily:"DM Mono", fontSize:"0.5rem", color:T.muted }}>
          <span>© {new Date().getFullYear()} Philippines Emotional Index. All insights aggregated. No individuals exposed.</span>
          <span>Pattern survives. Person does not.</span>
        </div>
      </div>
    </footer>
  );
}
