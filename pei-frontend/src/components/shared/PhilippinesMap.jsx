// PhilippinesMap.jsx
// Uses pre-generated SVG paths from PSGC 2023 data (83 provinces)
// No runtime GeoJSON fetch — paths are bundled directly
// Source: faeldon/philippines-json-maps via Lovable v2

import { useState } from "react";
import { EMOTION_MAP } from "../../constants/emotions";
import { PROVINCE_SHAPES, MAP_WIDTH, MAP_HEIGHT } from "../../constants/phProvincePaths";

function normalize(name) {
  return (name || "")
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, "")
    .trim();
}

// Project lng/lat to SVG coords using same equirectangular projection
// Standard parallel 12N, matching how paths were generated
function projectDot(lng, lat) {
  const REF_LNG = 122.0; // center longitude
  const REF_LAT = 12.0;  // standard parallel
  const SCALE   = 111320; // meters per degree

  const x = ((lng - REF_LNG) * SCALE * Math.cos(REF_LAT * Math.PI / 180));
  const y = -((lat - REF_LAT) * SCALE);

  // Normalize to MAP_WIDTH x MAP_HEIGHT
  // Philippines approx bounds after centering
  const X_OFFSET = MAP_WIDTH  / 2;
  const Y_OFFSET = MAP_HEIGHT * 0.38; // approx vertical center
  const PIX_PER_M = MAP_WIDTH / 1100000; // approx 1100km wide

  return [
    X_OFFSET + x * PIX_PER_M,
    Y_OFFSET + y * PIX_PER_M,
  ];
}

export default function PhilippinesMap({
  provinceAggs = [],
  lgus         = [],
  selected     = null,
  onSelectLgu,
  onSelectProvince,
  width        = 340,
  T,
}) {
  const [hovered, setHovered] = useState(null);

  const W = width;
  const H = Math.round(width * (MAP_HEIGHT / MAP_WIDTH)); // preserve aspect ratio

  // Scale factor from MAP coords to our display size
  const scaleX = W / MAP_WIDTH;
  const scaleY = H / MAP_HEIGHT;

  // Build province name → aggregation data map
  const provinceDataMap = {};
  for (const agg of provinceAggs) {
    const key = normalize(agg.provinces?.name || "");
    if (!key) continue;
    const em = EMOTION_MAP[agg.dominant_emotion];
    provinceDataMap[key] = {
      hex:      em?.hex || "#6b7280",
      dominant: agg.dominant_emotion,
      count:    agg.submission_count,
      esi:      agg.esi,
      hdr:      agg.hdr,
      dist:     agg.emotion_dist,
      name:     agg.provinces?.name,
    };
  }

  function getProvinceData(shape) {
    const key = normalize(shape.name);
    if (provinceDataMap[key]) return provinceDataMap[key];
    // Partial match fallback
    for (const [k, v] of Object.entries(provinceDataMap)) {
      if (key.includes(k) || k.includes(key)) return v;
    }
    return null;
  }

  // Scale a path's coordinates from MAP_WIDTH/MAP_HEIGHT to display size
  function scalePath(d) {
    return d.replace(/(-?\d+\.?\d*),(-?\d+\.?\d*)/g, (_, x, y) =>
      `${(parseFloat(x) * scaleX).toFixed(1)},${(parseFloat(y) * scaleY).toFixed(1)}`
    );
  }

  return (
    <svg viewBox={`0 0 ${W} ${H}`}
      width={W} height={H}
      style={{ width:"100%", maxWidth:W, height:"auto", display:"block" }}>

      {/* Province fills */}
      {PROVINCE_SHAPES.map((shape, i) => {
        const pc     = getProvinceData(shape);
        const isHov  = hovered === i;
        const fill   = pc?.hex || T.surface || "#1a2535";
        const op     = pc
          ? (isHov ? 0.85 : 0.55)
          : (isHov ? 0.2  : 0.09);

        return (
          <path key={shape.code}
            d={scalePath(shape.d)}
            fill={fill}
            fillOpacity={op}
            stroke="rgba(255,255,255,0.25)"
            strokeWidth={0.4}
            style={{ cursor:"pointer", transition:"fill-opacity 0.15s" }}
            onMouseEnter={() => setHovered(i)}
            onMouseLeave={() => setHovered(null)}
            onClick={() => {
              onSelectProvince && onSelectProvince(
                pc || { name: shape.name, dominant: null, count: 0 }
              );
            }}>
            <title>{shape.name}{pc ? ` — ${pc.dominant}` : " — no data yet"}</title>
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
        const [x, y] = projectDot(lng, lat);
        if (x < 0 || x > W || y < 0 || y > H) return null;

        return (
          <g key={a.id}
            onClick={() => onSelectLgu && onSelectLgu(a)}
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
