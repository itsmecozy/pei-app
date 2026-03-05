// PEI SUBMIT EMOTION - no rate limiting (test mode)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const VALID_EMOTIONS = [
  "longing", "hope", "anger", "anxiety",
  "grief", "relief", "determination", "regret"
];

const corsHeaders = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-user-token",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { lgu_id, emotion, intensity, text } = body;

    // Basic validation
    if (!lgu_id || !emotion || !VALID_EMOTIONS.includes(emotion.toLowerCase())) {
      return new Response(JSON.stringify({ error: "Invalid input" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (!intensity || intensity < 1 || intensity > 5) {
      return new Response(JSON.stringify({ error: "Intensity must be 1-5" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verify LGU
    const { data: lguData, error: lguErr } = await admin
      .from("lgus").select("id, name")
      .eq("id", lgu_id).eq("active", true).single();

    if (lguErr || !lguData) {
      return new Response(JSON.stringify({ error: "Invalid LGU" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Insert
    const now = new Date();
    const { error: insertErr } = await admin.from("submissions").insert({
      lgu_id,
      emotion:     emotion.toLowerCase(),
      intensity,
      week_number: getWeekNumber(now),
      year:        now.getUTCFullYear(),
      hour_bucket: now.getUTCHours(),
      text_signal: null,
    });

    if (insertErr) {
      console.error("Insert error:", JSON.stringify(insertErr));
      return new Response(JSON.stringify({ error: "Failed to record submission.", detail: insertErr.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(
      JSON.stringify({ acknowledged: true, lgu: lguData.name }),
      { status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err) {
    console.error("Unexpected error:", err);
    return new Response(JSON.stringify({ error: "Unexpected error", detail: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
