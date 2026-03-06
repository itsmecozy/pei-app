// PEI SUBMIT EMOTION - no rate limiting (test mode)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const VALID_EMOTIONS = [
  "longing", "hope", "anger", "anxiety",
  "grief", "relief", "determination", "regret", "calm"
];

const LIMITS = { anonymous: 1, trial: 2, paid: 3 };

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-user-token",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

async function hashWithSalt(value: string, salt: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(value + salt);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2,"0")).join("");
}

function getDailySalt(): string {
  return `pei-salt-${new Date().toISOString().split("T")[0]}`;
}

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

    // ── Detect user tier ────────────────────────────────────────────────────
    let userTier: "anonymous" | "trial" | "paid" = "anonymous";
    let userId: string | null = null;

    const userToken = req.headers.get("x-user-token");
    if (userToken) {
      try {
        const { data: { user }, error } = await admin.auth.getUser(userToken);
        if (!error && user) {
          userId = user.id;
          const { data: prof } = await admin
            .from("user_profiles").select("plan_activated_at").eq("id", user.id).single();
          userTier = prof?.plan_activated_at ? "paid" : "trial";
        }
      } catch { /* treat as anonymous */ }
    }

    const maxAllowed = LIMITS[userTier];
    const salt = getDailySalt();
    const today = new Date().toISOString().split("T")[0];
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
    const ua = req.headers.get("user-agent") || "unknown";

    const rateKey = userId
      ? await hashWithSalt(userId, salt)
      : await hashWithSalt(await hashWithSalt(ip, salt) + await hashWithSalt(ua, salt), salt);

    // ── Rate limit check ────────────────────────────────────────────────────
    const { data: rateData, error: rateErr } = await admin
      .from("rate_limits").select("count")
      .eq("hash_key", rateKey).eq("date_bucket", today).maybeSingle();

    if (rateErr) {
      console.error("Rate limit error:", rateErr);
      return new Response(JSON.stringify({ error: "Service error. Please try again." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const currentCount = rateData?.count || 0;
    if (currentCount >= maxAllowed) {
      const messages = {
        anonymous: "You've already submitted today. Sign in for more daily submissions.",
        trial:     "You've submitted twice today. Come back tomorrow — or upgrade for 3/day.",
        paid:      "You've submitted 3 times today. Come back tomorrow. Your streak is safe.",
      };
      return new Response(
        JSON.stringify({ error: messages[userTier], code: "RATE_LIMITED" }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

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
      emotion: emotion.toLowerCase(),
      intensity,
      week_number: getWeekNumber(now),
      year: now.getUTCFullYear(),
      text_signal: null,
    });

    if (insertErr) {
      console.error("Insert error:", JSON.stringify(insertErr));
      return new Response(JSON.stringify({ error: "Failed to record submission.", detail: insertErr.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ── Update rate limit ───────────────────────────────────────────────────
    if (!rateData) {
      await admin.from("rate_limits").insert({ hash_key: rateKey, date_bucket: today, count: 1 });
    } else {
      await admin.from("rate_limits")
        .update({ count: currentCount + 1 })
        .eq("hash_key", rateKey).eq("date_bucket", today);
    }

    return new Response(
      JSON.stringify({
        acknowledged: true,
        lgu: lguData.name,
        tier: userTier,
        submissions_remaining: maxAllowed - (currentCount + 1),
      }),
      { status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err) {
    console.error("Unexpected error:", err);
    return new Response(JSON.stringify({ error: "Unexpected error", detail: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
