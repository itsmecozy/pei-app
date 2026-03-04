import { T } from "../../constants/tokens";
import { useBreakpoint } from "../../hooks/useBreakpoint";
import { PageHeader } from "../../components/shared/ui/index";

function DocPage({ label, title, subtitle, sections }) {
  const bp = useBreakpoint();
  return (
    <div>
      <div style={{ padding:bp==="mobile"?"0 1.25rem":"0" }}>
        <PageHeader label={label} title={title} subtitle={subtitle} />
      </div>
      <div style={{ padding:bp==="mobile"?"0 1.25rem":"0", display:"flex", flexDirection:"column", gap:"2rem", paddingBottom:"3rem" }}>
        {sections.map((s, i) => (
          <div key={i} style={{ borderLeft:`2px solid ${T.border}`, paddingLeft:"1.25rem" }}>
            <div style={{ fontFamily:"DM Mono", fontSize:"0.52rem", letterSpacing:"0.14em",
              textTransform:"uppercase", color:T.amber, marginBottom:"0.5rem" }}>{s.title}</div>
            <p style={{ fontFamily:"DM Mono", fontSize:"0.64rem", color:T.muted, lineHeight:1.8 }}>{s.body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export function PrivacyPolicyPage() {
  return <DocPage
    label="Legal" title="Privacy Policy"
    subtitle="Last updated March 2026. This policy covers data collected through anonymous submissions on pei.ph."
    sections={[
      { title:"What we collect", body:"When you submit a feeling, we collect: your selected emotion, intensity rating (1–5), your city or municipality (LGU), an optional short text (max 150 characters), and a timestamp. We do not collect your name, email, IP address, or any identifying information." },
      { title:"What we do NOT collect", body:"We do not collect IP addresses, device fingerprints, geolocation data, cookies, browser identifiers, or any information that could link a submission back to an individual. Anonymity is architectural — not a policy promise." },
      { title:"How data is stored", body:"Submissions are held for 72 hours before being fully aggregated into community-level statistics. Optional text is processed for emotional signal only and is discarded — it is never stored in raw form. After aggregation, no individual submission record exists." },
      { title:"How data is displayed", body:"Data is only displayed at the community level. A city or municipality must reach a minimum of 50 submissions before it appears in the index. No individual submission is ever shown or retrievable." },
      { title:"Third parties", body:"We do not sell, share, or transfer data to commercial third parties. Academic research partnerships may receive anonymized, aggregated datasets only — never individual submissions. Any research partnership is disclosed publicly." },
      { title:"Your rights", body:"Because we do not collect identifying information, there is no individual record to request, correct, or delete. This is by design. The system cannot identify you even if compelled to do so." },
      { title:"Changes to this policy", body:"We will update this page when our practices change. Significant changes will be announced on the homepage. Continued use of the index constitutes acceptance of the current policy." },
    ]} />;
}

export function AnonymityFrameworkPage() {
  const bp = useBreakpoint();
  const layers = [
    { num:"01", title:"No Persistent IP Storage",     body:"Your IP address is used only for rate-limiting at the edge. It is never written to the database.",                                                           color:T.teal    },
    { num:"02", title:"Daily Rotating Salt",           body:"Each submission hash uses a salt that rotates every 24 hours. Yesterday's hashes are cryptographically unrecoverable today.",                              color:T.amber   },
    { num:"03", title:"No Device Fingerprinting",      body:"We do not collect browser type, screen size, OS, installed fonts, canvas fingerprints, or any device-level identifiers.",                                 color:"#a78bfa" },
    { num:"04", title:"Text-Ephemeral Processing",     body:"Optional text submissions are analyzed for emotional signal in memory only. The raw text is never persisted to disk or database.",                         color:"#fb923c" },
    { num:"05", title:"Community Threshold Gating",    body:"No city appears on the index until it reaches 50 submissions. Isolated individuals cannot be inferred from sparse data.",                                  color:"#10b981" },
    { num:"06", title:"Aggregation-Before-Storage",    body:"After 72 hours, individual submission records are aggregated and the source records are deleted. The pattern survives. The person does not.",              color:T.rose    },
  ];
  return (
    <div>
      <div style={{ padding:bp==="mobile"?"0 1.25rem":"0" }}>
        <PageHeader label="Legal" title="Anonymity Framework"
          subtitle="Six architectural layers that make individual identification impossible — not just unlikely." />
      </div>
      <div style={{ padding:bp==="mobile"?"0 1.25rem":"0" }}>
        <div style={{ display:"grid",
          gridTemplateColumns:bp==="mobile"?"1fr":bp==="tablet"?"1fr 1fr":"repeat(3,1fr)",
          gap:1, background:T.border, border:`1px solid ${T.border}`, marginBottom:"2rem" }}>
          {layers.map((l, i) => (
            <div key={i} style={{ background:T.bg, padding:"1.5rem", position:"relative", overflow:"hidden" }}>
              <div style={{ position:"absolute", top:0, left:0, right:0, height:2, background:l.color }} />
              <div style={{ fontFamily:"DM Mono", fontSize:"0.48rem", letterSpacing:"0.18em",
                color:l.color, marginBottom:"0.5rem" }}>{l.num}</div>
              <div style={{ fontFamily:"'Playfair Display',serif", fontSize:"0.95rem",
                fontWeight:700, marginBottom:"0.5rem" }}>{l.title}</div>
              <div style={{ fontFamily:"DM Mono", fontSize:"0.6rem",
                color:T.muted, lineHeight:1.7 }}>{l.body}</div>
            </div>
          ))}
        </div>
        <div style={{ background:`${T.teal}08`, border:`1px solid ${T.teal}20`,
          padding:"1.25rem 1.5rem", marginBottom:"3rem" }}>
          <div style={{ fontFamily:"DM Mono", fontSize:"0.52rem", letterSpacing:"0.14em",
            textTransform:"uppercase", color:T.teal, marginBottom:"0.5rem" }}>Design Principle</div>
          <p style={{ fontFamily:"'Playfair Display',serif", fontStyle:"italic",
            fontSize:"1rem", lineHeight:1.7, color:T.text, margin:0 }}>
            "Anonymity by architecture means that compelled disclosure yields no identifying information.
            There is nothing to hand over — not because we refuse, but because it does not exist."
          </p>
        </div>
      </div>
    </div>
  );
}

export function DataMethodologyPage() {
  return <DocPage
    label="Legal" title="Data Methodology"
    subtitle="How emotional signals are collected, weighted, and aggregated into the national index."
    sections={[
      { title:"Signal collection", body:"Each submission records: emotion_key (one of 8 emotions), intensity (integer 1–5), lgu_id (city or municipality), timestamp (UTC), and optional text_signal (processed, not stored). No other fields are captured." },
      { title:"Weighting model", body:"Emotions are weighted by intensity. A submission of grief at intensity 5 contributes more signal than grief at intensity 1. Weighted frequencies are normalized to percentages within each LGU and nationally." },
      { title:"Community thresholds", body:"An LGU must reach 50 weighted submissions within the selected time window before appearing in the index. This prevents individual exposure and reduces statistical noise from sparse populations." },
      { title:"Dominance calculation", body:"The dominant emotion for an LGU is the emotion with the highest weighted frequency. In the case of ties, the more recent submission timestamp is used as a tiebreaker." },
      { title:"Time windows", body:"The index supports three time windows: 24 hours, 7 days, and 30 days. Data refreshes every 15 minutes. Older submissions are not deleted — they contribute to longer windows." },
      { title:"Known limitations", body:"Self-selection bias: only Filipinos who choose to submit are represented. Platform bias: mobile and desktop internet users are overrepresented. Urban skew: cities with larger online populations submit more frequently. These limitations are acknowledged as inherent to voluntary census design." },
    ]} />;
}

export function ResearchAccessPage() {
  return <DocPage
    label="Legal" title="Research Access"
    subtitle="Guidelines for academic and institutional access to PEI aggregated datasets."
    sections={[
      { title:"Eligibility", body:"Research access is available to faculty, postdoctoral researchers, and graduate students affiliated with accredited academic institutions. Independent researchers may apply with a verified institutional affiliation." },
      { title:"Available data", body:"Research partners receive access to: anonymized community-level aggregates, historical trend data by LGU, regional breakdowns by time period. Individual submission records do not exist and cannot be provided." },
      { title:"Application process", body:"Submit a research proposal via the Research Portal. Proposals are reviewed within 2–4 weeks. Approved partners receive a data access agreement and API credentials with rate limits appropriate to their study scope." },
      { title:"Data use restrictions", body:"Research data may not be used for commercial purposes. Re-identification attempts are strictly prohibited and constitute a breach of agreement. All publications using PEI data must include methodological caveats acknowledging the voluntary, non-representative nature of the index." },
      { title:"Attribution", body:'Publications must cite PEI as: "Philippines Emotional Index (pei.ph), [year]. Voluntary emotional census data. Not a scientific survey." We request pre-publication notification so we can review methodology citations for accuracy.' },
    ]} />;
}

export function ContactPage() {
  const bp = useBreakpoint();
  return <DocPage
    label="Contact" title="Get in Touch"
    subtitle="Questions, research inquiries, press, or technical support — use the channel that fits."
    sections={[
      { title:"General",   body:"For general questions about the index, submissions, or how PEI works: hello@pei.ph" },
      { title:"Research",  body:"For academic partnerships, data access requests, or methodology questions: research@pei.ph" },
      { title:"Press",     body:"For media inquiries, interviews, or press materials: press@pei.ph" },
      { title:"Technical", body:"For API support, integration issues, or bug reports: api@pei.ph" },
    ]} />;
}
