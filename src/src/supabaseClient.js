import { createClient } from '@supabase/supabase-js'

// פרטי Supabase - תעדכן אלה מה-Supabase dashboard שלך
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co'
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder_key'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
