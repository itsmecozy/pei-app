import { useState, useRef, useCallback } from "react";
import { EMOTION_MAP } from "../../constants/emotions";
import { PROVINCE_SHAPES, MAP_WIDTH, MAP_HEIGHT } from "../../constants/phProvincePaths";

function normalize(name) {
  return (name || "").toLowerCase().replace(/[^a-z0-9 ]/g, "").trim();
}

const MIN_ZOOM = 1;
const MAX_ZOOM = 6;

function formatBalance(v) {
  if (v == null) return "—";
  const n = Number(v);
  return `${n > 0 ? "+" : ""}${n.toFixed(2)}`;
}
function balanceWord(v) {
  if (v == null) return null;
  const n = Number(v);
  if (n >=  0.4) return "strongly hopeful";
  if (n >=  0.1) return "leaning hopeful";
  if (n >  -0.1) return "evenly split";
  if (n >  -0.4) return "leaning heavy";
  return "strongly heavy";
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
  const [zoom,      setZoom]    = useState(1);
  const [pan,       setPan]     = useState({ x: 0, y: 0 });
  const [dragging,  setDragging] = useState(false);
  const [lastPan,   setLastPan] = useState({ x: 0, y: 0 });
  const [lastTouch, setLastTouch] = useState(null);
  const [popup,     setPopup]   = useState(null);
  // popup: { x, y, shape, pc }

  const containerRef = useRef(null);
  const didDrag      = useRef(false);

  const W = width;
  const H = Math.round(W * (MAP_HEIGHT / MAP_WIDTH));

  // ── Province data ──────────────────────────────────────────────────────────
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

  // ── Zoom ───────────────────────────────────────────────────────────────────
  function clampZoom(z) { return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z)); }

  function zoomAt(newZoom, cx, cy) {
    const clamped = clampZoom(newZoom);
    setPan(prev => ({
      x: cx - (cx - prev.x) * (clamped / zoom),
      y: cy - (cy - prev.y) * (clamped / zoom),
    }));
    setZoom(clamped);
  }

  const onWheel = useCallback((e) => {
    e.preventDefault();
    const rect = containerRef.current.getBoundingClientRect();
    zoomAt(zoom * (e.deltaY < 0 ? 1.15 : 0.87),
      e.clientX - rect.left, e.clientY - rect.top);
  }, [zoom, pan]);

  // ── Drag ───────────────────────────────────────────────────────────────────
  const onMouseDown = (e) => {
    if (e.button !== 0) return;
    didDrag.current = false;
    setDragging(true);
    setLastPan({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };
  const onMouseMove = (e) => {
    if (!dragging) return;
    didDrag.current = true;
    setPan({ x: e.clientX - lastPan.x, y: e.clientY - lastPan.y });
  };
  const onMouseUp = () => setDragging(false);

  // ── Touch ──────────────────────────────────────────────────────────────────
  const onTouchStart = (e) => {
    didDrag.current = false;
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      setLastTouch({
        dist: Math.hypot(dx, dy), zoom,
        cx: (e.touches[0].clientX + e.touches[1].clientX) / 2,
        cy: (e.touches[0].clientY + e.touches[1].clientY) / 2,
      });
    } else if (e.touches.length === 1) {
      setLastPan({ x: e.touches[0].clientX - pan.x, y: e.touches[0].clientY - pan.y });
    }
  };
  const onTouchMove = (e) => {
    e.preventDefault();
    didDrag.current = true;
    if (e.touches.length === 2 && lastTouch) {
      const dx   = e.touches[0].clientX - e.touches[1].clientX;
      const dy   = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.hypot(dx, dy);
      const rect = containerRef.current.getBoundingClientRect();
      zoomAt(lastTouch.zoom * (dist / lastTouch.dist),
        lastTouch.cx - rect.left, lastTouch.cy - rect.top);
    } else if (e.touches.length === 1) {
      setPan({ x: e.touches[0].clientX - lastPan.x,
               y: e.touches[0].clientY - lastPan.y });
    }
  };
  const onTouchEnd = () => setLastTouch(null);

  // ── Reset ──────────────────────────────────────────────────────────────────
  function resetZoom() {
    setZoom(1); setPan({ x: 0, y: 0 }); setPopup(null);
  }

  // ── Province click → popup ─────────────────────────────────────────────────
  function handleProvinceClick(e, shape, pc) {
    if (didDrag.current) return;
    e.stopPropagation();

    const rect = containerRef.current.getBoundingClientRect();
    const rawX = e.clientX - rect.left;
    const rawY = e.clientY - rect.top;

    // Keep popup inside the container (popup ~180px wide, ~160px tall)
    const POPUP_W = 180;
    const POPUP_H = 160;
    const x = Math.min(rawX + 10, rect.width  - POPUP_W - 8);
    const y = rawY > rect.height * 0.6
      ? rawY - POPUP_H - 10  // show above if clicked in lower half
      : rawY + 10;

    setPopup({ x, y, shape, pc });
    onSelectProvince && onSelectProvince(
      pc || { name: shape.name, dominant: null, count: 0 }
    );
  }

  // ── City dot projection ────────────────────────────────────────────────────
  function projectDot(lng, lat) {
    const REF_LNG = 122.0, REF_LAT = 12.0, SCALE = 111320;
    const X_OFFSET = MAP_WIDTH / 2;
    const Y_OFFSET = MAP_HEIGHT * 0.38;
    const PIX_PER_M = MAP_WIDTH / 1100000;
    const x = (lng - REF_LNG) * SCALE * Math.cos(REF_LAT * Math.PI / 180);
    const y = -((lat - REF_LAT) * SCALE);
    return [X_OFFSET + x * PIX_PER_M, Y_OFFSET + y * PIX_PER_M];
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ position:"relative", width:"100%", maxWidth:W }}>

      {/* Map container */}
      <div
        ref={containerRef}
        style={{
          width:"100%", aspectRatio:`${MAP_WIDTH}/${MAP_HEIGHT}`,
          overflow:"hidden", border:`1px solid ${T.border}`,
          cursor: dragging ? "grabbing" : zoom > 1 ? "grab" : "default",
          userSelect:"none", touchAction:"none", position:"relative",
        }}
        onWheel={onWheel}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onClick={() => { if (!didDrag.current) setPopup(null); }}
      >
        <svg viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
          width="100%" height="100%" style={{ display:"block" }}>
          <g transform={`translate(${pan.x},${pan.y}) scale(${zoom})`}>

            {/* Province fills */}
            {PROVINCE_SHAPES.map(shape => {
              const pc       = getProvinceData(shape);
              const isActive = popup?.shape?.code === shape.code;
              const fill     = pc?.hex || T.surface || "#1a2535";
              const op       = pc
                ? (isActive ? 1 : 0.65)
                : (isActive ? 0.35 : 0.09);

              return (
                <path key={shape.code} d={shape.d}
                  fill={fill} fillOpacity={op}
                  stroke={isActive ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.18)"}
                  strokeWidth={isActive ? 3 / zoom : 0.6 / zoom}
                  style={{ cursor:"pointer", transition:"fill-opacity 0.15s" }}
                  onClick={(e) => handleProvinceClick(e, shape, pc)}>
                  <title>{shape.name}</title>
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
              return (
                <g key={a.id} style={{ cursor:"pointer" }}
                  onClick={(e) => { e.stopPropagation(); onSelectLgu && onSelectLgu(a); }}>
                  <circle cx={x} cy={y} r={(isSel ? 16 : 10) / zoom}
                    fill={em?.hex || T.amber} opacity={0.2} />
                  <circle cx={x} cy={y} r={(isSel ? 6 : 4) / zoom}
                    fill={em?.hex || T.amber}
                    stroke={isSel ? "#fff" : "rgba(255,255,255,0.5)"}
                    strokeWidth={1.5 / zoom} />
                </g>
              );
            })}
          </g>
        </svg>

        {/* ── Province popup ─────────────────────────────────────────────── */}
        {popup && (
          <div style={{
            position:"absolute",
            left: popup.x,
            top:  popup.y,
            width: 180,
            background: T.surface,
            border: `1px solid ${T.border}`,
            zIndex: 50,
            pointerEvents: "all",
            boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
          }}
            onClick={e => e.stopPropagation()}>

            {/* Header */}
            <div style={{ padding:"0.65rem 0.75rem 0.5rem",
              borderBottom:`1px solid ${T.border}`,
              display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
              <div style={{ flex:1, minWidth:0 }}>
                <p style={{ fontSize:"0.75rem", fontWeight:700, lineHeight:1.2,
                  marginBottom:"0.15rem",
                  overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                  {popup.shape.name}
                </p>
                <p style={{ fontSize:"0.55rem", color:T.muted }}>Province</p>
              </div>
              <button onClick={() => setPopup(null)}
                style={{ background:"none", border:"none", color:T.muted,
                  cursor:"pointer", fontSize:"0.8rem", lineHeight:1,
                  padding:"0 0 0 0.5rem", flexShrink:0 }}>✕</button>
            </div>

            {/* Content */}
            <div style={{ padding:"0.6rem 0.75rem" }}>
              {popup.pc ? (
                <>
                  {/* Dominant emotion */}
                  <div style={{ display:"flex", alignItems:"center", gap:6,
                    marginBottom:"0.55rem" }}>
                    <div style={{ width:8, height:8, borderRadius:"50%",
                      background: popup.pc.hex, flexShrink:0 }} />
                    <span style={{ fontSize:"0.72rem", fontWeight:600,
                      color: popup.pc.hex, textTransform:"capitalize" }}>
                      {popup.pc.dominant}
                    </span>
                  </div>
                  {/* Stats grid */}
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr",
                    gap:"0.4rem" }}>
                    {[
                      { label:"Balance",  value: formatBalance(popup.pc.hdr),
                        sub: balanceWord(popup.pc.hdr) },
                      { label:"Diversity", value: popup.pc.esi != null
                        ? Number(popup.pc.esi).toFixed(2) : "—",
                        sub: popup.pc.esi > 0.6 ? "diverse"
                           : popup.pc.esi > 0.4 ? "moderate" : "concentrated" },
                    ].map(m => (
                      <div key={m.label}>
                        <p style={{ fontSize:"0.48rem", letterSpacing:"0.1em",
                          textTransform:"uppercase", color:T.muted, marginBottom:2 }}>
                          {m.label}
                        </p>
                        <p style={{ fontSize:"1rem", fontWeight:700,
                          fontVariantNumeric:"tabular-nums", lineHeight:1 }}>
                          {m.value}
                        </p>
                        <p style={{ fontSize:"0.48rem", color:T.muted, marginTop:2 }}>
                          {m.sub}
                        </p>
                      </div>
                    ))}
                  </div>
                  <p style={{ fontSize:"0.52rem", color:T.muted,
                    marginTop:"0.5rem", paddingTop:"0.5rem",
                    borderTop:`1px solid ${T.border}`,
                    fontVariantNumeric:"tabular-nums" }}>
                    {(popup.pc.count || 0).toLocaleString()} readings
                  </p>
                </>
              ) : (
                <p style={{ fontSize:"0.62rem", color:T.muted, lineHeight:1.5 }}>
                  No readings yet in this window.
                </p>
              )}
            </div>
          </div>
        )}

        {/* Zoom controls */}
        <div style={{ position:"absolute", bottom:8, right:8,
          display:"flex", flexDirection:"column", gap:4 }}>
          {[
            { label:"+", action: () => zoomAt(zoom * 1.3, W/2, H/2) },
            { label:"−", action: () => zoomAt(zoom * 0.77, W/2, H/2) },
            { label:"↺", action: resetZoom },
          ].map(btn => (
            <button key={btn.label} onClick={(e) => { e.stopPropagation(); btn.action(); }}
              style={{ width:28, height:28, background:T.surface,
                border:`1px solid ${T.border}`, color:T.muted,
                fontSize:"0.75rem", cursor:"pointer",
                display:"flex", alignItems:"center", justifyContent:"center" }}>
              {btn.label}
            </button>
          ))}
        </div>

        {/* Zoom level */}
        {zoom > 1 && (
          <div style={{ position:"absolute", bottom:8, left:8,
            fontSize:"0.48rem", color:T.muted, fontVariantNumeric:"tabular-nums" }}>
            {Math.round(zoom * 100)}%
          </div>
        )}
      </div>
    </div>
  );
}
