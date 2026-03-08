// PhilippinesMap.jsx
// Renders accurate Philippine province boundaries using real GeoJSON
// from faeldon/philippines-json-maps (MIT license, PSGC 2023 data)
// Fetched at runtime via jsDelivr CDN — no local file needed

import { useState, useEffect, useRef, useMemo } from "react";
import { EMOTION_MAP } from "../../constants/emotions";

// jsDelivr CDN URL for low-res province GeoJSON (small file, fast load)
const GEOJSON_URL = "/ph-provinces.json"; // local static asset in public/
  "https://cdn.jsdelivr.net/gh/faeldon/philippines-json-maps@master/2023/geojson/provdists/lowres/provinces-lowres.0.1.json";

// Province name normalization — maps GeoJSON names → our province_key format
// GeoJSON uses official PSGC names; province_aggregations.provinces.name may vary
function normalizeName(name) {
  return (name || "")
    .toLowerCase()
    .replace(/\bncr\b.*/, "metro manila")
    .replace(/city of /g, "")
    .replace(/province of /g, "")
    .replace(/ \(.*?\)/g, "")
    .replace(/[^a-z0-9 ]/g, "")
    .trim();
}

// Project lat/lng to SVG coordinates
// Philippines bbox: lng 116.9–126.6, lat 4.6–20.8
function project(lng, lat, w, h) {
  const minLng = 116.9, maxLng = 126.6;
  const minLat = 4.6,   maxLat = 20.8;
  const x = ((lng - minLng) / (maxLng - minLng)) * w;
  const y = ((maxLat - lat) / (maxLat - minLat)) * h;
  return [x, y];
}

// Convert GeoJSON polygon coordinates to SVG path string
function coordsToPath(coords, w, h) {
  return coords.map(ring =>
    ring.map(([lng, lat], i) => {
      const [x, y] = project(lng, lat, w, h);
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(" ") + " Z"
  ).join(" ");
}

function featureToPath(feature, w, h) {
  const { type, coordinates } = feature.geometry;
  if (type === "Polygon") return coordsToPath(coordinates, w, h);
  if (type === "MultiPolygon") return coordinates.map(c => coordsToPath(c, w, h)).join(" ");
  return "";
}

export default function PhilippinesMap({
  provinceAggs = [],   // province_aggregations rows with .provinces.name and .dominant_emotion
  lgus = [],           // lgu_aggregations rows with .lgus.lat, .lgus.lng, .dominant_emotion
  selected = null,     // currently selected LGU
  onSelectLgu,         // (lgu) => void
  onSelectProvince,    // (provinceInfo) => void
  width = 340,
  T,
}) {
  const [geoData, setGeoData]     = useState(null);
  const [loadErr, setLoadErr]     = useState(false);
  const [loading, setLoading]     = useState(true);
  const svgRef                    = useRef(null);

  const W = width;
  const H = Math.round(width * 1.72); // aspect ratio of PH

  // Fetch GeoJSON once
  useEffect(() => {
    fetch(GEOJSON_URL)
      .then(r => { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(data => { setGeoData(data); setLoading(false); })
      .catch(() => { setLoadErr(true); setLoading(false); });
  }, []);

  // Build province name → color map from aggregation data
  const provinceColorMap = useMemo(() => {
    const map = {};
    for (const agg of provinceAggs) {
      const key = normalizeName(agg.provinces?.name);
      if (!key || !agg.dominant_emotion) continue;
      const em = EMOTION_MAP[agg.dominant_emotion];
      map[key] = {
        hex:      em?.hex || "#6b7280",
        dominant: agg.dominant_emotion,
        count:    agg.submission_count,
        esi:      agg.esi,
        hdr:      agg.hdr,
        dist:     agg.emotion_dist,
        name:     agg.provinces?.name,
      };
    }
    return map;
  }, [provinceAggs]);

  // Resolve color for a GeoJSON feature
  function getFeatureColor(feature) {
    const rawName = feature.properties?.adm2_en || feature.properties?.name || "";
    const key = normalizeName(rawName);
    // Try exact match first, then partial
    if (provinceColorMap[key]) return provinceColorMap[key];
    // Partial match — find first key that contains or is contained
    for (const [pkey, val] of Object.entries(provinceColorMap)) {
      if (key.includes(pkey) || pkey.includes(key.split(" ")[0])) return val;
    }
    return null;
  }

  if (loading) return (
    <div style={{ width:W, height:H*0.6, display:"flex", alignItems:"center",
      justifyContent:"center", color:T.muted, fontFamily:"DM Mono", fontSize:"0.56rem" }}>
      Loading map…
    </div>
  );

  if (loadErr) return (
    <div style={{ width:W, padding:"1rem", color:T.rose, fontFamily:"DM Mono",
      fontSize:"0.56rem", textAlign:"center" }}>
      Map unavailable — check connection
    </div>
  );

  const features = geoData?.features || [];

  return (
    <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`}
      style={{ width:"100%", maxWidth:W, display:"block",
        filter:"drop-shadow(0 2px 24px rgba(0,0,0,0.5))" }}>

      {/* Province fills */}
      {features.map((feature, i) => {
        const pc     = getFeatureColor(feature);
        const pathD  = featureToPath(feature, W, H);
        const fill   = pc?.hex || "#1a2535";
        const opacity = pc ? 0.5 : 0.07;

        return (
          <path key={i}
            d={pathD}
            fill={fill}
            fillOpacity={opacity}
            stroke="rgba(255,255,255,0.15)"
            strokeWidth={0.4}
            style={{
              cursor: pc ? "pointer" : "default",
              transition: "fill-opacity 0.2s",
            }}
            onMouseEnter={e => {
              e.currentTarget.setAttribute("fill-opacity", pc ? "0.8" : "0.12");
            }}
            onMouseLeave={e => {
              e.currentTarget.setAttribute("fill-opacity", pc ? "0.5" : "0.07");
            }}
            onClick={() => pc && onSelectProvince && onSelectProvince(pc)}
          >
            <title>
              {feature.properties?.adm2_en || feature.properties?.name || ""}
              {pc ? ` — ${pc.dominant}` : " — no data"}
            </title>
          </path>
        );
      })}

      {/* Active LGU city dots */}
      {lgus.map(a => {
        const em     = EMOTION_MAP[a.dominant_emotion];
        const isSel  = selected?.id === a.id;
        const lat    = a.lgus?.lat;
        const lng    = a.lgus?.lng;
        if (!lat || !lng) return null;
        const [x, y] = project(lng, lat, W, H);
        return (
          <g key={a.id} onClick={() => onSelectLgu && onSelectLgu(a)}
            style={{ cursor:"pointer" }}>
            {/* Pulse ring */}
            <circle cx={x} cy={y} r={isSel ? 14 : 8}
              fill={em?.hex || T.amber} opacity={0.18}
              style={{ transition:"r 0.2s" }} />
            {/* Core dot */}
            <circle cx={x} cy={y} r={isSel ? 6 : 4}
              fill={em?.hex || T.amber}
              stroke={isSel ? "#fff" : "rgba(255,255,255,0.4)"}
              strokeWidth={isSel ? 1.5 : 0.5}
              style={{ transition:"all 0.25s",
                filter: isSel ? `drop-shadow(0 0 6px ${em?.hex})` : "none" }} />
            {/* Label when selected */}
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
