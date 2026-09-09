// PhilippinesMap.jsx
// Uses pre-generated SVG paths from PSGC 2023 data (83 provinces)
// Zoomable: scroll wheel on desktop, pinch on mobile
// Source: faeldon/philippines-json-maps via Lovable v2

import { useState, useRef, useCallback } from "react";
import { EMOTION_MAP } from "../../constants/emotions";
import { PROVINCE_SHAPES, MAP_WIDTH, MAP_HEIGHT } from "../../constants/phProvincePaths";

function normalize(name) {
  return (name || "")
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, "")
    .trim();
}

const MIN_ZOOM = 1;
const MAX_ZOOM = 6;

export default function PhilippinesMap({
  provinceAggs = [],
  lgus         = [],
  selected     = null,
  onSelectLgu,
  onSelectProvince,
  width        = 340,
  T,
}) {
  const [active,    setActive]    = useState(null);
  const [zoom,      setZoom]      = useState(1);
  const [pan,       setPan]       = useState({ x: 0, y: 0 });
  const [dragging,  setDragging]  = useState(false);
  const [lastPan,   setLastPan]   = useState({ x: 0, y: 0 });
  const [lastTouch, setLastTouch] = useState(null);

  const svgRef    = useRef(null);
  const W = width;
  const H = Math.round(width * (MAP_HEIGHT / MAP_WIDTH));

  // ── Province data map ───────────────────────────────────────────────────────
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
    for (const [k, v] of Object.entries(provinceDataMap)) {
      if (key.includes(k) || k.includes(key)) return v;
    }
    return null;
  }

  // ── Zoom helpers ────────────────────────────────────────────────────────────
  function clampZoom(z) {
    return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z));
  }

  function zoomAt(newZoom, cx, cy) {
    const clamped = clampZoom(newZoom);
    // Adjust pan so zoom centers on cursor/pinch point
    setPan(prev => ({
      x: cx - (cx - prev.x) * (clamped / zoom),
      y: cy - (cy - prev.y) * (clamped / zoom),
    }));
    setZoom(clamped);
  }

  // ── Mouse wheel zoom ────────────────────────────────────────────────────────
  const onWheel = useCallback((e) => {
    e.preventDefault();
    const rect = svgRef.current.getBoundingClientRect();
    const cx   = e.clientX - rect.left;
    const cy   = e.clientY - rect.top;
    const delta = e.deltaY < 0 ? 1.15 : 0.87;
    zoomAt(zoom * delta, cx, cy);
  }, [zoom, pan]);

  // ── Mouse drag pan ──────────────────────────────────────────────────────────
  const onMouseDown = (e) => {
    if (e.button !== 0) return;
    setDragging(true);
    setLastPan({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const onMouseMove = (e) => {
    if (!dragging) return;
    setPan({ x: e.clientX - lastPan.x, y: e.clientY - lastPan.y });
  };

  const onMouseUp = () => setDragging(false);

  // ── Touch pinch zoom + drag ─────────────────────────────────────────────────
  const onTouchStart = (e) => {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      setLastTouch({
        dist: Math.hypot(dx, dy),
        zoom,
        cx: (e.touches[0].clientX + e.touches[1].clientX) / 2,
        cy: (e.touches[0].clientY + e.touches[1].clientY) / 2,
      });
    } else if (e.touches.length === 1) {
      setLastPan({ x: e.touches[0].clientX - pan.x, y: e.touches[0].clientY - pan.y });
    }
  };

  const onTouchMove = (e) => {
    e.preventDefault();
    if (e.touches.length === 2 && lastTouch) {
      const dx   = e.touches[0].clientX - e.touches[1].clientX;
      const dy   = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.hypot(dx, dy);
      const rect = svgRef.current.getBoundingClientRect();
      const cx   = lastTouch.cx - rect.left;
      const cy   = lastTouch.cy - rect.top;
      zoomAt(lastTouch.zoom * (dist / lastTouch.dist), cx, cy);
    } else if (e.touches.length === 1) {
      setPan({
        x: e.touches[0].clientX - lastPan.x,
        y: e.touches[0].clientY - lastPan.y,
      });
    }
  };

  const onTouchEnd = () => setLastTouch(null);

  // ── Reset zoom ──────────────────────────────────────────────────────────────
  function resetZoom() {
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setActive(null);
  }

  // ── City dot projection ─────────────────────────────────────────────────────
  function projectDot(lng, lat) {
    const REF_LNG  = 122.0;
    const REF_LAT  = 12.0;
    const SCALE    = 111320;
    const X_OFFSET = MAP_WIDTH  / 2;
    const Y_OFFSET = MAP_HEIGHT * 0.38;
    const PIX_PER_M = MAP_WIDTH / 1100000;
    const x = (lng - REF_LNG) * SCALE * Math.cos(REF_LAT * Math.PI / 180);
    const y = -((lat - REF_LAT) * SCALE);
    return [X_OFFSET + x * PIX_PER_M, Y_OFFSET + y * PIX_PER_M];
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div style={{ position:"relative", width:"100%", maxWidth:W }}>

      {/* Map container */}
      <div style={{
        width:"100%",
        aspectRatio:`${MAP_WIDTH}/${MAP_HEIGHT}`,
        overflow:"hidden",
        border:`1px solid ${T.border}`,
        cursor: dragging ? "grabbing" : zoom > 1 ? "grab" : "default",
        userSelect:"none",
        touchAction:"none",
        position:"relative",
      }}
        onWheel={onWheel}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <svg
          ref={svgRef}
          viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
          width="100%" height="100%"
          style={{ display:"block" }}>

          <g transform={`translate(${pan.x},${pan.y}) scale(${zoom})`}
            style={{ transformOrigin:"0 0" }}>

            {/* Province fills */}
            {PROVINCE_SHAPES.map((shape) => {
              const pc       = getProvinceData(shape);
              const isActive = active === shape.code;
              const fill     = pc?.hex || T.surface || "#1a2535";
              const op       = pc
                ? (isActive ? 1 : 0.7)
                : (isActive ? 0.35 : 0.09);

              return (
                <path key={shape.code}
                  d={shape.d}
                  fill={fill}
                  fillOpacity={op}
                  stroke={isActive ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.18)"}
                  strokeWidth={isActive ? 3 / zoom : 0.6 / zoom}
                  style={{ cursor:"pointer", transition:"fill-opacity 0.15s" }}
                  onMouseEnter={() => !dragging && setActive(shape.code)}
                  onMouseLeave={() => setActive(null)}
                  onClick={(e) => {
                    e.stopPropagation();
                    setActive(shape.code);
                    onSelectProvince && onSelectProvince(
                      pc || { name: shape.name, dominant: null, count: 0 }
                    );
                  }}>
                  <title>{shape.name}{pc ? ` — ${pc.dominant}` : " — no data yet"}</title>
                </path>
              );
            })}

            {/* City dots — scale inversely with zoom so they stay readable */}
            {lgus.map(a => {
              const em    = EMOTION_MAP[a.dominant_emotion];
              const isSel = selected?.id === a.id;
              const lat   = a.lgus?.lat;
              const lng   = a.lgus?.lng;
              if (!lat || !lng) return null;
              const [x, y] = projectDot(lng, lat);

              return (
                <g key={a.id}
                  onClick={(e) => { e.stopPropagation(); onSelectLgu && onSelectLgu(a); }}
                  style={{ cursor:"pointer" }}>
                  <circle cx={x} cy={y} r={isSel ? 16/zoom : 10/zoom}
                    fill={em?.hex || T.amber} opacity={0.2} />
                  <circle cx={x} cy={y} r={isSel ? 6/zoom : 4/zoom}
                    fill={em?.hex || T.amber}
                    stroke={isSel ? "#fff" : "rgba(255,255,255,0.5)"}
                    strokeWidth={1.5/zoom} />
                </g>
              );
            })}
          </g>
        </svg>
      </div>

      {/* Controls */}
      <div style={{ position:"absolute", bottom:8, right:8,
        display:"flex", flexDirection:"column", gap:4 }}>
        {[
          { label:"+", action: () => zoomAt(zoom * 1.3, W/2, H/2) },
          { label:"−", action: () => zoomAt(zoom * 0.77, W/2, H/2) },
          { label:"↺", action: resetZoom },
        ].map(btn => (
          <button key={btn.label} onClick={btn.action}
            style={{ width:28, height:28, background:T.surface,
              border:`1px solid ${T.border}`, color:T.muted,
              fontSize:"0.75rem", cursor:"pointer", lineHeight:1,
              display:"flex", alignItems:"center", justifyContent:"center" }}>
            {btn.label}
          </button>
        ))}
      </div>

      {/* Zoom level hint */}
      {zoom > 1 && (
        <div style={{ position:"absolute", bottom:8, left:8,
          fontSize:"0.48rem", color:T.muted, fontVariantNumeric:"tabular-nums" }}>
          {Math.round(zoom * 100)}%
        </div>
      )}
    </div>
  );
}
