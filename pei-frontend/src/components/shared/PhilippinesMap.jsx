// PhilippinesMap.jsx
// Uses ph-provinces.json from simplemaps.com (place in public/ folder)
// 67 provinces, clean name properties

import { useState, useEffect, useRef } from "react";
import { EMOTION_MAP } from "../../constants/emotions";

const GEOJSON_URL = "/ph-provinces.json";

// Normalize province name for matching
function normalize(name) {
  return (name || "")
    .toLowerCase()
    .replace("metropolitan manila", "metro manila")
    .replace("mindoro occidental", "occidental mindoro")
    .replace("mindoro oriental", "oriental mindoro")
    .replace(/[^a-z0-9 ]/g, "")
    .trim();
}

// Project lng/lat → SVG x/y
// PH bounding box: lng 116.9–126.6, lat 4.6–20.8
function project(lng, lat, W, H) {
  const x = ((lng - 116.9) / (126.6 - 116.9)) * W;
  const y = ((20.8  - lat) / (20.8  - 4.6))   * H;
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

  const W = width;
  const H = Math.round(width * 1.72);

  useEffect(() => {
    fetch(GEOJSON_URL)
      .then(r => { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(data => { setFeatures(data.features || []); setLoading(false); })
      .catch(() => { setError(true); setLoading(false); });
  }, []);

  // Build province name → color map
  const provinceColorMap = {};
  for (const agg of provinceAggs) {
    const key = normalize(agg.provinces?.name || "");
    if (!key || !agg.dominant_emotion) continue;
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

  function getColor(feature) {
    const key = normalize(feature.properties?.name || "");
    if (provinceColorMap[key]) return provinceColorMap[key];
    // partial match fallback
    for (const [k, v] of Object.entries(provinceColorMap)) {
      if (key.includes(k) || k.includes(key)) return v;
    }
    return null;
  }

  if (loading) return (
    <div style={{ width:W, height:200, display:"flex", alignItems:"center",
      justifyContent:"center", fontFamily:"DM Mono", fontSize:"0.56rem", color:T.muted }}>
      Loading map…
    </div>
  );

  if (error) return (
    <div style={{ width:W, padding:"1rem", textAlign:"center",
      fontFamily:"DM Mono", fontSize:"0.56rem", color:T.rose }}>
      Map unavailable — ph-provinces.json missing from public/
    </div>
  );

  return (
    <svg viewBox={`0 0 ${W} ${H}`}
      style={{ width:"100%", maxWidth:W, display:"block",
        filter:"drop-shadow(0 2px 24px rgba(0,0,0,0.5))" }}>

      {/* Province fills */}
      {features.map((feature, i) => {
        const pc      = getColor(feature);
        const pathD   = featureToPath(feature, W, H);
        const fill    = pc?.hex || "#1a2535";
        const opacity = pc ? 0.5 : 0.07;

        return (
          <path key={i} d={pathD}
            fill={fill} fillOpacity={opacity}
            stroke="rgba(255,255,255,0.15)" strokeWidth={0.5}
            style={{ cursor: pc ? "pointer" : "default", transition:"fill-opacity 0.2s" }}
            onMouseEnter={e => e.currentTarget.setAttribute("fill-opacity", pc ? "0.82" : "0.12")}
            onMouseLeave={e => e.currentTarget.setAttribute("fill-opacity", pc ? "0.5" : "0.07")}
            onClick={() => pc && onSelectProvince && onSelectProvince(pc)}>
            <title>
              {feature.properties?.name}{pc ? ` — ${pc.dominant}` : " — no data"}
            </title>
          </path>
        );
      })}

      {/* Active LGU city dots */}
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
            <circle cx={x} cy={y} r={isSel ? 14 : 8}
              fill={em?.hex || T.amber} opacity={0.18}
              style={{ transition:"r 0.2s" }} />
            <circle cx={x} cy={y} r={isSel ? 6 : 4}
              fill={em?.hex || T.amber}
              stroke={isSel ? "#fff" : "rgba(255,255,255,0.4)"}
              strokeWidth={isSel ? 1.5 : 0.5}
              style={{ transition:"all 0.25s",
                filter: isSel ? `drop-shadow(0 0 6px ${em?.hex})` : "none" }} />
            {isSel && (
              <text x={x + 9} y={y + 3}
                fill="rgba(255,255,255,0.9)" fontSize="6.5" fontFamily="DM Mono">
                {a.lgus?.name}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
