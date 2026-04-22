import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://vazxxadvngrxbmjzgmax.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_Ryp7wQx9cAjMGIaPHYNmLA_JcQWyq-J';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
