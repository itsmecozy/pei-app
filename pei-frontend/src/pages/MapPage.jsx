import { useState, useEffect } from "react";
import { getLGUAggregations, getProvinceAggregations } from "../lib/supabase";
import { useT } from "../context/ThemeContext";
import { EMOTIONS, EMOTION_MAP } from "../constants/emotions";
import { useBreakpoint } from "../hooks/useBreakpoint";
import { useInView } from "../hooks/useInView";
import { PageHeader, EmotionBar, Skeleton, EmptyState } from "../components/shared/ui/index";
import EmotionIcon from "../components/shared/EmotionIcon";
import PhilippinesMap from "../components/shared/PhilippinesMap";

const NAV_H = 56;

const PERIOD_LABELS = {
  "7d":  "Past 7 days",
  "30d": "Past 30 days",
  "90d": "Past 90 days",
  "all": "All time",
};

// ── Balance helpers (from Lovable v2) ─────────────────────────────────────────
function formatBalance(v) {
  if (v == null) return "—";
  const n = Number(v);
  return `${n > 0 ? "+" : ""}${n.toFixed(2)}`;
}

function balanceWord(v) {
  if (v == null) return "no data";
  const n = Number(v);
  if (n >=  0.4) return "strongly hopeful";
  if (n >=  0.1) return "leaning hopeful";
  if (n >  -0.1) return "evenly split";
  if (n >  -0.4) return "leaning heavy";
  return "strongly heavy";
}

function balanceColor(v, T) {
  if (v == null) return T.muted;
  return Number(v) >= 0 ? T.teal : T.rose;
}

// ── Dot ───────────────────────────────────────────────────────────────────────
function Dot({ dominant }) {
  const em = EMOTION_MAP[dominant];
  return (
    <span style={{ display:"inline-block", width:8, height:8, borderRadius:"50%",
      background:em?.hex || "#888", flexShrink:0 }} />
  );
}

// ── Province table ────────────────────────────────────────────────────────────
function ProvinceTable({ rows, T }) {
  const reported = rows.filter(r => r.meets_threshold);

  if (reported.length === 0) return (
    <p style={{ fontSize:"0.8rem", color:T.muted, lineHeight:1.6 }}>
      No province has reached the minimum threshold in this window yet.
      Provinces appear here the moment they do.
    </p>
  );

  return (
    <div style={{ overflowX:"auto" }}>
      <table style={{ width:"100%", minWidth:480, borderCollapse:"collapse", textAlign:"left" }}>
        <thead>
          <tr style={{ fontSize:"0.6rem", letterSpacing:"0.16em", textTransform:"uppercase",
            color:T.muted, fontVariantNumeric:"tabular-nums" }}>
            {["Province","Dominant","Balance","Diversity","Readings"].map((h,i) => (
              <th key={h} style={{ paddingBottom:"0.75rem", fontWeight:400,
                textAlign:i >= 2 ? "right" : "left",
                paddingRight:i < 4 ? "1rem" : 0 }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {reported.map(row => {
            const dominant = row.dominant_emotion || row.dominant;
            const em = EMOTION_MAP[dominant];
            return (
              <tr key={row.id || row.province_id}
                style={{ borderTop:`1px solid ${T.border}` }}>
                <td style={{ padding:"0.75rem 1rem 0.75rem 0",
                  fontSize:"0.82rem", color:T.text }}>{row.provinces?.name || row.name}</td>
                <td style={{ padding:"0.75rem 1rem 0.75rem 0" }}>
                  <span style={{ display:"flex", alignItems:"center", gap:6,
                    fontSize:"0.82rem", color:T.muted }}>
                    <Dot dominant={dominant} />
                    {em?.name || dominant || "—"}
                  </span>
                </td>
                <td style={{ padding:"0.75rem 1rem 0.75rem 0", textAlign:"right",
                  fontSize:"0.82rem", fontVariantNumeric:"tabular-nums",
                  color:balanceColor(row.hdr, T) }}>
                  {formatBalance(row.hdr)}
                </td>
                <td style={{ padding:"0.75rem 1rem 0.75rem 0", textAlign:"right",
                  fontSize:"0.82rem", fontVariantNumeric:"tabular-nums",
                  color:T.muted }}>
                  {row.esi != null ? Number(row.esi).toFixed(2) : "—"}
                </td>
                <td style={{ padding:"0.75rem 0", textAlign:"right",
                  fontSize:"0.82rem", fontVariantNumeric:"tabular-nums",
                  color:T.muted }}>
                  {(row.submission_count || 0).toLocaleString()}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── City cards ────────────────────────────────────────────────────────────────
function CityCards({ rows, T, onSelect, selected }) {
  if (rows.length === 0) return (
    <p style={{ fontSize:"0.8rem", color:T.muted, lineHeight:1.6 }}>
      Cities and municipalities appear once they reach the minimum threshold.
      That protects small towns from being characterised by one voice.
    </p>
  );

  return (
    <ul style={{ display:"grid", gap:"0.65rem",
      gridTemplateColumns:"repeat(auto-fill, minmax(200px, 1fr))",
      listStyle:"none", padding:0 }}>
      {rows.map(a => {
        const dominant = a.dominant_emotion;
        const em = EMOTION_MAP[dominant];
        const isSel = selected?.id === a.id;
        return (
          <li key={a.id}
            onClick={() => onSelect && onSelect(a)}
            style={{ border:`1px solid ${isSel ? (em?.hex || T.amber) : T.border}`,
              background:isSel ? `${em?.hex || T.amber}08` : T.surface,
              padding:"1rem 1.1rem", cursor:"pointer",
              transition:"all 0.2s" }}>
            <p style={{ fontSize:"1.1rem", fontWeight:700,
              lineHeight:1.1, marginBottom:"0.2rem" }}>
              {a.lgus?.name}
            </p>
            <p style={{ fontSize:"0.65rem", color:T.muted, marginBottom:"0.75rem" }}>
              {a.lgus?.provinces?.name}
            </p>
            <p style={{ display:"flex", alignItems:"center", gap:6,
              fontSize:"0.8rem", color:T.text, marginBottom:"0.3rem" }}>
              <Dot dominant={dominant} />
              {em?.name || dominant || "—"}
            </p>
            <p style={{ fontSize:"0.65rem", color:T.muted,
              fontVariantNumeric:"tabular-nums" }}>
              balance {formatBalance(a.hdr)} · {(a.submission_count||0).toLocaleString()} readings
            </p>
          </li>
        );
      })}
    </ul>
  );
}

// ── Map sidebar content ───────────────────────────────────────────────────────
function SidebarContent({ selected, selectedProvince, inView, period, onClose, bp, T }) {
  if (!selected && !selectedProvince) return (
    <div style={{ padding:"2rem 1.25rem" }}>
      <EmptyState icon="◉" title="Select a province or city"
        body="Click a province on the map or a city card below to see its breakdown." />
    </div>
  );

  const isLgu   = !!selected;
  const data    = selected || selectedProvince;
  const name    = isLgu ? data.lgus?.name : (data.provinces?.name || data.name);
  const dist    = data.emotion_dist || data.dist || {};
  const dominant = data.dominant_emotion || data.dominant;
  const em      = EMOTION_MAP[dominant];
  const distEntries = Object.entries(dist)
    .map(([key, pct]) => ({ key, pct: Math.round(pct*100), ...EMOTION_MAP[key] }))
    .sort((a,b) => b.pct - a.pct);

  return (
    <div>
      <div style={{ padding:"1.25rem", borderBottom:`1px solid ${T.border}` }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start",
          marginBottom:"0.75rem" }}>
          <div>
            <p style={{ fontSize:"1.1rem", fontWeight:700, lineHeight:1.2,
              marginBottom:"0.2rem" }}>{name}</p>
            <p style={{ fontSize:"0.6rem", color:T.muted }}>
              {isLgu
                ? `${data.lgus?.provinces?.name || ""} · ${data.lgus?.lgu_type || "LGU"}`
                : "Province"
              } · {(data.submission_count || 0).toLocaleString()} readings · {PERIOD_LABELS[period]}
            </p>
          </div>
          {bp !== "desktop" && (
            <button onClick={onClose}
              style={{ background:"none", border:`1px solid ${T.border}`, color:T.muted,
                padding:"0.2rem 0.45rem", fontSize:"0.6rem", cursor:"pointer",
                flexShrink:0, marginLeft:"0.5rem" }}>✕</button>
          )}
        </div>

        {em && (
          <div style={{ display:"flex", alignItems:"center", gap:6,
            background:`${em.hex}10`, border:`1px solid ${em.hex}25`,
            padding:"0.45rem 0.6rem", marginBottom:"0.75rem" }}>
            <EmotionIcon icon={em.icon} color={em.hex} size={12} />
            <span style={{ fontSize:"0.6rem", color:em.hex, textTransform:"capitalize" }}>
              {dominant} · {Math.round((dist[dominant]||0)*100)}%
            </span>
          </div>
        )}

        <div style={{ display:"flex", flexDirection:"column", gap:"0.4rem" }}>
          {distEntries.map((e, i) => (
            <EmotionBar key={e.key} name={e.name||e.key} pct={e.pct}
              hex={e.hex||T.muted} inView={inView} delay={i*50} />
          ))}
        </div>
      </div>

      {/* Balance + ESI */}
      <div style={{ padding:"1rem 1.25rem", display:"grid",
        gridTemplateColumns:"1fr 1fr", gap:"1rem" }}>
        <div>
          <p style={{ fontSize:"0.55rem", letterSpacing:"0.14em",
            textTransform:"uppercase", color:T.muted, marginBottom:4 }}>Balance</p>
          <p style={{ fontSize:"1.6rem", fontVariantNumeric:"tabular-nums",
            color:balanceColor(data.hdr, T), lineHeight:1 }}>
            {formatBalance(data.hdr)}
          </p>
          <p style={{ fontSize:"0.55rem", color:T.muted, marginTop:3 }}>
            {balanceWord(data.hdr)}
          </p>
        </div>
        <div>
          <p style={{ fontSize:"0.55rem", letterSpacing:"0.14em",
            textTransform:"uppercase", color:T.muted, marginBottom:4 }}>Diversity</p>
          <p style={{ fontSize:"1.6rem", fontVariantNumeric:"tabular-nums",
            color:T.text, lineHeight:1 }}>
            {data.esi != null ? Number(data.esi).toFixed(2) : "—"}
          </p>
          <p style={{ fontSize:"0.55rem", color:T.muted, marginTop:3 }}>
            {data.esi > 0.6 ? "diverse" : data.esi > 0.4 ? "moderate" : "concentrated"}
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function MapPage({ openModal }) {
  const T  = useT();
  const bp = useBreakpoint();
  const [ref, inView] = useInView(0.05);

  const [lgus,         setLgus]        = useState([]);
  const [provinceAggs, setProvinceAggs] = useState([]);
  const [loading,      setLoading]     = useState(true);
  const [period,       setPeriod]      = useState("all");
  const [selectedLgu,  setSelectedLgu] = useState(null);
  const [selectedProv, setSelectedProv] = useState(null);
  const [sidebarOpen,  setSidebarOpen] = useState(false);

  useEffect(() => {
    setLoading(true);
    Promise.all([getLGUAggregations(period), getProvinceAggregations(period)])
      .then(([lguData, provData]) => {
        setLgus(lguData);
        setProvinceAggs(provData);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [period]);

  const handleLguSelect = (lgu) => {
    setSelectedLgu(lgu);
    setSelectedProv(null);
    if (bp !== "desktop") setSidebarOpen(true);
  };

  const handleProvSelect = (pc) => {
    setSelectedProv(pc);
    setSelectedLgu(null);
    if (bp !== "desktop") setSidebarOpen(true);
  };

  const pad = bp === "mobile" ? "0 1.25rem" : "0";

  return (
    <div>
      {/* Header */}
      <div style={{ padding:pad }}>
        <PageHeader label="Emotional Heatmap" title="Cities of Feeling"
          live={lgus.length > 0}
          subtitle="Province boundaries colored by dominant emotion. Select a province or city to explore." />
      </div>

      {/* Period selector — pill group */}
      <div style={{ padding:bp==="mobile"?"0 1.25rem 1.25rem":"0 0 1.25rem" }}>
        <div style={{ display:"inline-flex", gap:2, padding:3,
          background:T.surface, border:`1px solid ${T.border}` }}>
          {[
            { key:"7d", label:"7D" },
            { key:"30d", label:"30D" },
            { key:"90d", label:"90D" },
            { key:"all", label:"All time" },
          ].map(t => (
            <button key={t.key} onClick={() => setPeriod(t.key)}
              style={{ padding:"4px 14px",
                background:period===t.key?T.bg:"transparent",
                color:period===t.key?T.text:T.muted,
                border:`1px solid ${period===t.key?T.border:"transparent"}`,
                fontSize:"0.72rem", fontWeight:period===t.key?500:400,
                cursor:"pointer", transition:"all 0.15s" }}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Mobile sidebar overlay */}
      {bp !== "desktop" && sidebarOpen && (
        <div style={{ position:"fixed", inset:0, top:NAV_H, zIndex:210,
          background:"rgba(0,0,0,0.7)", backdropFilter:"blur(4px)" }}
          onClick={() => setSidebarOpen(false)}>
          <div style={{ position:"absolute", right:0, top:0, bottom:0,
            width:"min(380px,92vw)", background:T.surface,
            borderLeft:`1px solid ${T.border}`, overflowY:"auto" }}
            onClick={e => e.stopPropagation()}>
            <SidebarContent selected={selectedLgu} selectedProvince={selectedProv}
              inView={inView} period={period}
              onClose={() => setSidebarOpen(false)} bp={bp} T={T} />
          </div>
        </div>
      )}

      {/* ── Map + desktop sidebar ─────────────────────────────────────────── */}
      <div ref={ref} style={{ display:bp==="desktop"?"grid":"block",
        gridTemplateColumns:"1fr 320px",
        border:`1px solid ${T.border}`,
        marginBottom:"2.5rem" }}>

        {/* Map */}
        <div style={{ display:"flex", alignItems:"center", justifyContent:"center",
          padding:bp==="mobile"?"1.5rem 1rem":"2rem",
          borderRight:bp==="desktop"?`1px solid ${T.border}`:"none",
          borderBottom:bp!=="desktop"?`1px solid ${T.border}`:"none" }}>
          {loading ? (
            <Skeleton height={420} width={260} />
          ) : lgus.length === 0 && provinceAggs.length === 0 ? (
            <EmptyState icon="◉" title="Map is waiting"
              body="Cities and provinces appear once they reach the submission threshold."
              cta="Submit Your Feeling" onCta={openModal} />
          ) : (
            <div style={{ width:"100%", maxWidth:bp==="mobile"?260:340 }}>
              <PhilippinesMap
                provinceAggs={provinceAggs}
                lgus={lgus}
                selected={selectedLgu}
                onSelectLgu={handleLguSelect}
                onSelectProvince={handleProvSelect}
                width={bp==="mobile"?260:340}
                T={T}
              />
              <p style={{ fontSize:"0.55rem", color:T.muted,
                textAlign:"center", marginTop:6 }}>
                {provinceAggs.filter(p=>p.meets_threshold).length} provinces ·{" "}
                {lgus.length} active {lgus.length===1?"LGU":"LGUs"} · click to explore
              </p>
            </div>
          )}
        </div>

        {/* Desktop sidebar */}
        {bp === "desktop" && (
          <div style={{ overflowY:"auto", maxHeight:600 }}>
            <SidebarContent selected={selectedLgu} selectedProvince={selectedProv}
              inView={inView} period={period} onClose={() => {}} bp={bp} T={T} />
          </div>
        )}
      </div>

      {/* ── Province table ────────────────────────────────────────────────── */}
      <div style={{ padding:pad, marginBottom:"2.5rem" }}>
        <div style={{ marginBottom:"1rem" }}>
          <p style={{ fontSize:"0.6rem", letterSpacing:"0.14em",
            textTransform:"uppercase", color:T.muted, marginBottom:4 }}>
            Across the provinces
          </p>
          <p style={{ fontSize:"0.8rem", color:T.muted, lineHeight:1.6, maxWidth:480 }}>
            A province appears once it has enough readings in the selected window.
          </p>
        </div>
        {loading
          ? <Skeleton height={160} width="100%" />
          : <ProvinceTable rows={provinceAggs} T={T} />
        }
      </div>

      {/* ── City cards ────────────────────────────────────────────────────── */}
      <div style={{ padding:pad }}>
        <div style={{ marginBottom:"1rem" }}>
          <p style={{ fontSize:"0.6rem", letterSpacing:"0.14em",
            textTransform:"uppercase", color:T.muted, marginBottom:4 }}>
            Cities and towns
          </p>
          <p style={{ fontSize:"0.8rem", color:T.muted, lineHeight:1.6, maxWidth:480 }}>
            Ordered by total readings. Click any card to highlight on the map above.
          </p>
        </div>
        {loading
          ? <Skeleton height={120} width="100%" />
          : <CityCards rows={lgus} T={T}
              onSelect={handleLguSelect}
              selected={selectedLgu} />
        }
      </div>
    </div>
  );
}
