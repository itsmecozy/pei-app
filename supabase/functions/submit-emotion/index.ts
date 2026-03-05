// ─── PEI SUBMIT EMOTION EDGE FUNCTION ────────────────────────────────────────
// Handles emotion submissions with tiered rate limiting:
// - Anonymous:        1/day (IP+device hash)
// - Signed-in trial: 2/day
// - Signed-in paid:  3/day (seasonal or lifetime)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const VALID_EMOTIONS = [
  "longing", "hope", "anger", "anxiety",
  "grief", "relief", "determination", "regret"
];
const LIMITS = {
  anonymous: 1,
  trial:     2,
  paid:      3,
};
const MAX_TEXT_LENGTH = 150;
const MIN_THRESHOLD   = 50;

// ─── CORS HEADERS ─────────────────────────────────────────────────────────────
const corsHeaders = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-user-token",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// ─── HELPERS ──────────────────────────────────────────────────────────────────
function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

async function hashWithSalt(value: string, salt: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(value + salt);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

function getDailySalt(): string {
  const today = new Date().toISOString().split("T")[0];
  return `pei-salt-${today}`;
}

// ─── MAIN HANDLER ─────────────────────────────────────────────────────────────
Deno.serve(async (req: Request) => {

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    // ─── PARSE BODY ───────────────────────────────────────────────────────────
    let body: { lgu_id: string; emotion: string; intensity: number; text?: string; };
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: "Invalid JSON body" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { lgu_id, emotion, intensity, text } = body;

    // ─── INPUT VALIDATION ─────────────────────────────────────────────────────
    if (!lgu_id || typeof lgu_id !== "string") {
      return new Response(
        JSON.stringify({ error: "lgu_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    if (!emotion || !VALID_EMOTIONS.includes(emotion.toLowerCase())) {
      return new Response(
        JSON.stringify({ error: `emotion must be one of: ${VALID_EMOTIONS.join(", ")}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    if (!intensity || intensity < 1 || intensity > 5 || !Number.isInteger(intensity)) {
      return new Response(
        JSON.stringify({ error: "intensity must be an integer between 1 and 5" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    if (text && text.length > MAX_TEXT_LENGTH) {
      return new Response(
        JSON.stringify({ error: `text must be ${MAX_TEXT_LENGTH} characters or fewer` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ─── SETUP CLIENTS ────────────────────────────────────────────────────────
    const ip        = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
    const userAgent = req.headers.get("user-agent") || "unknown";
    const salt      = getDailySalt();

    const ipHash     = await hashWithSalt(ip, salt);
    const deviceHash = await hashWithSalt(userAgent, salt);
    const hashKey    = await hashWithSalt(ipHash + deviceHash, salt);
    const today      = new Date().toISOString().split("T")[0];

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // ─── DETECT USER TIER ─────────────────────────────────────────────────────
    // Check for Authorization header — if present, user is signed in
    let userTier: "anonymous" | "trial" | "paid" = "anonymous";
    let userId: string | null = null;

    // x-user-token carries the user JWT separately from the gateway anon key
    const userToken = req.headers.get("x-user-token");
    if (userToken) {
      const token = userToken;
      try {
        const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
        if (!authError && user) {
          userId = user.id;
          // Get user plan
          const { data: profileData } = await supabaseAdmin
            .from("user_profiles")
            .select("plan")
            .eq("id", user.id)
            .single();

          const plan = profileData?.plan || "trial";
          userTier = (plan === "seasonal" || plan === "lifetime") ? "paid" : "trial";
        }
      } catch {
        // Invalid token — treat as anonymous
        userTier = "anonymous";
      }
    }

    const maxAllowed = LIMITS[userTier];

    // ─── RATE LIMIT CHECK ─────────────────────────────────────────────────────
    // For signed-in users, use user_id as the rate key (not device hash)
    // This means: same user on different devices still counts together
    // But different users on same device are counted separately — fair!
    const rateKey = userId
      ? await hashWithSalt(userId, salt)
      : hashKey;

    const { data: rateData, error: rateError } = await supabaseAdmin
      .from("rate_limits")
      .select("count")
      .eq("hash_key", rateKey)
      .eq("date_bucket", today)
      .single();

    if (rateError && rateError.code !== "PGRST116") {
      console.error("Rate limit check error:", rateError);
      return new Response(
        JSON.stringify({ error: "Service error. Please try again." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const currentCount = rateData?.count || 0;

    if (currentCount >= maxAllowed) {
      const messages = {
        anonymous: "You've already submitted today. Sign in for more daily submissions.",
        trial:     "You've submitted twice today. Come back tomorrow — or upgrade for 3/day.",
        paid:      "You've submitted 3 times today. Come back tomorrow. Your streak is safe.",
      };
      return new Response(
        JSON.stringify({
          error: messages[userTier],
          code:  "RATE_LIMITED",
          tier:  userTier,
          limit: maxAllowed,
        }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ─── VERIFY LGU EXISTS ────────────────────────────────────────────────────
    const { data: lguData, error: lguError } = await supabaseAdmin
      .from("lgus")
      .select("id, name, region_id")
      .eq("id", lgu_id)
      .eq("active", true)
      .single();

    if (lguError || !lguData) {
      return new Response(
        JSON.stringify({ error: "Invalid or inactive LGU" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ─── PROCESS TEXT (if provided) ───────────────────────────────────────────
    // Raw text is NEVER stored. Only AI-extracted signal metadata is kept.
    let text_signal = null;
    if (text && text.trim().length > 0) {
      const lowerText = text.toLowerCase();
      const positiveWords = ["hope", "happy", "grateful", "love", "excited", "proud", "blessed", "joy", "relief", "peace"];
      const negativeWords = ["sad", "angry", "tired", "lost", "scared", "afraid", "alone", "hurt", "pain", "worried", "anxious"];
      const posCount = positiveWords.filter(w => lowerText.includes(w)).length;
      const negCount = negativeWords.filter(w => lowerText.includes(w)).length;
      text_signal = {
        sentiment:   posCount > negCount ? "positive" : negCount > posCount ? "negative" : "neutral",
        char_count:  text.length,
        has_content: true,
      };
    }

    // ─── INSERT SUBMISSION ────────────────────────────────────────────────────
    const now         = new Date();
    const weekNumber  = getWeekNumber(now);
    const year        = now.getUTCFullYear();
    const hour_bucket = now.getUTCHours();

    const { error: insertError } = await supabaseAdmin
      .from("submissions")
      .insert({
        lgu_id,
        emotion:      emotion.toLowerCase(),
        intensity,
        week_number:  weekNumber,
        year,
        hour_bucket,
        text_signal,
      });

    if (insertError) {
      console.error("Insert error:", insertError);
      return new Response(
        JSON.stringify({ error: "Failed to record submission." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ─── UPDATE RATE LIMIT (upsert) ──────────────────────────────────────────
    await supabaseAdmin.from("rate_limits").upsert({
      hash_key:    rateKey,
      date_bucket: today,
      count:       currentCount + 1,
    }, { onConflict: "hash_key,date_bucket" });

    // ─── UPDATE LGU SUBMISSION COUNT ──────────────────────────────────────────
    const { data: lguCount } = await supabaseAdmin
      .from("submissions")
      .select("id", { count: "exact" })
      .eq("lgu_id", lgu_id);

    const submissionCount     = lguCount?.length || 0;
    const justCrossedThreshold = submissionCount === MIN_THRESHOLD;

    // ─── SUCCESS RESPONSE ─────────────────────────────────────────────────────
    return new Response(
      JSON.stringify({
        acknowledged:          true,
        lgu:                   lguData.name,
        week:                  weekNumber,
        year,
        tier:                  userTier,
        submissions_remaining: maxAllowed - (currentCount + 1),
        ...(justCrossedThreshold && {
          milestone: `${lguData.name} just crossed the visibility threshold!`
        })
      }),
      {
        status:  201,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );

  } catch (err) {
    console.error("Unexpected error:", err);
    return new Response(
      JSON.stringify({ error: "An unexpected error occurred." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
