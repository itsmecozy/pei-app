import { useState, useRef } from "react";
import { EMOTION_MAP } from "../../constants/emotions";
import { PROVINCE_SHAPES, MAP_WIDTH, MAP_HEIGHT } from "../../constants/phProvincePaths";

function normalize(name) {
  return (name || "").toLowerCase().replace(/[^a-z0-9 ]/g, "").trim();
}

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

const MIN_ZOOM = 1;
const MAX_ZOOM = 6;
const POPUP_W  = 175;
const POPUP_H  = 165;

export default function PhilippinesMap({
  provinceAggs = [],
  lgus         = [],
  selected     = null,
  onSelectLgu,
  onSelectProvince,
  width        = 340,
  highlights   = null,  // { [normalizedProvinceName]: { hex, emotion, pct, provinceName } }
  readOnly     = false, // when true: no click, no zoom, no popup
  T,
}) {
  const [zoom,      setZoom]     = useState(1);
  const [pan,       setPan]      = useState({ x:0, y:0 });
  const [dragging,  setDragging] = useState(false);
  const [lastPan,   setLastPan]  = useState({ x:0, y:0 });
  const [lastTouch, setLastTouch]= useState(null);
  const [popup,     setPopup]    = useState(null);

  // highlights mode: precompute lookup
  const hlMap = highlights || null;

  const containerRef = useRef(null);
  const didDrag      = useRef(false);

  // ── Province data map ──────────────────────────────────────────────────────
  const pdMap = {};
  for (const agg of provinceAggs) {
    const key = normalize(agg.provinces?.name || "");
    if (!key) continue;
    const em = EMOTION_MAP[agg.dominant_emotion];
    pdMap[key] = {
      hex:      em?.hex || "#6b7280",
      dominant: agg.dominant_emotion,
      count:    agg.submission_count,
      esi:      agg.esi,
      hdr:      agg.hdr,
      name:     agg.provinces?.name,
    };
  }

  function getPC(shape) {
    const key = normalize(shape.name);
    if (pdMap[key]) return pdMap[key];
    for (const [k, v] of Object.entries(pdMap))
      if (key.includes(k) || k.includes(key)) return v;
    return null;
  }

  // ── Zoom ───────────────────────────────────────────────────────────────────
  function clamp(z) { return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z)); }

  function zoomAt(newZ, cx, cy) {
    const z = clamp(newZ);
    setPan(p => ({ x: cx-(cx-p.x)*(z/zoom), y: cy-(cy-p.y)*(z/zoom) }));
    setZoom(z);
  }

  const onWheel = (e) => {
    e.preventDefault();
    const r = containerRef.current.getBoundingClientRect();
    zoomAt(zoom * (e.deltaY < 0 ? 1.15 : 0.87), e.clientX-r.left, e.clientY-r.top);
  };

  // ── Drag ───────────────────────────────────────────────────────────────────
  const onMouseDown = (e) => {
    if (e.button !== 0) return;
    didDrag.current = false;
    setDragging(true);
    setLastPan({ x: e.clientX-pan.x, y: e.clientY-pan.y });
  };
  const onMouseMove = (e) => {
    if (!dragging) return;
    didDrag.current = true;
    setPan({ x: e.clientX-lastPan.x, y: e.clientY-lastPan.y });
  };
  const onMouseUp = () => setDragging(false);

  // ── Touch ──────────────────────────────────────────────────────────────────
  const onTouchStart = (e) => {
    didDrag.current = false;
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      setLastTouch({ dist:Math.hypot(dx,dy), zoom,
        cx:(e.touches[0].clientX+e.touches[1].clientX)/2,
        cy:(e.touches[0].clientY+e.touches[1].clientY)/2 });
    } else {
      setLastPan({ x:e.touches[0].clientX-pan.x, y:e.touches[0].clientY-pan.y });
    }
  };
  const onTouchMove = (e) => {
    e.preventDefault();
    didDrag.current = true;
    if (e.touches.length === 2 && lastTouch) {
      const dx = e.touches[0].clientX-e.touches[1].clientX;
      const dy = e.touches[0].clientY-e.touches[1].clientY;
      const r  = containerRef.current.getBoundingClientRect();
      zoomAt(lastTouch.zoom*(Math.hypot(dx,dy)/lastTouch.dist),
        lastTouch.cx-r.left, lastTouch.cy-r.top);
    } else if (e.touches.length === 1) {
      setPan({ x:e.touches[0].clientX-lastPan.x, y:e.touches[0].clientY-lastPan.y });
    }
  };
  const onTouchEnd = () => setLastTouch(null);

  function resetZoom() { setZoom(1); setPan({x:0,y:0}); setPopup(null); }

  // ── Province click → popup in opposite quadrant ────────────────────────────
  function handleProvinceClick(e, shape, pc) {
    if (didDrag.current) return;
    e.stopPropagation();

    const r    = containerRef.current.getBoundingClientRect();
    const clickX = e.clientX - r.left;
    const clickY = e.clientY - r.top;

    // Place popup in the quadrant OPPOSITE to where user clicked
    const isLeft = clickX < r.width  / 2;
    const isTop  = clickY < r.height / 2;

    const popX = isLeft  ? r.width  - POPUP_W - 10 : 10;
    const popY = isTop   ? r.height - POPUP_H - 10 : 10;

    setPopup({ x:popX, y:popY, shape, pc });
    onSelectProvince && onSelectProvince(pc || { name:shape.name, dominant:null, count:0 });
  }

  // ── City dot projection ────────────────────────────────────────────────────
  function projectDot(lng, lat) {
    const X_OFF = MAP_WIDTH/2, Y_OFF = MAP_HEIGHT*0.38;
    const PPM   = MAP_WIDTH/1100000, S = 111320;
    const cos12 = Math.cos(12*Math.PI/180);
    return [
      X_OFF + (lng-122)*S*cos12*PPM,
      Y_OFF - (lat-12)*S*PPM,
    ];
  }

  // Container is 1:1 square; map SVG uses preserveAspectRatio="xMidYMid meet"
  // so the full Philippines is always visible, letterboxed within the square
  return (
    <div style={{ position:"relative", width:"100%" }}>

      {/* 1:1 square container */}
      <div
        ref={containerRef}
        style={{
          width:"100%",
          aspectRatio:"1/1",
          overflow:"hidden",
          border:`1px solid ${T.border}`,
          background:T.surface,
          cursor: dragging ? "grabbing" : zoom>1 ? "grab" : "default",
          userSelect:"none",
          touchAction:"none",
          position:"relative",
        }}
        onWheel={readOnly ? undefined : onWheel}
        onMouseDown={readOnly ? undefined : onMouseDown}
        onMouseMove={readOnly ? undefined : onMouseMove}
        onMouseUp={readOnly ? undefined : onMouseUp}
        onMouseLeave={readOnly ? undefined : onMouseUp}
        onTouchStart={readOnly ? undefined : onTouchStart}
        onTouchMove={readOnly ? undefined : onTouchMove}
        onTouchEnd={readOnly ? undefined : onTouchEnd}
        onClick={readOnly ? undefined : () => { if (!didDrag.current) setPopup(null); }}
      >
        <svg
          viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
          width="100%" height="100%"
          preserveAspectRatio="xMidYMid meet"
          style={{ display:"block" }}>

          <g transform={`translate(${pan.x},${pan.y}) scale(${zoom})`}>

            {/* Province fills */}
            {PROVINCE_SHAPES.map(shape => {
              const key      = normalize(shape.name);
              const hl       = hlMap ? hlMap[key] : null;
              const pc       = getPC(shape);
              const isActive = popup?.shape?.code === shape.code;

              // Highlights mode: show emotion champions
              const fill = hlMap
                ? (hl ? hl.hex : "#ffffff")
                : (pc?.hex || "#ffffff");
              const op = hlMap
                ? (hl ? 0.75 : 0.08)
                : pc
                  ? (isActive ? 1 : 0.6)
                  : (isActive ? 0.45 : 0.18);

              return (
                <path key={shape.code} d={shape.d}
                  fill={fill}
                  fillOpacity={op}
                  stroke={hlMap
                    ? (hl ? "rgba(255,255,255,0.6)" : "rgba(255,255,255,0.12)")
                    : (isActive ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.35)")
                  }
                  strokeWidth={hlMap
                    ? (hl ? 1.5 : 0.5)
                    : (isActive ? 3/zoom : 0.8/zoom)
                  }
                  style={{
                    cursor: readOnly ? "default" : "pointer",
                    transition:"fill-opacity 0.15s"
                  }}
                  onClick={readOnly ? undefined : (e) => handleProvinceClick(e, shape, pc)}>
                  <title>{shape.name}{hl ? ` — ${hl.emotion}` : ""}</title>
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
              const [x,y] = projectDot(lng, lat);
              return (
                <g key={a.id} style={{ cursor:"pointer" }}
                  onClick={(e) => { e.stopPropagation(); onSelectLgu && onSelectLgu(a); }}>
                  <circle cx={x} cy={y} r={(isSel?16:10)/zoom}
                    fill={em?.hex||T.amber} opacity={0.2} />
                  <circle cx={x} cy={y} r={(isSel?6:4)/zoom}
                    fill={em?.hex||T.amber}
                    stroke={isSel?"#fff":"rgba(255,255,255,0.5)"}
                    strokeWidth={1.5/zoom} />
                </g>
              );
            })}
          </g>
        </svg>

        {/* Province popup — hidden in readOnly mode */}
        {!readOnly && popup && (
          <div style={{
            position:"absolute",
            left: popup.x,
            top:  popup.y,
            width: POPUP_W,
            background: T.surface,
            border: `1px solid ${T.border}`,
            boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
            zIndex: 50,
            pointerEvents:"all",
          }}
            onClick={e => e.stopPropagation()}>

            {/* Header */}
            <div style={{ padding:"0.6rem 0.7rem 0.45rem",
              borderBottom:`1px solid ${T.border}`,
              display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
              <div style={{ flex:1, minWidth:0 }}>
                <p style={{ fontSize:"0.72rem", fontWeight:700, lineHeight:1.2,
                  marginBottom:"0.1rem",
                  overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                  {popup.shape.name}
                </p>
                <p style={{ fontSize:"0.5rem", color:T.muted }}>Province</p>
              </div>
              <button onClick={() => setPopup(null)}
                style={{ background:"none", border:"none", color:T.muted,
                  cursor:"pointer", fontSize:"0.75rem", lineHeight:1,
                  padding:"0 0 0 0.5rem", flexShrink:0 }}>✕</button>
            </div>

            {/* Body */}
            <div style={{ padding:"0.55rem 0.7rem" }}>
              {popup.pc ? (
                <>
                  <div style={{ display:"flex", alignItems:"center", gap:5,
                    marginBottom:"0.5rem" }}>
                    <div style={{ width:7, height:7, borderRadius:"50%",
                      background:popup.pc.hex, flexShrink:0 }} />
                    <span style={{ fontSize:"0.68rem", fontWeight:600,
                      color:popup.pc.hex, textTransform:"capitalize" }}>
                      {popup.pc.dominant}
                    </span>
                  </div>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0.35rem" }}>
                    {[
                      { label:"Balance",  value:formatBalance(popup.pc.hdr),
                        sub:balanceWord(popup.pc.hdr) },
                      { label:"Diversity",value:popup.pc.esi!=null
                        ? Number(popup.pc.esi).toFixed(2) : "—",
                        sub:popup.pc.esi>0.6?"diverse":popup.pc.esi>0.4?"moderate":"concentrated" },
                    ].map(m => (
                      <div key={m.label}>
                        <p style={{ fontSize:"0.46rem", letterSpacing:"0.1em",
                          textTransform:"uppercase", color:T.muted, marginBottom:2 }}>
                          {m.label}
                        </p>
                        <p style={{ fontSize:"0.95rem", fontWeight:700,
                          fontVariantNumeric:"tabular-nums", lineHeight:1 }}>
                          {m.value}
                        </p>
                        <p style={{ fontSize:"0.46rem", color:T.muted, marginTop:2 }}>
                          {m.sub}
                        </p>
                      </div>
                    ))}
                  </div>
                  <p style={{ fontSize:"0.5rem", color:T.muted, marginTop:"0.45rem",
                    paddingTop:"0.45rem", borderTop:`1px solid ${T.border}`,
                    fontVariantNumeric:"tabular-nums" }}>
                    {(popup.pc.count||0).toLocaleString()} readings
                  </p>
                </>
              ) : (
                <p style={{ fontSize:"0.6rem", color:T.muted, lineHeight:1.5 }}>
                  No readings yet in this window.
                </p>
              )}
            </div>
          </div>
        )}

        {/* Zoom controls — hidden in readOnly mode */}
        {!readOnly && <div style={{ position:"absolute", bottom:8, right:8,
          display:"flex", flexDirection:"column", gap:4 }}>
          {[
            { label:"+", fn: () => zoomAt(zoom*1.3, 100, 100) },
            { label:"−", fn: () => zoomAt(zoom*0.77, 100, 100) },
            { label:"↺", fn: resetZoom },
          ].map(b => (
            <button key={b.label}
              onClick={(e) => { e.stopPropagation(); b.fn(); }}
              style={{ width:26, height:26, background:`${T.surface}ee`,
                border:`1px solid ${T.border}`, color:T.muted,
                fontSize:"0.7rem", cursor:"pointer",
                display:"flex", alignItems:"center", justifyContent:"center" }}>
              {b.label}
            </button>
          ))}
        </div>}

        {!readOnly && zoom > 1 && (
          <div style={{ position:"absolute", bottom:8, left:8,
            fontSize:"0.46rem", color:T.muted }}>
            {Math.round(zoom*100)}%
          </div>
        )}
      </div>

      {/* Caption — always outside and below container */}
      <p style={{ fontSize:"0.55rem", color:T.muted, marginTop:"0.4rem" }}>
        {lgus.length > 0
          ? `${provinceAggs.filter(p=>p.meets_threshold).length} provinces · ${lgus.length} LGUs · click a province to explore`
          : "Provinces and cities appear once they reach the submission threshold"
        }
      </p>
    </div>
  );
}
