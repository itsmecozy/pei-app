// PhilippinesMap.jsx
// GeoJSON: ph-provinces.json in public/ folder
// Replace with faeldon/philippines-json-maps for full 82-province coverage

import { useState, useEffect } from "react";
import { EMOTION_MAP } from "../../constants/emotions";

const GEOJSON_URL = "/ph-provinces.json";

function normalize(name) {
  return (name || "")
    .toLowerCase()
    .replace("metropolitan manila", "metro manila")
    .replace("mindoro occidental", "occidental mindoro")
    .replace("mindoro oriental", "oriental mindoro")
    .replace(/[^a-z0-9 ]/g, "")
    .trim();
}

function project(lng, lat, W, H) {
  const x = ((lng - 116.9) / (126.6 - 116.9)) * W;
  const y = ((20.8 - lat)  / (20.8 - 4.6))    * H;
  return [x, y];
}

function ringToPath(ring, W, H) {
  return ring.map(([lng, lat], i) => {
    const [x, y] = project(lng, lat, W, H);
    return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ") + " Z";
}

function featureToPath(feature, W, H) {
  const { type, coordinates } = feature.geometry;
  if (type === "Polygon")
    return coordinates.map(r => ringToPath(r, W, H)).join(" ");
  if (type === "MultiPolygon")
    return coordinates.map(poly => poly.map(r => ringToPath(r, W, H)).join(" ")).join(" ");
  return "";
}

export default function PhilippinesMap({
  provinceAggs = [],
  lgus = [],
  selected = null,
  onSelectLgu,
  onSelectProvince,
  width = 340,
  T,
}) {
  const [features, setFeatures] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(false);
  const [hovered,  setHovered]  = useState(null);

  const W = width;
  const H = Math.round(width * 1.72);

  useEffect(() => {
    fetch(GEOJSON_URL)
      .then(r => { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(data => { setFeatures(data.features || []); setLoading(false); })
      .catch(() => { setError(true); setLoading(false); });
  }, []);

  // Build province name → aggregation data map
  const provinceColorMap = {};
  for (const agg of provinceAggs) {
    const key = normalize(agg.provinces?.name || "");
    if (!key) continue;
    const em = EMOTION_MAP[agg.dominant_emotion];
    provinceColorMap[key] = {
      hex:      em?.hex || "#6b7280",
      dominant: agg.dominant_emotion,
      count:    agg.submission_count,
      esi:      agg.esi,
      hdr:      agg.hdr,
      dist:     agg.emotion_dist,
      name:     agg.provinces?.name,
    };
  }

  function getProvinceData(feature) {
    const key = normalize(feature.properties?.name || "");
    if (provinceColorMap[key]) return provinceColorMap[key];
    for (const [k, v] of Object.entries(provinceColorMap)) {
      if (key.includes(k) || k.includes(key)) return v;
    }
    return null;
  }

  if (loading) return (
    <div style={{ width:W, height:H*0.5, display:"flex", alignItems:"center",
      justifyContent:"center", fontSize:"0.6rem", color:T.muted }}>
      Loading map…
    </div>
  );

  if (error) return (
    <div style={{ width:W, padding:"1rem", textAlign:"center",
      fontSize:"0.6rem", color:T.rose }}>
      Map unavailable — ph-provinces.json missing from public/
    </div>
  );

  return (
    <svg viewBox={`0 0 ${W} ${H}`}
      style={{ width:"100%", maxWidth:W, display:"block" }}>

      {/* Province fills — always clickable */}
      {features.map((feature, i) => {
        const pc     = getProvinceData(feature);
        const name   = feature.properties?.name || "";
        const pathD  = featureToPath(feature, W, H);
        const isHov  = hovered === i;
        const fill   = pc?.hex || (T.surface || "#1a2535");
        const op     = pc ? (isHov ? 0.85 : 0.55) : (isHov ? 0.18 : 0.08);

        return (
          <path key={i} d={pathD}
            fill={fill}
            fillOpacity={op}
            stroke="rgba(255,255,255,0.12)"
            strokeWidth={0.4}
            style={{ cursor:"pointer", transition:"fill-opacity 0.15s" }}
            onMouseEnter={() => setHovered(i)}
            onMouseLeave={() => setHovered(null)}
            onClick={() => {
              if (pc) {
                onSelectProvince && onSelectProvince(pc);
              } else {
                // Province has no data yet — still pass name for display
                onSelectProvince && onSelectProvince({ name, dominant: null, count: 0 });
              }
            }}>
            <title>{name}{pc ? ` — ${pc.dominant}` : " — no data yet"}</title>
          </path>
        );
      })}

      {/* City dots */}
      {lgus.map(a => {
        const em    = EMOTION_MAP[a.dominant_emotion];
        const isSel = selected?.id === a.id;
        const lat   = a.lgus?.lat;
        const lng   = a.lgus?.lng;
        if (!lat || !lng) return null;
        const [x, y] = project(lng, lat, W, H);
        return (
          <g key={a.id} onClick={() => onSelectLgu && onSelectLgu(a)}
            style={{ cursor:"pointer" }}>
            <circle cx={x} cy={y} r={isSel ? 12 : 7}
              fill={em?.hex || T.amber} opacity={0.2} />
            <circle cx={x} cy={y} r={isSel ? 5 : 3.5}
              fill={em?.hex || T.amber}
              stroke={isSel ? "#fff" : "rgba(255,255,255,0.5)"}
              strokeWidth={isSel ? 1.5 : 0.5}
              style={{ filter: isSel ? `drop-shadow(0 0 5px ${em?.hex})` : "none" }} />
          </g>
        );
      })}
    </svg>
  );
}
