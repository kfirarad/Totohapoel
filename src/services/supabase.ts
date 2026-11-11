import { createClient } from '@supabase/supabase-js'

// Group Bet project (shared with the mobile app). The web app is the "טוטו הפועל" group's site.
const supabaseUrl = "https://dbeyeyuewbksealxjtxb.supabase.co"
const supabaseAnonKey = "sb_publishable_0t6vwZwe1AqhSCviXnNwXg_6tl8UrVF"

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

/** The one group this site shows. Every signed-in user is joined to it (open group). */
export const GROUP_ID = "ff754ccf-c5ef-49d3-8361-977e7e0c8381"
export const GROUP_CODE = "LABTLB"
/** Toto type of the rounds the group plays (global columns). */
export const TOTO_TYPE_ID = "30bb0ba9-1ab3-49da-86f1-005979451dcc"
/** PostgREST filter: the group's rounds = its toto type's global columns + its custom columns. */
export const GROUP_COLUMNS = `toto_type_id.eq.${TOTO_TYPE_ID},group_id.eq.${GROUP_ID}`
