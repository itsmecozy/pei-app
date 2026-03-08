// PEI AGGREGATE EMOTIONS — Fixed period logic
// 
// Period definitions (relative to PROJECT DEPLOYMENT DATE, not "now"):
//   7d  = deployment_date → deployment_date + 7 days
//   30d = deployment_date → deployment_date + 30 days
//   90d = deployment_date → deployment_date + 90 days
//   all = deployment_date → now (everything)
//
// This means 7D always shows first week, 30D always shows first month, etc.
// "All Time" always shows everything up to today.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const HOPE_LEANING    = ["hope", "relief", "determination"];
const DESPAIR_LEANING = ["grief", "anger", "anxiety", "regret", "longing"];

// Deployment date — the day the project went live
// Update this to your actual deployment date
const DEPLOYMENT_DATE = "2026-03-01T00:00:00.000Z";

const THRESHOLD = 10; // min submissions to appear (change to 50 for production)

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// ── Period windows ─────────────────────────────────────────────────────────────
// Returns { since, until } for each period
// since = deployment date
// until = deployment + N days  (null = now, i.e. "all time")
function getPeriodWindow(period: string): { since: string; until: string | null } {
  const deploy = new Date(DEPLOYMENT_DATE);
  const now    = new Date();

  const since = DEPLOYMENT_DATE;

  if (period === "all") {
    return { since, until: null }; // from deploy to now
  }

  const days  = period === "7d" ? 7 : period === "30d" ? 30 : 90;
  const until = new Date(deploy.getTime() + days * 24 * 60 * 60 * 1000).toISOString();

  // If we haven't reached the end of the window yet, clamp to now
  const clampedUntil = new Date(until) > now ? null : until;

  return { since, until: clampedUntil };
}

// ── Math helpers ───────────────────────────────────────────────────────────────
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
  const values = Object.values(dist).filter(v => v > 0);
  if (!values.length) return 0;
  const entropy = -values.reduce((sum, p) => sum + p * Math.log(p), 0);
  return Math.round((entropy / Math.log(9)) * 1000) / 1000;
}

function computeHDR(dist: Record<string, number>): number {
  const hope    = HOPE_LEANING.reduce((s, k) => s + (dist[k] || 0), 0);
  const despair = DESPAIR_LEANING.reduce((s, k) => s + (dist[k] || 0), 0);
  if (despair === 0) return hope > 0 ? 2.0 : 1.0;
  return Math.round((hope / despair) * 1000) / 1000;
}

function computeVelocity(currentESI: number, previousESI: number | null): number {
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

// ── Main ───────────────────────────────────────────────────────────────────────
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const now     = new Date();
  const results: Record<string, unknown> = {};
  const PERIODS = ["7d", "30d", "90d", "all"];

  try {
    for (const period of PERIODS) {
      const { since, until } = getPeriodWindow(period);

      // ── 1. Fetch submissions in this period window ───────────────────────
      let subsQuery = admin
        .from("submissions")
        .select("lgu_id, emotion, intensity")
        .gte("submitted_at", since);

      if (until) subsQuery = subsQuery.lte("submitted_at", until);

      const { data: subs, error: subsErr } = await subsQuery;
      if (subsErr) throw new Error(`submissions fetch [${period}]: ${subsErr.message}`);
      if (!subs?.length) {
        results[period] = { lgu: 0, province: 0, national: false, submissions: 0 };
        continue;
      }

      // ── 2. Previous LGU ESI for velocity ────────────────────────────────
      const { data: prevAggs } = await admin
        .from("lgu_aggregations")
        .select("lgu_id, esi")
        .eq("period", period);

      const prevESIMap: Record<string, number> = {};
      for (const p of prevAggs || []) prevESIMap[p.lgu_id] = p.esi;

      // ── 3. Group by LGU ─────────────────────────────────────────────────
      const byLgu: Record<string, { emotion: string; intensity: number }[]> = {};
      for (const s of subs) {
        if (!byLgu[s.lgu_id]) byLgu[s.lgu_id] = [];
        byLgu[s.lgu_id].push({ emotion: s.emotion, intensity: s.intensity });
      }

      // LGU → province mapping
      const lguIds = Object.keys(byLgu);
      const { data: lguMeta } = await admin
        .from("lgus")
        .select("id, province_id")
        .in("id", lguIds);

      const lguProvinceMap: Record<string, string> = {};
      for (const l of lguMeta || []) lguProvinceMap[l.id] = l.province_id;

      // ── 4. LGU aggregations ──────────────────────────────────────────────
      const lguRows = [];
      const byProvince: Record<string, { dist: Record<string, number>; count: number }> = {};

      for (const [lgu_id, rows] of Object.entries(byLgu)) {
        const dist     = computeEmotionDist(rows);
        const esi      = computeESI(dist);
        const hdr      = computeHDR(dist);
        const velocity = computeVelocity(esi, prevESIMap[lgu_id] ?? null);
        const dominant = dominantEmotion(dist);
        const count    = rows.length;

        lguRows.push({
          lgu_id, period,
          computed_at:      now.toISOString(),
          submission_count: count,
          meets_threshold:  count >= THRESHOLD,
          emotion_dist:     dist,
          dominant_emotion: dominant,
          esi, hdr, velocity,
          period_since:     since,
          period_until:     until || now.toISOString(),
        });

        // Accumulate for province rollup
        const province_id = lguProvinceMap[lgu_id];
        if (province_id) {
          if (!byProvince[province_id]) byProvince[province_id] = { dist: {}, count: 0 };
          for (const [em, pct] of Object.entries(dist)) {
            byProvince[province_id].dist[em] =
              (byProvince[province_id].dist[em] || 0) + pct * count;
          }
          byProvince[province_id].count += count;
        }
      }

      await admin.from("lgu_aggregations")
        .upsert(lguRows, { onConflict: "lgu_id,period" });

      // ── 5. Province aggregations ─────────────────────────────────────────
      const provinceRows = [];
      for (const [province_id, data] of Object.entries(byProvince)) {
        const normDist: Record<string, number> = {};
        for (const [em, raw] of Object.entries(data.dist))
          normDist[em] = raw / data.count;

        provinceRows.push({
          province_id, period,
          computed_at:      now.toISOString(),
          submission_count: data.count,
          meets_threshold:  data.count >= THRESHOLD,
          emotion_dist:     normDist,
          dominant_emotion: dominantEmotion(normDist),
          esi:              computeESI(normDist),
          hdr:              computeHDR(normDist),
          velocity:         0,
        });
      }

      if (provinceRows.length) {
        await admin.from("province_aggregations")
          .upsert(provinceRows, { onConflict: "province_id,period" });
      }

      // ── 6. National aggregation ──────────────────────────────────────────
      const nationalDist = computeEmotionDist(subs);
      const nationalESI  = computeESI(nationalDist);
      const nationalHDR  = computeHDR(nationalDist);

      const { data: prevNational } = await admin
        .from("national_aggregations")
        .select("esi")
        .eq("period", period)
        .order("computed_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      await admin.from("national_aggregations")
        .upsert({
          period,
          week_number:      period !== "all" ? getWeekNumber(now) : 0,
          year:             period !== "all" ? now.getUTCFullYear() : 0,
          computed_at:      now.toISOString(),
          submission_count: subs.length,
          active_lgus:      Object.keys(byLgu).length,
          emotion_dist:     nationalDist,
          dominant_emotion: dominantEmotion(nationalDist),
          esi:              nationalESI,
          hdr:              nationalHDR,
          velocity:         computeVelocity(nationalESI, prevNational?.esi ?? null),
        }, { onConflict: "period,week_number,year" });

      results[period] = {
        submissions: subs.length,
        lgu:         lguRows.length,
        province:    provinceRows.length,
        national:    true,
        window:      { since, until: until || "now" },
      };
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
