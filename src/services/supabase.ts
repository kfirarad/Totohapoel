import { createClient } from '@supabase/supabase-js'

// Get the URL and anon key from the VITE environment variables
const supabaseUrl = "https://tabpznqluszwzreclwrb.supabase.co"
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRhYnB6bnFsdXN6d3pyZWNsd3JiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzgyNDE5NDAsImV4cCI6MjA1MzgxNzk0MH0.eDOmOC36cJB46uowJInIFYv9kUmXiR6bLMLhuZO9VQ8"

export const supabase = createClient(supabaseUrl, supabaseAnonKey) 