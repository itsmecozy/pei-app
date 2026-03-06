// PEI AGGREGATE EMOTIONS
// Computes emotion_dist, ESI, HDR, velocity for all active LGUs
// and rolls up to province and national level.
// Run on a schedule via pg_cron or trigger manually.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const HOPE_LEANING    = ["hope", "relief", "determination"];
const DESPAIR_LEANING = ["grief", "anger", "anxiety", "regret", "longing"];
// "calm" is neutral — excluded from HDR numerator and denominator

const PERIODS: Record<string, number | null> = { "7d": 7, "30d": 30, "90d": 90, "all": null };
const THRESHOLD = 10; // lowered for dev/testing (change back to 50 for production) // min submissions for LGU to appear on map

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

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
  // Shannon entropy normalized: higher = more diverse = more stable
  const values = Object.values(dist).filter(v => v > 0);
  if (!values.length) return 0;
  const entropy = -values.reduce((sum, p) => sum + p * Math.log(p), 0);
  const maxEntropy = Math.log(9); // 9 emotions now
  return Math.round((entropy / maxEntropy) * 1000) / 1000;
}

function computeHDR(dist: Record<string, number>): number {
  // Only hope-leaning vs despair-leaning; calm is excluded
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

function meetsThreshold(count: number): boolean {
  return count >= THRESHOLD;
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

  const now = new Date();
  const results: Record<string, unknown> = {};

  try {
    for (const [period, days] of Object.entries(PERIODS)) {
      const since = days ? new Date(now.getTime() - days * 24 * 60 * 60 * 1000).toISOString() : null;

      // ── 1. Fetch all submissions in window ──────────────────────────────
      let subsQuery = admin
        .from("submissions")
        .select("lgu_id, emotion, intensity");
      if (since) subsQuery = subsQuery.gte("submitted_at", since);
      const { data: subs, error: subsErr } = await subsQuery;

      if (subsErr) throw new Error(`submissions fetch: ${subsErr.message}`);
      if (!subs?.length) { results[period] = { lgu: 0, province: 0, national: false }; continue; }

      // ── 2. Fetch previous LGU aggregations for velocity ─────────────────
      const { data: prevAggs } = await admin
        .from("lgu_aggregations")
        .select("lgu_id, esi, period")
        .eq("period", period);

      const prevESIMap: Record<string, number> = {};
      for (const p of prevAggs || []) prevESIMap[p.lgu_id] = p.esi;

      // ── 3. Group submissions by LGU ─────────────────────────────────────
      const byLgu: Record<string, { emotion: string; intensity: number }[]> = {};
      for (const s of subs) {
        if (!byLgu[s.lgu_id]) byLgu[s.lgu_id] = [];
        byLgu[s.lgu_id].push({ emotion: s.emotion, intensity: s.intensity });
      }

      // ── 4. Compute and upsert LGU aggregations ──────────────────────────
      const lguRows = [];
      const lguDistByProvince: Record<string, { dist: Record<string, number>; count: number; lgu_ids: string[] }> = {};

      // Fetch LGU → province mapping
      const lguIds = Object.keys(byLgu);
      const { data: lguMeta } = await admin
        .from("lgus")
        .select("id, province_id")
        .in("id", lguIds);

      const lguProvinceMap: Record<string, string> = {};
      for (const l of lguMeta || []) lguProvinceMap[l.id] = l.province_id;

      for (const [lgu_id, rows] of Object.entries(byLgu)) {
        const dist     = computeEmotionDist(rows);
        const esi      = computeESI(dist);
        const hdr      = computeHDR(dist);
        const velocity = computeVelocity(esi, prevESIMap[lgu_id] ?? null);
        const dominant = dominantEmotion(dist);
        const count    = rows.length;
        const meets    = meetsThreshold(count);

        lguRows.push({
          lgu_id,
          period,
          computed_at:       now.toISOString(),
          submission_count:  count,
          meets_threshold:   meets,
          emotion_dist:      dist,
          dominant_emotion:  dominant,
          esi,
          hdr,
          velocity,
        });

        // Accumulate for province rollup
        const province_id = lguProvinceMap[lgu_id];
        if (province_id) {
          if (!lguDistByProvince[province_id]) {
            lguDistByProvince[province_id] = { dist: {}, count: 0, lgu_ids: [] };
          }
          for (const [em, pct] of Object.entries(dist)) {
            lguDistByProvince[province_id].dist[em] =
              (lguDistByProvince[province_id].dist[em] || 0) + pct * count;
          }
          lguDistByProvince[province_id].count += count;
          lguDistByProvince[province_id].lgu_ids.push(lgu_id);
        }
      }

      // Upsert LGU rows
      const { error: lguUpsertErr } = await admin
        .from("lgu_aggregations")
        .upsert(lguRows, { onConflict: "lgu_id,period" });

      if (lguUpsertErr) throw new Error(`lgu upsert: ${lguUpsertErr.message}`);

      // ── 5. Province aggregations ─────────────────────────────────────────
      const provinceRows = [];
      for (const [province_id, data] of Object.entries(lguDistByProvince)) {
        // Normalize dist back to proportions
        const normDist: Record<string, number> = {};
        for (const [em, raw] of Object.entries(data.dist)) {
          normDist[em] = raw / data.count;
        }
        const esi     = computeESI(normDist);
        const hdr     = computeHDR(normDist);
        const dominant = dominantEmotion(normDist);

        provinceRows.push({
          province_id,
          period,
          computed_at:      now.toISOString(),
          submission_count: data.count,
          meets_threshold:  meetsThreshold(data.count),
          emotion_dist:     normDist,
          dominant_emotion: dominant,
          esi,
          hdr,
          velocity: 0, // province velocity not tracked yet
        });
      }

      if (provinceRows.length) {
        const { error: provErr } = await admin
          .from("province_aggregations")
          .upsert(provinceRows, { onConflict: "province_id,period" });
        if (provErr) throw new Error(`province upsert: ${provErr.message}`);
      }

      // ── 6. National aggregation ──────────────────────────────────────────
      const nationalDist = computeEmotionDist(subs);
      const nationalESI  = computeESI(nationalDist);
      const nationalHDR  = computeHDR(nationalDist);
      const nationalDom  = dominantEmotion(nationalDist);

      // Get previous national ESI for velocity
      const { data: prevNational } = await admin
        .from("national_aggregations")
        .select("esi")
        .eq("period", period)
        .order("computed_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const nationalVelocity = computeVelocity(nationalESI, prevNational?.esi ?? null);

      const weekNumber = getWeekNumber(now);

      const { error: natErr } = await admin
        .from("national_aggregations")
        .upsert({
          period,
          week_number:      days ? weekNumber : 0,
          year:             days ? now.getUTCFullYear() : 0,
          computed_at:      now.toISOString(),
          submission_count: subs.length,
          active_lgus:      Object.keys(byLgu).length,
          emotion_dist:     nationalDist,
          dominant_emotion: nationalDom,
          esi:              nationalESI,
          hdr:              nationalHDR,
          velocity:         nationalVelocity,
        }, { onConflict: "period,week_number,year" });

      if (natErr) throw new Error(`national upsert: ${natErr.message}`);

      results[period] = {
        lgu:      lguRows.length,
        province: provinceRows.length,
        national: true,
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

function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}
