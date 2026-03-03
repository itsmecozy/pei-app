import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://zocupidthlhxwroyxcuv.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpvY3VwaWR0aGxoeHdyb3l4Y3V2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI0OTk5ODAsImV4cCI6MjA4ODA3NTk4MH0.LpJHyutzrEj3k4Hu_Fr14PuRQedM_04VYJXoxiIG0ts'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

export async function submitEmotion({ lgu_id, emotion, intensity, text }) {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/submit-emotion`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
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
