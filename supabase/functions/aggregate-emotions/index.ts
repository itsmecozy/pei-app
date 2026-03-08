// ══════════════════════════════════════════════════════════════════════════════
// PEI AGGREGATE EMOTIONS — v2
// Accurate period definitions for research-grade data credibility
//
// PERIOD DEFINITIONS (fixed calendar windows, not rolling):
//
//   7D   = week 1:  deployment_date  →  deployment_date + 7 days
//   30D  = month 1: deployment_date  →  deployment_date + 30 days
//   90D  = quarter: deployment_date  →  deployment_date + 90 days
//   all  = all time: deployment_date →  now (always current)
//
// WHY FIXED WINDOWS (not rolling):
//   Rolling windows (last 7 days from now) make 7D and 30D overlap —
//   the same submission appears in both. That's misleading for research.
//   Fixed windows give each period a distinct, non-overlapping dataset.
//   "7D" always means "what happened in the first week of PEI."
//   "All time" always means "everything from day 1 to right now."
//
// DATA FLOW:
//   submissions table → group by lgu_id → compute per-LGU metrics
//   → roll up to province → roll up to national
//   → store in lgu_aggregations, province_aggregations, national_aggregations
//   → frontend queries by period — each period returns distinct data
//
// ══════════════════════════════════════════════════════════════════════════════

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ── Config ────────────────────────────────────────────────────────────────────

// The day PEI went live. All period windows start from this date.
// IMPORTANT: Update this to your actual launch date before going public.
const DEPLOYMENT_DATE = "2026-03-01T00:00:00.000Z";

// Minimum submissions for an LGU or province to appear publicly.
// 10 for development/testing. Change to 50 before public launch.
const THRESHOLD = 10;

const HOPE_LEANING    = ["hope", "relief", "determination"];
const DESPAIR_LEANING = ["grief", "anger", "anxiety", "regret", "longing"];
// "calm" is neutral — excluded from HDR calculation entirely

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// ── Period window logic ───────────────────────────────────────────────────────

interface PeriodWindow {
  since: string;       // ISO timestamp — start of window (always deployment date)
  until: string | null; // ISO timestamp — end of window (null = now/open-ended)
  label: string;       // human label for logs
}

function getPeriodWindow(period: string, now: Date): PeriodWindow {
  const deployDate = new Date(DEPLOYMENT_DATE);

  // All periods start from deployment date
  const since = DEPLOYMENT_DATE;

  if (period === "all") {
    // All time: deployment → now (open ended, grows daily)
    return { since, until: null, label: "all time" };
  }

  const days = period === "7d" ? 7 : period === "30d" ? 30 : 90;
  const windowEnd = new Date(deployDate.getTime() + days * 24 * 60 * 60 * 1000);

  // If the window end is in the future, clamp to now
  // (i.e. if we haven't completed the first 30 days yet, 30D = deploy → now)
  const until = windowEnd <= now ? windowEnd.toISOString() : null;

  return {
    since,
    until,
    label: period === "7d" ? "week 1 (days 1–7)"
         : period === "30d" ? "month 1 (days 1–30)"
         : "quarter 1 (days 1–90)",
  };
}

// ── Math helpers ──────────────────────────────────────────────────────────────

function computeEmotionDist(rows: { emotion: string }[]): Record<string, number> {
  if (!rows.length) return {};
  const counts: Record<string, number> = {};
  for (const r of rows) counts[r.emotion] = (counts[r.emotion] || 0) + 1;
  const total = rows.length;
  const dist: Record<string, number> = {};
  for (const [k, v] of Object.entries(counts)) dist[k] = v / total;
  return dist;
}

function computeESI(dist: Record<string, number>): number {
  // Shannon entropy normalized to [0,1]
  // 0 = one emotion dominates completely (turbulent)
  // 1 = all emotions equally distributed (stable/diverse)
  const values = Object.values(dist).filter(v => v > 0);
  if (!values.length) return 0;
  const entropy = -values.reduce((sum, p) => sum + p * Math.log(p), 0);
  return Math.round((entropy / Math.log(9)) * 1000) / 1000; // 9 emotions
}

function computeHDR(dist: Record<string, number>): number {
  // Hope / Despair Ratio
  // > 1.0 = hope-leaning  |  < 1.0 = despair-leaning  |  1.0 = balanced
  // "calm" excluded from both sides — it's neutral
  const hope    = HOPE_LEANING.reduce((s, k) => s + (dist[k] || 0), 0);
  const despair = DESPAIR_LEANING.reduce((s, k) => s + (dist[k] || 0), 0);
  if (despair === 0) return hope > 0 ? 2.0 : 1.0;
  return Math.round((hope / despair) * 1000) / 1000;
}

function computeVelocity(currentESI: number, previousESI: number | null): number {
  // Rate of change in ESI since last aggregation run
  // Positive = stabilizing (more diverse)
  // Negative = narrowing (one emotion dominating)
  if (previousESI === null) return 0;
  return Math.round((currentESI - previousESI) * 1000) / 1000;
}

function dominantEmotion(dist: Record<string, number>): string {
  if (!Object.keys(dist).length) return "hope";
  return Object.entries(dist).sort((a, b) => b[1] - a[1])[0][0];
}

function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

// ── Main ──────────────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const now     = new Date();
  const PERIODS = ["7d", "30d", "90d", "all"];
  const results: Record<string, unknown> = {};

  try {
    for (const period of PERIODS) {
      const window = getPeriodWindow(period, now);

      // ── Step 1: Fetch submissions within this period window ────────────
      let query = admin
        .from("submissions")
        .select("lgu_id, emotion, intensity")
        .gte("submitted_at", window.since);

      if (window.until) {
        query = query.lte("submitted_at", window.until);
      }

      const { data: subs, error: subsErr } = await query;

      if (subsErr) throw new Error(`[${period}] submissions fetch: ${subsErr.message}`);

      if (!subs?.length) {
        results[period] = {
          period,
          label: window.label,
          window: { since: window.since, until: window.until ?? "now" },
          submissions: 0,
          lgu: 0,
          province: 0,
          national: false,
        };
        continue;
      }

      // ── Step 2: Fetch previous LGU ESI for velocity calculation ───────
      const { data: prevLguAggs } = await admin
        .from("lgu_aggregations")
        .select("lgu_id, esi")
        .eq("period", period);

      const prevESIMap: Record<string, number> = {};
      for (const p of prevLguAggs || []) prevESIMap[p.lgu_id] = p.esi;

      // ── Step 3: Group submissions by LGU ──────────────────────────────
      const byLgu: Record<string, { emotion: string; intensity: number }[]> = {};
      for (const s of subs) {
        if (!byLgu[s.lgu_id]) byLgu[s.lgu_id] = [];
        byLgu[s.lgu_id].push({ emotion: s.emotion, intensity: s.intensity });
      }

      // Fetch LGU → province mapping
      const lguIds = Object.keys(byLgu);
      const { data: lguMeta } = await admin
        .from("lgus")
        .select("id, province_id")
        .in("id", lguIds);

      const lguToProvince: Record<string, string> = {};
      for (const l of lguMeta || []) {
        if (l.province_id) lguToProvince[l.id] = l.province_id;
      }

      // ── Step 4: Compute LGU aggregations ──────────────────────────────
      const lguRows = [];
      // province accumulator: weighted sum of emotion counts
      const byProvince: Record<string, { emotionCounts: Record<string, number>; total: number }> = {};

      for (const [lgu_id, rows] of Object.entries(byLgu)) {
        const dist     = computeEmotionDist(rows);
        const esi      = computeESI(dist);
        const hdr      = computeHDR(dist);
        const velocity = computeVelocity(esi, prevESIMap[lgu_id] ?? null);
        const dominant = dominantEmotion(dist);
        const count    = rows.length;

        lguRows.push({
          lgu_id,
          period,
          computed_at:      now.toISOString(),
          submission_count: count,
          meets_threshold:  count >= THRESHOLD,
          emotion_dist:     dist,
          dominant_emotion: dominant,
          esi,
          hdr,
          velocity,
          period_since:     window.since,
          period_until:     window.until ?? now.toISOString(),
        });

        // Accumulate for province rollup
        const province_id = lguToProvince[lgu_id];
        if (province_id) {
          if (!byProvince[province_id]) {
            byProvince[province_id] = { emotionCounts: {}, total: 0 };
          }
          // Use raw counts (not proportions) for accurate province rollup
          for (const r of rows) {
            byProvince[province_id].emotionCounts[r.emotion] =
              (byProvince[province_id].emotionCounts[r.emotion] || 0) + 1;
          }
          byProvince[province_id].total += count;
        }
      }

      // Upsert LGU rows
      if (lguRows.length) {
        const { error: lguErr } = await admin
          .from("lgu_aggregations")
          .upsert(lguRows, { onConflict: "lgu_id,period" });
        if (lguErr) throw new Error(`[${period}] lgu upsert: ${lguErr.message}`);
      }

      // ── Step 5: Compute province aggregations ─────────────────────────
      const provinceRows = [];
      for (const [province_id, data] of Object.entries(byProvince)) {
        if (data.total === 0) continue;
        // Normalize raw counts to proportions
        const normDist: Record<string, number> = {};
        for (const [em, cnt] of Object.entries(data.emotionCounts)) {
          normDist[em] = cnt / data.total;
        }

        provinceRows.push({
          province_id,
          period,
          computed_at:      now.toISOString(),
          submission_count: data.total,
          meets_threshold:  data.total >= THRESHOLD,
          emotion_dist:     normDist,
          dominant_emotion: dominantEmotion(normDist),
          esi:              computeESI(normDist),
          hdr:              computeHDR(normDist),
          velocity:         0, // province velocity added in future version
          period_since:     window.since,
          period_until:     window.until ?? now.toISOString(),
        });
      }

      if (provinceRows.length) {
        const { error: provErr } = await admin
          .from("province_aggregations")
          .upsert(provinceRows, { onConflict: "province_id,period" });
        if (provErr) throw new Error(`[${period}] province upsert: ${provErr.message}`);
      }

      // ── Step 6: Compute national aggregation ──────────────────────────
      // National uses raw submission counts directly (most accurate)
      const nationalDist    = computeEmotionDist(subs);
      const nationalESI     = computeESI(nationalDist);
      const nationalHDR     = computeHDR(nationalDist);
      const nationalDom     = dominantEmotion(nationalDist);

      // Previous national ESI for velocity
      const { data: prevNat } = await admin
        .from("national_aggregations")
        .select("esi")
        .eq("period", period)
        .order("computed_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const { error: natErr } = await admin
        .from("national_aggregations")
        .upsert({
          period,
          week_number:      period !== "all" ? getWeekNumber(now) : 0,
          year:             period !== "all" ? now.getUTCFullYear() : 0,
          computed_at:      now.toISOString(),
          submission_count: subs.length,
          active_lgus:      lguIds.length,
          emotion_dist:     nationalDist,
          dominant_emotion: nationalDom,
          esi:              nationalESI,
          hdr:              nationalHDR,
          velocity:         computeVelocity(nationalESI, prevNat?.esi ?? null),
        }, { onConflict: "period,week_number,year" });

      if (natErr) throw new Error(`[${period}] national upsert: ${natErr.message}`);

      results[period] = {
        period,
        label:       window.label,
        window:      { since: window.since, until: window.until ?? "now" },
        submissions: subs.length,
        lgu:         lguRows.length,
        province:    provinceRows.length,
        national:    true,
      };

      console.log(`[${period}] ${window.label}: ${subs.length} submissions, ${lguRows.length} LGUs, ${provinceRows.length} provinces`);
    }

    return new Response(
      JSON.stringify({ success: true, computed_at: now.toISOString(), results }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err) {
    console.error("Aggregation error:", err);
    return new Response(
      JSON.stringify({ error: "Aggregation failed", detail: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
