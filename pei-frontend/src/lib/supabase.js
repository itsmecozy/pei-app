import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://zocupidthlhxwroyxcuv.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpvY3VwaWR0aGxoeHdyb3l4Y3V2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI0OTk5ODAsImV4cCI6MjA4ODA3NTk4MH0.LpJHyutzrEj3k4Hu_Fr14PuRQedM_04VYJXoxiIG0ts'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// ─── ANONYMOUS INDEX ──────────────────────────────────────────────────────────

export async function submitEmotion({ lgu_id, emotion, intensity, text }) {
  // Always use anon key for gateway (prevents 401)
  // Try to get user session for tier detection — but never let it block the submission
  let userToken = null
  try {
    const { data } = await supabase.auth.getSession()
    userToken = data?.session?.access_token || null
  } catch { /* ignore — submit as anonymous */ }

  const response = await fetch(`${SUPABASE_URL}/functions/v1/submit-emotion`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      ...(userToken && { 'x-user-token': userToken }),
    },
    body: JSON.stringify({ lgu_id, emotion, intensity, text }),
  })
  return response.json()
}

export async function searchLGUs(term) {
  const { data, error } = await supabase.rpc('search_lgus', { search_term: term })
  if (error) throw error
  return data || []
}

export async function getNational(period = '7d') {
  const { data, error } = await supabase
    .from('national_aggregations')
    .select('*')
    .eq('period', period)
    .order('computed_at', { ascending: false })
    .limit(1)
    .single()
  if (error) throw error
  return data
}

export async function getLGUAggregations(period = '7d') {
  const { data, error } = await supabase
    .from('lgu_aggregations')
    .select(`
      *,
      lgus (
        id, name, lgu_type, lat, lng,
        provinces ( name ),
        regions ( name )
      )
    `)
    .eq('period', period)
    .eq('meets_threshold', true)
    .order('submission_count', { ascending: false })
  if (error) throw error
  return data || []
}

export async function getLGUData(lgu_id, period = '7d') {
  const { data, error } = await supabase
    .from('lgu_aggregations')
    .select(`
      *,
      lgus (
        id, name, lgu_type, lat, lng,
        provinces ( name ),
        regions ( name )
      )
    `)
    .eq('lgu_id', lgu_id)
    .eq('period', period)
    .single()
  if (error) throw error
  return data
}

// ─── AUTH ─────────────────────────────────────────────────────────────────────

export async function signUpWithEmail(email, password) {
  const { data, error } = await supabase.auth.signUp({ email, password })
  if (error) throw error
  return data
}

export async function signInWithEmail(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
  return data
}

export async function signInWithGoogle() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.origin,
    },
  })
  if (error) throw error
  return data
}

export async function signOut() {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

export async function getSession() {
  const { data: { session } } = await supabase.auth.getSession()
  return session
}

// ─── USER PROFILE ─────────────────────────────────────────────────────────────

export async function getUserProfile(user_id) {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('*, lgus:home_lgu_id(id, name)')
    .eq('id', user_id)
    .single()
  if (error) return null
  // Flatten home_lgu_name for convenience
  if (data?.lgus) {
    data.home_lgu_name = data.lgus.name
    delete data.lgus
  }
  return data
}

export async function updateUserProfile(user_id, updates) {
  const { data, error } = await supabase
    .from('user_profiles')
    .update(updates)
    .eq('id', user_id)
    .select('*, lgus:home_lgu_id(id, name)')
    .single()
  if (error) throw error
  if (data?.lgus) {
    data.home_lgu_name = data.lgus.name
    delete data.lgus
  }
  return data
}

export async function createUserProfile(user_id) {
  const { data, error } = await supabase
    .from('user_profiles')
    .insert({ id: user_id, trial_started_at: new Date().toISOString() })
    .select()
    .single()
  if (error) throw error
  return data
}

export function isTrialActive(profile) {
  if (!profile) return false
  // plan_activated_at is set when user pays — present means full access
  if (profile.plan_activated_at) return true
  if (!profile.trial_started_at) return false
  const started = new Date(profile.trial_started_at)
  const now = new Date()
  const days = (now - started) / (1000 * 60 * 60 * 24)
  return days <= 7
}

// Derive display tier from profile for UI (paid vs trial)
export function getPlanTier(profile) {
  if (!profile) return 'trial'
  return profile.plan_activated_at ? 'paid' : 'trial'
}

// ─── PERSONAL SUBMISSIONS ─────────────────────────────────────────────────────

export async function savePersonalSubmission({ user_id, emotion, intensity, lgu_id, note }) {
  const { data, error } = await supabase
    .from('personal_submissions')
    .insert({ user_id, emotion, intensity, lgu_id: lgu_id || null, note: note || null })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function getPersonalSubmissions(user_id, limit = 50) {
  const { data, error } = await supabase
    .from('personal_submissions')
    .select('*')
    .eq('user_id', user_id)
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return data || []
}

export async function getPersonalStats(user_id) {
  const { data, error } = await supabase
    .from('personal_submissions')
    .select('emotion, intensity, created_at')
    .eq('user_id', user_id)
    .order('created_at', { ascending: false })
  if (error) throw error

  const submissions = data || []
  if (submissions.length === 0) return null

  // Emotion distribution
  const counts = {}
  let total = 0
  submissions.forEach(s => {
    counts[s.emotion] = (counts[s.emotion] || 0) + s.intensity
    total += s.intensity
  })
  const dist = Object.fromEntries(
    Object.entries(counts).map(([k, v]) => [k, v / total])
  )
  const dominant = Object.entries(dist).sort((a, b) => b[1] - a[1])[0]?.[0]

  // ESI — Shannon entropy
  const esi = Math.min(
    -Object.values(dist).reduce((sum, p) => sum + (p > 0 ? p * Math.log(p) : 0), 0) / Math.log(8),
    1
  )

  // HDR
  const hope = ['hope', 'relief', 'determination']
  const despair = ['grief', 'anger', 'anxiety', 'regret', 'longing']
  const hopeSum = hope.reduce((s, e) => s + (dist[e] || 0), 0)
  const despairSum = despair.reduce((s, e) => s + (dist[e] || 0), 0)
  const hdr = despairSum > 0 ? Math.round((hopeSum / despairSum) * 100) / 100 : hopeSum > 0 ? 2.0 : 1.0

  return {
    dist,
    dominant,
    esi: Math.round(esi * 100) / 100,
    hdr,
    count: submissions.length,
  }
}

// ── Streak tracking ────────────────────────────────────────────────────────────
export async function updateStreak(userId) {
  // Get all submission dates for this user
  const { data, error } = await supabase
    .from('personal_submissions')
    .select('created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error || !data?.length) return

  // Get unique dates
  const dates = [...new Set(
    data.map(s => new Date(s.created_at).toISOString().slice(0, 10))
  )].sort().reverse()

  // Calculate current streak
  let streak = 0
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  let check = new Date(today)

  for (const d of dates) {
    const checkStr = check.toISOString().slice(0, 10)
    if (d === checkStr) {
      streak++
      check.setDate(check.getDate() - 1)
    } else if (d < checkStr) {
      break
    }
  }

  // Get current profile to compare longest streak
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('longest_streak')
    .eq('id', userId)
    .single()

  const longest = Math.max(streak, profile?.longest_streak || 0)
  const today_str = new Date().toISOString().slice(0, 10)

  await supabase
    .from('user_profiles')
    .update({
      current_streak: streak,
      longest_streak: longest,
      last_submission_date: today_str,
    })
    .eq('id', userId)
}
